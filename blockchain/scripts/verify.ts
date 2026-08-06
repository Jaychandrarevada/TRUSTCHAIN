/**
 * Explorer source verification for the current network's recorded deployment.
 * Verifies the IMPLEMENTATION contracts (proxies are OZ-standard and detected
 * automatically by Etherscan/Polygonscan's proxy checker).
 *
 * Usage: npm run verify:sepolia | verify:amoy   (after deploy)
 */
import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main(): Promise<void> {
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`No deployment record for '${network.name}'. Run the deploy script first.`);
  }
  const record = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const [name, addrs] of Object.entries<{ proxy: string; implementation: string }>(
    record.contracts,
  )) {
    console.log(`Verifying ${name} implementation @ ${addrs.implementation} …`);
    try {
      await run("verify:verify", { address: addrs.implementation, constructorArguments: [] });
      console.log(`  ✓ ${name} verified`);
    } catch (err: unknown) {
      const msg = String(err);
      if (msg.includes("Already Verified")) {
        console.log(`  ✓ ${name} already verified`);
      } else {
        throw err;
      }
    }
  }
  console.log("\nDone. Confirm the proxy pages show 'Read/Write as Proxy' on the explorer.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
