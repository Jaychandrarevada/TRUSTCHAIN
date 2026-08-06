/**
 * Integration test — the full certificate lifecycle across all three contracts,
 * exactly as the platform pipeline drives it (TDD §2.8/§13):
 *
 *   register issuer → anchor issuance batch → verify certificates →
 *   revoke (status root v+1) → verify shows revoked list → key rotation →
 *   emergency: suspend issuer (issuance blocked, revocation still allowed) →
 *   upgrade safety (UUPS) preserves every anchor.
 */
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { keccak256, toUtf8Bytes } from "ethers";
import { deployTrustChain, DID_HASH, KEY_HASH_1, KEY_HASH_2, META_URI, batchRef, LIST_ID } from "../helpers/fixtures";
import { buildBatch } from "../../utils/merkle";

const AnchorType = { Issuance: 0, StatusList: 1, AuditLog: 2 } as const;

describe("Integration: certificate lifecycle", () => {
  it("runs the golden path end-to-end", async () => {
    const fx = await loadFixture(deployTrustChain);
    const { issuerRegistry, certificateAnchor, revocationRegistry, registrar, anchorer } = fx;
    const issuerId = 77n;

    // 1) KYB approval → on-chain registration (UC-01 step 5).
    await issuerRegistry.connect(registrar).registerIssuer(issuerId, DID_HASH, KEY_HASH_1, META_URI);

    // 2) Convocation batch: 200 certificates → one Merkle root (UC-02).
    const certs = Array.from({ length: 200 }, (_, i) =>
      JSON.stringify({ certUid: `TC-2026-${1000 + i}`, program: "B.Tech", cgpa: 7 + (i % 30) / 10 }),
    );
    const batch = buildBatch(certs);
    await certificateAnchor
      .connect(anchorer)
      .anchorRoot(batch.tree.root, issuerId, batchRef(2026), AnchorType.Issuance, "ipfs://bafy/2026");

    // 3) Any certificate verifies (UC-04) — spot-check five.
    for (const i of [0, 42, 99, 150, 199]) {
      const [valid] = await certificateAnchor.verifyCertificate(
        batch.salts[i],
        batch.contentHashes[i],
        batch.proofs[i],
        batch.tree.root,
      );
      expect(valid, `cert ${i}`).to.equal(true);
    }

    // 4) Revocation: platform flips bit #42 in the bitstring, publishes v1 (UC-05).
    const statusRootV1 = keccak256(toUtf8Bytes("bitstring-with-42-revoked"));
    await revocationRegistry
      .connect(anchorer)
      .updateStatusRoot(issuerId, LIST_ID, statusRootV1, 1, "https://api.trustchain.io/v1/sl/77");
    expect(await revocationRegistry.getStatusRoot(issuerId, LIST_ID)).to.equal(statusRootV1);
    // (The verdict engine combines: anchored ✓ + bit set → REVOKED. The Merkle
    // proof for cert 42 still validates — existence and status are separate
    // questions by design, TDD §8.4.)

    // 5) Scheduled key rotation with overlap (UC-12 main flow).
    const overlapEnd = (await time.latest()) + 7 * 24 * 3600;
    await issuerRegistry.connect(registrar).rotateKey(issuerId, KEY_HASH_2, overlapEnd);
    expect(await issuerRegistry.isKeyValidAt(issuerId, KEY_HASH_1, overlapEnd - 1)).to.equal(true);
    expect(await issuerRegistry.isKeyValidAt(issuerId, KEY_HASH_2, overlapEnd + 1)).to.equal(true);

    // 6) Incident: issuer suspended → new issuance blocked, revocation allowed.
    await issuerRegistry.connect(registrar).setIssuerStatus(issuerId, 2 /* Suspended */);
    await expect(
      certificateAnchor
        .connect(anchorer)
        .anchorRoot(keccak256(toUtf8Bytes("post-suspend")), issuerId, batchRef(3), 0, ""),
    ).to.be.revertedWithCustomError(certificateAnchor, "IssuerNotEligible");
    await revocationRegistry
      .connect(anchorer)
      .updateStatusRoot(issuerId, LIST_ID, keccak256(toUtf8Bytes("v2")), 2, "");

    // 7) Existing certificates still verify while suspended (verification is
    //    never blocked; the verdict engine adds the SUSPENDED ISSUER notice).
    const [stillValid] = await certificateAnchor.verifyCertificate(
      batch.salts[0],
      batch.contentHashes[0],
      batch.proofs[0],
      batch.tree.root,
    );
    expect(stillValid).to.equal(true);
  });

  it("UUPS upgrade preserves anchors, roles, and issuer state (invariant A2)", async () => {
    const fx = await loadFixture(deployTrustChain);
    const { issuerRegistry, certificateAnchor, registrar, anchorer, admin, outsider } = fx;
    const issuerId = 5n;

    await issuerRegistry.connect(registrar).registerIssuer(issuerId, DID_HASH, KEY_HASH_1, META_URI);
    const root = keccak256(toUtf8Bytes("pre-upgrade-root"));
    await certificateAnchor.connect(anchorer).anchorRoot(root, issuerId, batchRef(1), 0, "");

    // Upgrade IssuerRegistry to the v2 mock (admin holds UPGRADER_ROLE).
    const V2 = await ethers.getContractFactory("IssuerRegistryV2Mock", admin);
    const upgraded = await upgrades.upgradeProxy(await issuerRegistry.getAddress(), V2);

    // New code is live…
    expect(await (upgraded as any).version()).to.equal("2.0.0-mock");
    // …and ALL pre-upgrade state survives.
    expect(await upgraded.isActiveIssuer(issuerId)).to.equal(true);
    expect((await upgraded.getKeyHistory(issuerId)).length).to.equal(1);
    expect(await certificateAnchor.isAnchored(root)).to.equal(true);

    // Upgrade authorization is role-gated: outsider cannot upgrade.
    const V2Outsider = await ethers.getContractFactory("IssuerRegistryV2Mock", outsider);
    await expect(
      upgrades.upgradeProxy(await issuerRegistry.getAddress(), V2Outsider),
    ).to.be.reverted; // AccessControlUnauthorizedAccount via _authorizeUpgrade
  });
});
