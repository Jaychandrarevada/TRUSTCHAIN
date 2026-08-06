/**
 * CertificateAnchor unit tests — invariants A1–A3, Merkle verification parity
 * with the off-chain toolkit, batch limits, issuer eligibility, pause.
 */
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { keccak256, toUtf8Bytes, ZeroHash } from "ethers";
import { deployWithIssuer, ISSUER_ID, batchRef } from "./helpers/fixtures";
import { buildBatch, hashLeaf } from "../utils/merkle";

const AnchorType = { Issuance: 0, StatusList: 1, AuditLog: 2 } as const;
const ROOT_A = keccak256(toUtf8Bytes("root-a"));

describe("CertificateAnchor", () => {
  describe("anchorRoot", () => {
    it("anchors a root and emits RootAnchored with metadata URI", async () => {
      const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
      const tx = certificateAnchor
        .connect(anchorer)
        .anchorRoot(ROOT_A, ISSUER_ID, batchRef(1), AnchorType.Issuance, "ipfs://bafy/manifest.json");
      await expect(tx).to.emit(certificateAnchor, "RootAnchored");

      const rec = await certificateAnchor.getAnchor(ROOT_A);
      expect(rec.issuerId).to.equal(ISSUER_ID);
      expect(rec.anchorType).to.equal(AnchorType.Issuance);
      expect(await certificateAnchor.isAnchored(ROOT_A)).to.equal(true);
    });

    it("A1: duplicate root reverts (relayer idempotency backstop)", async () => {
      const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
      await certificateAnchor
        .connect(anchorer)
        .anchorRoot(ROOT_A, ISSUER_ID, batchRef(1), AnchorType.Issuance, "");
      await expect(
        certificateAnchor
          .connect(anchorer)
          .anchorRoot(ROOT_A, ISSUER_ID, batchRef(2), AnchorType.Issuance, ""),
      ).to.be.revertedWithCustomError(certificateAnchor, "RootAlreadyAnchored");
    });

    it("A3: issuance anchor requires an ACTIVE issuer", async () => {
      const { certificateAnchor, issuerRegistry, anchorer, registrar } =
        await loadFixture(deployWithIssuer);
      await issuerRegistry.connect(registrar).setIssuerStatus(ISSUER_ID, 2 /* Suspended */);
      await expect(
        certificateAnchor
          .connect(anchorer)
          .anchorRoot(ROOT_A, ISSUER_ID, batchRef(1), AnchorType.Issuance, ""),
      ).to.be.revertedWithCustomError(certificateAnchor, "IssuerNotEligible");
    });

    it("A3: AuditLog anchors are platform-scoped (issuerId 0 allowed)", async () => {
      const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
      await expect(
        certificateAnchor
          .connect(anchorer)
          .anchorRoot(ROOT_A, 0n, batchRef(1), AnchorType.AuditLog, ""),
      ).to.emit(certificateAnchor, "RootAnchored");
    });

    it("rejects zero root; rejects non-anchorer caller", async () => {
      const { certificateAnchor, anchorer, outsider } = await loadFixture(deployWithIssuer);
      await expect(
        certificateAnchor
          .connect(anchorer)
          .anchorRoot(ZeroHash, ISSUER_ID, batchRef(1), AnchorType.Issuance, ""),
      ).to.be.revertedWithCustomError(certificateAnchor, "ZeroBytes32");
      await expect(
        certificateAnchor
          .connect(outsider)
          .anchorRoot(ROOT_A, ISSUER_ID, batchRef(1), AnchorType.Issuance, ""),
      ).to.be.revertedWithCustomError(certificateAnchor, "AccessControlUnauthorizedAccount");
    });
  });

  describe("anchorRoots (multi-root batching)", () => {
    it("anchors N roots in one tx", async () => {
      const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
      const roots = [1, 2, 3].map((i) => keccak256(toUtf8Bytes(`multi-${i}`)));
      await certificateAnchor.connect(anchorer).anchorRoots(
        roots,
        roots.map(() => ISSUER_ID),
        roots.map((_, i) => batchRef(i + 10)),
        roots.map(() => AnchorType.Issuance),
        roots.map(() => ""),
      );
      for (const r of roots) expect(await certificateAnchor.isAnchored(r)).to.equal(true);
    });

    it("rejects empty batch, oversize batch, and length mismatches", async () => {
      const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
      await expect(
        certificateAnchor.connect(anchorer).anchorRoots([], [], [], [], []),
      ).to.be.revertedWithCustomError(certificateAnchor, "EmptyBatch");

      const over = Array.from({ length: 101 }, (_, i) => keccak256(toUtf8Bytes(`o${i}`)));
      await expect(
        certificateAnchor.connect(anchorer).anchorRoots(
          over,
          over.map(() => ISSUER_ID),
          over.map((_, i) => batchRef(i)),
          over.map(() => AnchorType.Issuance),
          over.map(() => ""),
        ),
      ).to.be.revertedWithCustomError(certificateAnchor, "BatchTooLarge");

      await expect(
        certificateAnchor
          .connect(anchorer)
          .anchorRoots([ROOT_A], [ISSUER_ID, ISSUER_ID], [batchRef(1)], [0], [""]),
      ).to.be.revertedWithCustomError(certificateAnchor, "ArrayLengthMismatch");
    });

    it("multi-root batch is atomic: one duplicate reverts the whole tx", async () => {
      const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
      await certificateAnchor
        .connect(anchorer)
        .anchorRoot(ROOT_A, ISSUER_ID, batchRef(1), AnchorType.Issuance, "");
      const fresh = keccak256(toUtf8Bytes("fresh"));
      await expect(
        certificateAnchor
          .connect(anchorer)
          .anchorRoots(
            [fresh, ROOT_A],
            [ISSUER_ID, ISSUER_ID],
            [batchRef(2), batchRef(3)],
            [0, 0],
            ["", ""],
          ),
      ).to.be.revertedWithCustomError(certificateAnchor, "RootAlreadyAnchored");
      expect(await certificateAnchor.isAnchored(fresh)).to.equal(false); // rolled back
    });
  });

  describe("verifyCertificate (on-chain ↔ off-chain Merkle parity)", () => {
    it("verifies every certificate of a 50-cert batch against the anchored root", async () => {
      const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
      const certs = Array.from({ length: 50 }, (_, i) =>
        JSON.stringify({ certUid: `TC-2026-${i}`, name: `Student ${i}`, program: "B.Tech CSE" }),
      );
      const { salts, contentHashes, tree, proofs } = buildBatch(certs);

      await certificateAnchor
        .connect(anchorer)
        .anchorRoot(tree.root, ISSUER_ID, batchRef(42), AnchorType.Issuance, "");

      for (const i of [0, 1, 24, 48, 49]) {
        const [valid, anchoredAt] = await certificateAnchor.verifyCertificate(
          salts[i],
          contentHashes[i],
          proofs[i],
          tree.root,
        );
        expect(valid, `cert ${i}`).to.equal(true);
        expect(anchoredAt).to.be.greaterThan(0);
      }
    });

    it("single certificate = batch of one (root == leaf, empty proof)", async () => {
      const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
      const { salts, contentHashes, tree } = buildBatch(['{"certUid":"TC-SOLO"}']);
      expect(tree.root).to.equal(hashLeaf(salts[0], contentHashes[0]));

      await certificateAnchor
        .connect(anchorer)
        .anchorRoot(tree.root, ISSUER_ID, batchRef(7), AnchorType.Issuance, "");
      const [valid] = await certificateAnchor.verifyCertificate(
        salts[0],
        contentHashes[0],
        [],
        tree.root,
      );
      expect(valid).to.equal(true);
    });

    it("TAMPERED: altered content fails; wrong salt fails; unanchored root fails", async () => {
      const { certificateAnchor, anchorer } = await loadFixture(deployWithIssuer);
      const { salts, contentHashes, tree, proofs } = buildBatch([
        '{"certUid":"TC-1","cgpa":8.2}',
        '{"certUid":"TC-2","cgpa":6.4}',
      ]);
      await certificateAnchor
        .connect(anchorer)
        .anchorRoot(tree.root, ISSUER_ID, batchRef(9), AnchorType.Issuance, "");

      // Tampered content (cgpa 6.4 → 9.4) produces a different content hash.
      const tampered = keccak256(toUtf8Bytes('{"certUid":"TC-2","cgpa":9.4}'));
      let [valid] = await certificateAnchor.verifyCertificate(salts[1], tampered, proofs[1], tree.root);
      expect(valid).to.equal(false);

      // Wrong salt.
      [valid] = await certificateAnchor.verifyCertificate(salts[0], contentHashes[1], proofs[1], tree.root);
      expect(valid).to.equal(false);

      // Valid proof against a root that was never anchored.
      const other = keccak256(toUtf8Bytes("never-anchored"));
      const [v2, at] = await certificateAnchor.verifyCertificate(salts[1], contentHashes[1], proofs[1], other);
      expect(v2).to.equal(false);
      expect(at).to.equal(0);
    });

    it("views work while paused (reads are unpausable by design)", async () => {
      const { certificateAnchor, anchorer, pauser } = await loadFixture(deployWithIssuer);
      await certificateAnchor
        .connect(anchorer)
        .anchorRoot(ROOT_A, ISSUER_ID, batchRef(1), AnchorType.Issuance, "");
      await certificateAnchor.connect(pauser).pause();

      expect(await certificateAnchor.isAnchored(ROOT_A)).to.equal(true);
      await expect(
        certificateAnchor
          .connect(anchorer)
          .anchorRoot(keccak256(toUtf8Bytes("x")), ISSUER_ID, batchRef(2), 0, ""),
      ).to.be.revertedWithCustomError(certificateAnchor, "EnforcedPause");
    });
  });
});
