/**
 * RevocationRegistry unit tests — invariants S1 (monotonic versions) and
 * S2 (issuer eligibility incl. the suspended-may-revoke safety rule).
 */
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { keccak256, toUtf8Bytes, ZeroHash } from "ethers";
import { deployWithIssuer, ISSUER_ID, LIST_ID } from "./helpers/fixtures";

const ROOT_V1 = keccak256(toUtf8Bytes("statuslist-v1"));
const ROOT_V2 = keccak256(toUtf8Bytes("statuslist-v2"));
const URI = "https://api.trustchain.io/v1/status-lists/1/2026";

describe("RevocationRegistry", () => {
  it("publishes a status root and reads it back", async () => {
    const { revocationRegistry, anchorer } = await loadFixture(deployWithIssuer);
    await expect(
      revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, ROOT_V1, 1, URI),
    )
      .to.emit(revocationRegistry, "StatusRootUpdated")
      .withArgs(ISSUER_ID, LIST_ID, ROOT_V1, 1, URI);

    const list = await revocationRegistry.getStatusList(ISSUER_ID, LIST_ID);
    expect(list.root).to.equal(ROOT_V1);
    expect(list.version).to.equal(1);
    expect(await revocationRegistry.getStatusRoot(ISSUER_ID, LIST_ID)).to.equal(ROOT_V1);
  });

  it("S1: versions are strictly monotonic (replay/stale protection)", async () => {
    const { revocationRegistry, anchorer } = await loadFixture(deployWithIssuer);
    await revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, ROOT_V1, 5, URI);

    // Same version → revert; lower version → revert; higher → OK.
    await expect(
      revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, ROOT_V2, 5, URI),
    ).to.be.revertedWithCustomError(revocationRegistry, "NonMonotonicVersion");
    await expect(
      revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, ROOT_V2, 4, URI),
    ).to.be.revertedWithCustomError(revocationRegistry, "NonMonotonicVersion");
    await revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, ROOT_V2, 6, URI);
    expect((await revocationRegistry.getStatusList(ISSUER_ID, LIST_ID)).version).to.equal(6);
  });

  it("S2: a SUSPENDED issuer may still publish revocations (safety op)", async () => {
    const { revocationRegistry, issuerRegistry, anchorer, registrar } =
      await loadFixture(deployWithIssuer);
    await issuerRegistry.connect(registrar).setIssuerStatus(ISSUER_ID, 2 /* Suspended */);
    await expect(
      revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, ROOT_V1, 1, URI),
    ).to.emit(revocationRegistry, "StatusRootUpdated");
  });

  it("S2: retired or unknown issuers cannot publish", async () => {
    const { revocationRegistry, issuerRegistry, anchorer, registrar } =
      await loadFixture(deployWithIssuer);
    await issuerRegistry.connect(registrar).setIssuerStatus(ISSUER_ID, 3 /* Retired */);
    await expect(
      revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, ROOT_V1, 1, URI),
    ).to.be.revertedWithCustomError(revocationRegistry, "IssuerNotEligible");
    await expect(
      revocationRegistry.connect(anchorer).updateStatusRoot(999n, LIST_ID, ROOT_V1, 1, URI),
    ).to.be.revertedWithCustomError(revocationRegistry, "IssuerNotEligible");
  });

  it("validates inputs and role; unknown list read reverts, soft read returns zero", async () => {
    const { revocationRegistry, anchorer, outsider } = await loadFixture(deployWithIssuer);
    await expect(
      revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, ZeroHash, 1, URI),
    ).to.be.revertedWithCustomError(revocationRegistry, "ZeroBytes32");
    await expect(
      revocationRegistry.connect(outsider).updateStatusRoot(ISSUER_ID, LIST_ID, ROOT_V1, 1, URI),
    ).to.be.revertedWithCustomError(revocationRegistry, "AccessControlUnauthorizedAccount");

    await expect(
      revocationRegistry.getStatusList(ISSUER_ID, LIST_ID),
    ).to.be.revertedWithCustomError(revocationRegistry, "UnknownStatusList");
    expect(await revocationRegistry.getStatusRoot(ISSUER_ID, LIST_ID)).to.equal(ZeroHash);
  });

  it("pause blocks updates; reads keep working", async () => {
    const { revocationRegistry, anchorer, pauser } = await loadFixture(deployWithIssuer);
    await revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, ROOT_V1, 1, URI);
    await revocationRegistry.connect(pauser).pause();
    await expect(
      revocationRegistry.connect(anchorer).updateStatusRoot(ISSUER_ID, LIST_ID, ROOT_V2, 2, URI),
    ).to.be.revertedWithCustomError(revocationRegistry, "EnforcedPause");
    expect(await revocationRegistry.getStatusRoot(ISSUER_ID, LIST_ID)).to.equal(ROOT_V1);
  });
});
