/**
 * inspect-local.ts — a teaching/demo tool, not part of the deploy pipeline.
 *
 * Proves the local chain is real by reading it back, live: every value here
 * comes from an on-chain event or view call, nothing hardcoded — re-run this
 * any time after re-seeding/re-deploying and it still works, because it
 * discovers issuers/roots from the contracts' own event logs instead of
 * assuming an ID.
 *
 * Usage: npx hardhat run scripts/inspect-local.ts --network localhost
 */
import { ethers } from "hardhat";
import deployment from "../deployments/localhost.json";

async function main() {
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(`\nChain height: block #${blockNumber} (each number below is read live from this chain, not a file)\n`);

  const issuerRegistry = await ethers.getContractAt("IssuerRegistry", deployment.contracts.IssuerRegistry.proxy);
  const anchor = await ethers.getContractAt("CertificateAnchor", deployment.contracts.CertificateAnchor.proxy);
  const revocation = await ethers.getContractAt("RevocationRegistry", deployment.contracts.RevocationRegistry.proxy);

  console.log("── Institutions registered on-chain ──────────────────────────");
  const registrations = await issuerRegistry.queryFilter(issuerRegistry.filters.IssuerRegistered(), 0, "latest");
  for (const ev of registrations) {
    const issuerId = ev.args.issuerId;
    const active = await issuerRegistry.isActiveIssuer(issuerId);
    console.log(`  issuerId ${issuerId} | metadata: ${ev.args.metadataURI} | active now: ${active} | tx: ${ev.transactionHash} (block ${ev.blockNumber})`);
  }
  if (registrations.length === 0) console.log("  (none yet — run the backend seed script first)");

  console.log("\n── Certificate batches anchored on-chain ──────────────────────");
  const anchors = await anchor.queryFilter(anchor.filters.RootAnchored(), 0, "latest");
  for (const ev of anchors) {
    console.log(`  root ${ev.args.root} | issuerId ${ev.args.issuerId} | tx: ${ev.transactionHash} (block ${ev.blockNumber})`);
  }
  if (anchors.length === 0) console.log("  (none yet)");

  console.log("\n── Revocation status-root updates ─────────────────────────────");
  const statusUpdates = await revocation.queryFilter(revocation.filters.StatusRootUpdated(), 0, "latest");
  for (const ev of statusUpdates) {
    console.log(`  issuerId ${ev.args.issuerId} | new root: ${ev.args.root} | tx: ${ev.transactionHash} (block ${ev.blockNumber})`);
  }
  if (statusUpdates.length === 0) console.log("  (none yet — nothing revoked)");

  console.log("\nTry it yourself: pick any tx hash above and cross-check it against\nyour Hardhat node's own log — same hash, same block. That's the proof.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
