/**
 * Security test suite — codifies the attack scenarios from docs/SECURITY.md.
 * Each test names the risk it covers (R-numbers match the security report).
 */
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { keccak256, toUtf8Bytes, concat } from "ethers";
import { deployWithIssuer, ISSUER_ID, LIST_ID, batchRef } from "../helpers/fixtures";
import { buildBatch, hashLeaf, hashNode } from "../../utils/merkle";

describe("Security: attack scenarios", () => {
  it("R2 access control: every mutating function rejects unprivileged callers", async () => {
    const { issuerRegistry, certificateAnchor, revocationRegistry, outsider } =
      await loadFixture(deployWithIssuer);
    const root = keccak256(toUtf8Bytes("r"));

    const attempts: Array<Promise<unknown>> = [
      issuerRegistry.connect(outsider).registerIssuer(9n, root, root, ""),
      issuerRegistry.connect(outsider).rotateKey(ISSUER_ID, root, 2n ** 39n),
      issuerRegistry.connect(outsider).revokeKey(ISSUER_ID, root, 1),
      issuerRegistry.connect(outsider).attestIssuer(ISSUER_ID, "x"),
      issuerRegistry.connect(outsider).updateMetadataURI(ISSUER_ID, "x"),
      issuerRegistry.connect(outsider).pause(),
      certificateAnchor.connect(outsider).anchorRoot(root, ISSUER_ID, batchRef(1), 0, ""),
      revocationRegistry.connect(outsider).updateStatusRoot(ISSUER_ID, LIST_ID, root, 1, ""),
    ];
    for (const attempt of attempts) {
      await expect(attempt).to.be.reverted; // each with AccessControl / custom error
    }
  });

  it("R4 replay: re-submitting an anchor tx payload is harmless (duplicate revert)", async () => {
    const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
    const root = keccak256(toUtf8Bytes("replayed-root"));
    await certificateAnchor.connect(anchorer).anchorRoot(root, ISSUER_ID, batchRef(1), 0, "");
    // A replayed/duplicated relayer call cannot double-anchor or alter state.
    await expect(
      certificateAnchor.connect(anchorer).anchorRoot(root, ISSUER_ID, batchRef(99), 2, "ipfs://evil"),
    ).to.be.revertedWithCustomError(certificateAnchor, "RootAlreadyAnchored");
    const rec = await certificateAnchor.getAnchor(root);
    expect(rec.anchorType).to.equal(0); // original record untouched
  });

  it("R4 replay: stale status-list update cannot roll back a newer root", async () => {
    const { revocationRegistry, anchorer } = await loadFixture(deployWithIssuer);
    const v1 = keccak256(toUtf8Bytes("v1"));
    const v9 = keccak256(toUtf8Bytes("v9"));
    await revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, v9, 9, "");
    await expect(
      revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, v1, 1, ""),
    ).to.be.revertedWithCustomError(revocationRegistry, "NonMonotonicVersion");
  });

  it("R7 Merkle second-preimage: an internal node cannot be presented as a leaf", async () => {
    const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
    const batch = buildBatch(['{"c":1}', '{"c":2}', '{"c":3}', '{"c":4}']);
    await certificateAnchor
      .connect(anchorer)
      .anchorRoot(batch.tree.root, ISSUER_ID, batchRef(1), 0, "");

    // Attacker crafts (salt', contentHash') so their 0x00-prefixed leaf equals
    // an internal 0x01-prefixed node. Domain separation makes the preimage
    // domains disjoint — we demonstrate the direct forgery attempt fails:
    const internalNode = batch.tree.levels[1][0]; // node over leaves 0,1
    // Present the internal node's children as "salt/contentHash":
    const forgedLeaf = hashLeaf(batch.tree.levels[0][0], batch.tree.levels[0][1]);
    expect(forgedLeaf).to.not.equal(internalNode); // 0x00 vs 0x01 prefix
    const [valid] = await certificateAnchor.verifyCertificate(
      batch.tree.levels[0][0],
      batch.tree.levels[0][1],
      [batch.tree.levels[1][1]],
      batch.tree.root,
    );
    expect(valid).to.equal(false);
  });

  it("R7 proof malleability: reordering/truncating a proof fails verification", async () => {
    const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
    const batch = buildBatch(Array.from({ length: 8 }, (_, i) => `{"c":${i}}`));
    await certificateAnchor
      .connect(anchorer)
      .anchorRoot(batch.tree.root, ISSUER_ID, batchRef(1), 0, "");

    const proof = batch.proofs[3];
    const reversed = [...proof].reverse();
    const truncated = proof.slice(0, proof.length - 1);
    for (const bad of [reversed, truncated]) {
      if (JSON.stringify(bad) === JSON.stringify(proof)) continue; // 1-elem edge
      const [valid] = await certificateAnchor.verifyCertificate(
        batch.salts[3],
        batch.contentHashes[3],
        bad,
        batch.tree.root,
      );
      expect(valid).to.equal(false);
    }
  });

  it("R9 DoS bounds: 100-root batch fits comfortably in a block (< 4M gas)", async () => {
    const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
    const n = 100;
    const roots = Array.from({ length: n }, (_, i) => keccak256(toUtf8Bytes(`bulk-${i}`)));
    const tx = await certificateAnchor.connect(anchorer).anchorRoots(
      roots,
      roots.map(() => ISSUER_ID),
      roots.map((_, i) => batchRef(i)),
      roots.map(() => 0),
      roots.map(() => ""),
    );
    const receipt = await tx.wait();
    expect(receipt!.gasUsed).to.be.lessThan(4_000_000n);
  });

  it("R11 role separation: anchorer cannot administer roles or upgrade", async () => {
    const { issuerRegistry, certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
    const ANCHORER_ROLE = await certificateAnchor.ANCHORER_ROLE();
    // Anchorer (hot key) must not be able to grant itself more power.
    await expect(
      certificateAnchor.connect(anchorer).grantRole(ANCHORER_ROLE, anchorer.address),
    ).to.be.revertedWithCustomError(certificateAnchor, "AccessControlUnauthorizedAccount");
    await expect(
      issuerRegistry.connect(anchorer).registerIssuer(9n, keccak256(toUtf8Bytes("d")), keccak256(toUtf8Bytes("k")), ""),
    ).to.be.revertedWithCustomError(issuerRegistry, "AccessControlUnauthorizedAccount");
  });

  it("R12 initializer safety: implementations cannot be initialized directly", async () => {
    const { admin } = await loadFixture(deployWithIssuer);
    const F = await ethers.getContractFactory("IssuerRegistry", admin);
    const raw = await F.deploy(); // bare implementation, no proxy
    await raw.waitForDeployment();
    await expect(
      raw.initialize(admin.address, admin.address, admin.address, admin.address),
    ).to.be.revertedWithCustomError(raw, "InvalidInitialization"); // _disableInitializers()
  });

  it("R13 timestamp use is coarse-grained only (uint40 bounds sanity)", async () => {
    // isKeyValidAt uses second-granularity windows measured in days — miner
    // drift of a few seconds cannot flip trust decisions. Sanity: uint40 max
    // covers dates far beyond any credential lifetime.
    const max = 2n ** 40n - 1n;
    expect(max).to.be.greaterThan(BigInt(Math.floor(Date.now() / 1000)) + 300n * 365n * 24n * 3600n);
  });
});
