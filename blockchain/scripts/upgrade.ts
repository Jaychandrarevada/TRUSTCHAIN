/**
 * UUPS upgrade script (a "migration" in the upgradeable-proxy world: state
 * stays in the proxy; only the implementation moves).
 *
 * PRODUCTION PROCESS (docs/UPGRADES.md): this script is only run directly on
 * testnets. On mainnet it runs with DRY_RUN=true to produce and validate the
 * new implementation; the actual upgradeTo call is executed by the Safe
 * through the 48 h timelock (TDD §7.8).
 *
 * Usage:
 *   CONTRACT=IssuerRegistry NEW_IMPL=IssuerRegistryV2 npm run upgrade -- --network amoy
 *   DRY_RUN=true CONTRACT=... NEW_IMPL=... npm run upgrade -- --network polygon
 */
import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main(): Promise<void> {
  const contractName = process.env.CONTRACT;
  const newImplName = process.env.NEW_IMPL;
  const dryRun = process.env.DRY_RUN === "true";
  if (!contractName || !newImplName) {
    throw new Error("Set CONTRACT=<recorded name> and NEW_IMPL=<new factory name>.");
  }

  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const record = JSON.parse(fs.readFileSync(file, "utf8"));
  const proxy = record.contracts[contractName]?.proxy;
  if (!proxy) throw new Error(`No recorded proxy for ${contractName} on ${network.name}.`);

  const NewImpl = await ethers.getContractFactory(newImplName);

  // Storage-layout compatibility is validated in BOTH paths — an upgrade that
  // would corrupt state fails here, before anything touches the chain.
  if (dryRun) {
    await upgrades.validateUpgrade(proxy, NewImpl, { kind: "uups" });
    const implAddr = await upgrades.prepareUpgrade(proxy, NewImpl, { kind: "uups" });
    console.log(`DRY RUN ok — layout compatible.`);
    console.log(`New implementation deployed (not activated): ${implAddr}`);
    console.log(`Submit to the Safe/timelock: ${contractName}.upgradeToAndCall(${implAddr}, 0x)`);
    return;
  }

  const upgraded = await upgrades.upgradeProxy(proxy, NewImpl, { kind: "uups" });
  await upgraded.waitForDeployment();
  const newImpl = await upgrades.erc1967.getImplementationAddress(proxy);
  console.log(`${contractName} upgraded in place. proxy=${proxy} implementation=${newImpl}`);

  record.contracts[contractName].implementation = newImpl;
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
