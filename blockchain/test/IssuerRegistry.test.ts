/**
 * IssuerRegistry unit tests — invariants I1–I4 (contract NatSpec), role gates,
 * key lifecycle (rotation windows, compromise fence), status FSM, pause.
 */
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  deployTrustChain,
  deployWithIssuer,
  ISSUER_ID,
  DID_HASH,
  KEY_HASH_1,
  KEY_HASH_2,
  META_URI,
} from "./helpers/fixtures";
import { ZeroHash } from "ethers";

// Enum mirrors (interface IIssuerRegistry).
const Status = { None: 0, Active: 1, Suspended: 2, Retired: 3 } as const;

describe("IssuerRegistry", () => {
  describe("registration", () => {
    it("registers an issuer with initial key and emits IssuerRegistered", async () => {
      const { issuerRegistry, registrar } = await loadFixture(deployTrustChain);
      await expect(
        issuerRegistry.connect(registrar).registerIssuer(ISSUER_ID, DID_HASH, KEY_HASH_1, META_URI),
      )
        .to.emit(issuerRegistry, "IssuerRegistered")
        .withArgs(ISSUER_ID, DID_HASH, KEY_HASH_1, META_URI);

      const issuer = await issuerRegistry.getIssuer(ISSUER_ID);
      expect(issuer.status).to.equal(Status.Active);
      expect(issuer.didHash).to.equal(DID_HASH);
      expect(issuer.attested).to.equal(false);
      expect(await issuerRegistry.isActiveIssuer(ISSUER_ID)).to.equal(true);
    });

    it("I1: rejects duplicate registration of the same issuerId", async () => {
      const { issuerRegistry, registrar } = await loadFixture(deployWithIssuer);
      await expect(
        issuerRegistry.connect(registrar).registerIssuer(ISSUER_ID, DID_HASH, KEY_HASH_2, META_URI),
      ).to.be.revertedWithCustomError(issuerRegistry, "IssuerAlreadyRegistered");
    });

    it("rejects zero didHash / keyHash", async () => {
      const { issuerRegistry, registrar } = await loadFixture(deployTrustChain);
      await expect(
        issuerRegistry.connect(registrar).registerIssuer(2n, ZeroHash, KEY_HASH_1, META_URI),
      ).to.be.revertedWithCustomError(issuerRegistry, "ZeroBytes32");
    });

    it("I4: non-registrar cannot register", async () => {
      const { issuerRegistry, outsider } = await loadFixture(deployTrustChain);
      await expect(
        issuerRegistry.connect(outsider).registerIssuer(2n, DID_HASH, KEY_HASH_1, META_URI),
      ).to.be.revertedWithCustomError(issuerRegistry, "AccessControlUnauthorizedAccount");
    });
  });

  describe("key lifecycle", () => {
    it("rotates a key with an overlap window; both keys valid inside it", async () => {
      const { issuerRegistry, registrar } = await loadFixture(deployWithIssuer);
      const now = await time.latest();
      const overlapEnd = now + 7 * 24 * 3600; // 7-day overlap

      await expect(issuerRegistry.connect(registrar).rotateKey(ISSUER_ID, KEY_HASH_2, overlapEnd))
        .to.emit(issuerRegistry, "KeyRotated");

      // Inside the overlap window: both keys valid.
      const mid = now + 3600;
      expect(await issuerRegistry.isKeyValidAt(ISSUER_ID, KEY_HASH_1, mid)).to.equal(true);
      expect(await issuerRegistry.isKeyValidAt(ISSUER_ID, KEY_HASH_2, mid)).to.equal(true);
      // After the window: only the new key.
      const after = overlapEnd + 1;
      expect(await issuerRegistry.isKeyValidAt(ISSUER_ID, KEY_HASH_1, after)).to.equal(false);
      expect(await issuerRegistry.isKeyValidAt(ISSUER_ID, KEY_HASH_2, after)).to.equal(true);
    });

    it("rejects a rotation window ending in the past", async () => {
      const { issuerRegistry, registrar } = await loadFixture(deployWithIssuer);
      const past = (await time.latest()) - 10;
      await expect(
        issuerRegistry.connect(registrar).rotateKey(ISSUER_ID, KEY_HASH_2, past),
      ).to.be.revertedWithCustomError(issuerRegistry, "InvalidValidityWindow");
    });

    it("UC-12: compromise fence invalidates signatures at/after compromisedAt", async () => {
      const { issuerRegistry, registrar } = await loadFixture(deployWithIssuer);
      const registered = await time.latest();
      const compromiseAt = registered + 1000;

      await expect(issuerRegistry.connect(registrar).revokeKey(ISSUER_ID, KEY_HASH_1, compromiseAt))
        .to.emit(issuerRegistry, "KeyRevoked")
        .withArgs(ISSUER_ID, KEY_HASH_1, compromiseAt);

      // Before the fence: still valid (historic certificates keep verifying).
      expect(await issuerRegistry.isKeyValidAt(ISSUER_ID, KEY_HASH_1, compromiseAt - 1)).to.equal(true);
      // At/after the fence: invalid.
      expect(await issuerRegistry.isKeyValidAt(ISSUER_ID, KEY_HASH_1, compromiseAt)).to.equal(false);
    });

    it("I2: key history is append-only and fully readable", async () => {
      const { issuerRegistry, registrar } = await loadFixture(deployWithIssuer);
      const end = (await time.latest()) + 3600;
      await issuerRegistry.connect(registrar).rotateKey(ISSUER_ID, KEY_HASH_2, end);
      const history = await issuerRegistry.getKeyHistory(ISSUER_ID);
      expect(history.length).to.equal(2);
      expect(history[0].keyHash).to.equal(KEY_HASH_1);
      expect(history[1].keyHash).to.equal(KEY_HASH_2);
    });

    it("rejects rotating to an already-used key hash", async () => {
      const { issuerRegistry, registrar } = await loadFixture(deployWithIssuer);
      const end = (await time.latest()) + 3600;
      await expect(
        issuerRegistry.connect(registrar).rotateKey(ISSUER_ID, KEY_HASH_1, end),
      ).to.be.revertedWithCustomError(issuerRegistry, "KeyAlreadyExists");
    });

    it("returns false for unknown keys and unknown issuers", async () => {
      const { issuerRegistry } = await loadFixture(deployWithIssuer);
      expect(await issuerRegistry.isKeyValidAt(ISSUER_ID, KEY_HASH_2, await time.latest())).to.equal(false);
      expect(await issuerRegistry.isKeyValidAt(999n, KEY_HASH_1, await time.latest())).to.equal(false);
    });
  });

  describe("status FSM (suspend / restore / retire)", () => {
    it("registrar suspends and restores; regulator can also suspend", async () => {
      const { issuerRegistry, registrar, regulator } = await loadFixture(deployWithIssuer);

      await expect(issuerRegistry.connect(registrar).setIssuerStatus(ISSUER_ID, Status.Suspended))
        .to.emit(issuerRegistry, "IssuerStatusChanged")
        .withArgs(ISSUER_ID, Status.Suspended);
      expect(await issuerRegistry.isActiveIssuer(ISSUER_ID)).to.equal(false);

      await issuerRegistry.connect(regulator).setIssuerStatus(ISSUER_ID, Status.Active);
      expect(await issuerRegistry.isActiveIssuer(ISSUER_ID)).to.equal(true);

      await issuerRegistry.connect(regulator).setIssuerStatus(ISSUER_ID, Status.Suspended);
      expect(await issuerRegistry.isActiveIssuer(ISSUER_ID)).to.equal(false);
    });

    it("I3: Retired is terminal", async () => {
      const { issuerRegistry, registrar } = await loadFixture(deployWithIssuer);
      await issuerRegistry.connect(registrar).setIssuerStatus(ISSUER_ID, Status.Retired);
      await expect(
        issuerRegistry.connect(registrar).setIssuerStatus(ISSUER_ID, Status.Active),
      ).to.be.revertedWithCustomError(issuerRegistry, "InvalidStatusTransition");
    });

    it("regulator cannot retire (registrar-only offboarding)", async () => {
      const { issuerRegistry, regulator } = await loadFixture(deployWithIssuer);
      await expect(
        issuerRegistry.connect(regulator).setIssuerStatus(ISSUER_ID, Status.Retired),
      ).to.be.revertedWithCustomError(issuerRegistry, "AccessControlUnauthorizedAccount");
    });

    it("outsider cannot change status", async () => {
      const { issuerRegistry, outsider } = await loadFixture(deployWithIssuer);
      await expect(
        issuerRegistry.connect(outsider).setIssuerStatus(ISSUER_ID, Status.Suspended),
      ).to.be.revertedWithCustomError(issuerRegistry, "AccessControlUnauthorizedAccount");
    });
  });

  describe("attestation & metadata", () => {
    it("regulator attests ('InstitutionVerified')", async () => {
      const { issuerRegistry, regulator } = await loadFixture(deployWithIssuer);
      await expect(issuerRegistry.connect(regulator).attestIssuer(ISSUER_ID, "UGC/2026/777"))
        .to.emit(issuerRegistry, "IssuerAttested")
        .withArgs(ISSUER_ID, regulator.address, "UGC/2026/777");
      expect((await issuerRegistry.getIssuer(ISSUER_ID)).attested).to.equal(true);
    });

    it("registrar cannot attest; registrar updates metadata URI", async () => {
      const { issuerRegistry, registrar } = await loadFixture(deployWithIssuer);
      await expect(
        issuerRegistry.connect(registrar).attestIssuer(ISSUER_ID, "x"),
      ).to.be.revertedWithCustomError(issuerRegistry, "AccessControlUnauthorizedAccount");

      await expect(issuerRegistry.connect(registrar).updateMetadataURI(ISSUER_ID, "ipfs://new"))
        .to.emit(issuerRegistry, "IssuerMetadataUpdated")
        .withArgs(ISSUER_ID, "ipfs://new");
    });
  });

  describe("pause (emergency controls)", () => {
    it("pause blocks writes, never reads; unpause restores", async () => {
      const { issuerRegistry, pauser, registrar } = await loadFixture(deployWithIssuer);
      await issuerRegistry.connect(pauser).pause();

      await expect(
        issuerRegistry.connect(registrar).registerIssuer(2n, DID_HASH, KEY_HASH_2, META_URI),
      ).to.be.revertedWithCustomError(issuerRegistry, "EnforcedPause");

      // Reads keep working while paused (verification must never block).
      expect(await issuerRegistry.isActiveIssuer(ISSUER_ID)).to.equal(true);

      await issuerRegistry.connect(pauser).unpause();
      await issuerRegistry.connect(registrar).registerIssuer(2n, DID_HASH, KEY_HASH_2, META_URI);
      expect(await issuerRegistry.isActiveIssuer(2n)).to.equal(true);
    });

    it("only PAUSER_ROLE may pause", async () => {
      const { issuerRegistry, outsider } = await loadFixture(deployWithIssuer);
      await expect(issuerRegistry.connect(outsider).pause()).to.be.revertedWithCustomError(
        issuerRegistry,
        "AccessControlUnauthorizedAccount",
      );
    });
  });
});
