/**
 * Deployment script — deploys the full TrustChain contract suite as UUPS
 * proxies in dependency order and records addresses to deployments/<network>.json.
 *
 *   1. IssuerRegistry      (no dependencies)
 *   2. CertificateAnchor   (needs IssuerRegistry address)
 *   3. RevocationRegistry  (needs IssuerRegistry address)
 *
 * Role wiring (TDD §7.4):
 *   admin/upgrader = GOVERNANCE_SAFE_ADDRESS (or TIMELOCK_ADDRESS when set;
 *                    falls back to deployer on testnets)
 *   pauser         = PAUSER_ADDRESS (fallback: governance)
 *   registrar      = REGISTRAR_SERVICE_ADDRESS (fallback: deployer — testnet only)
 *   anchorer       = ANCHORER_SERVICE_ADDRESS (fallback: deployer — testnet only)
 *
 * Usage: npm run deploy:sepolia | deploy:amoy | deploy:polygon | deploy:local
 */
import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentRecord {
  network: string;
  chainId: number;
  deployedAt: string;
  deployer: string;
  governance: string;
  contracts: Record<string, { proxy: string; implementation: string }>;
}

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const isMainnet = chainId === 137 || chainId === 1;

  // Governance resolution — mainnet REQUIRES real governance addresses.
  const governance =
    process.env.TIMELOCK_ADDRESS || process.env.GOVERNANCE_SAFE_ADDRESS || deployer.address;
  const pauser = process.env.PAUSER_ADDRESS || governance;
  const registrar = process.env.REGISTRAR_SERVICE_ADDRESS || deployer.address;
  const anchorer = process.env.ANCHORER_SERVICE_ADDRESS || deployer.address;
  const regulator = process.env.REGULATOR_ADDRESS || ethers.ZeroAddress;

  if (isMainnet && governance === deployer.address) {
    throw new Error(
      "MAINNET SAFETY GATE: set TIMELOCK_ADDRESS/GOVERNANCE_SAFE_ADDRESS — the deployer " +
        "EOA must never hold admin on mainnet (docs/DEPLOYMENT.md §mainnet).",
    );
  }

  console.log(`\nTrustChain deploy → ${network.name} (chainId ${chainId})`);
  console.log(`  deployer   ${deployer.address}`);
  console.log(`  governance ${governance}\n`);

  // 1) IssuerRegistry ─────────────────────────────────────────────────────────
  const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await upgrades.deployProxy(
    IssuerRegistry,
    [governance, pauser, registrar, regulator],
    { kind: "uups" },
  );
  await issuerRegistry.waitForDeployment();
  const issuerRegistryAddr = await issuerRegistry.getAddress();
  console.log(`  IssuerRegistry      proxy ${issuerRegistryAddr}`);

  // 2) CertificateAnchor ──────────────────────────────────────────────────────
  const CertificateAnchor = await ethers.getContractFactory("CertificateAnchor");
  const certificateAnchor = await upgrades.deployProxy(
    CertificateAnchor,
    [governance, pauser, anchorer, issuerRegistryAddr],
    { kind: "uups" },
  );
  await certificateAnchor.waitForDeployment();
  const certificateAnchorAddr = await certificateAnchor.getAddress();
  console.log(`  CertificateAnchor   proxy ${certificateAnchorAddr}`);

  // 3) RevocationRegistry ─────────────────────────────────────────────────────
  const RevocationRegistry = await ethers.getContractFactory("RevocationRegistry");
  const revocationRegistry = await upgrades.deployProxy(
    RevocationRegistry,
    [governance, pauser, anchorer, issuerRegistryAddr],
    { kind: "uups" },
  );
  await revocationRegistry.waitForDeployment();
  const revocationRegistryAddr = await revocationRegistry.getAddress();
  console.log(`  RevocationRegistry  proxy ${revocationRegistryAddr}\n`);

  // Record the deployment (committed for shared networks; see .gitignore).
  const record: DeploymentRecord = {
    network: network.name,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    governance,
    contracts: {
      IssuerRegistry: {
        proxy: issuerRegistryAddr,
        implementation: await upgrades.erc1967.getImplementationAddress(issuerRegistryAddr),
      },
      CertificateAnchor: {
        proxy: certificateAnchorAddr,
        implementation: await upgrades.erc1967.getImplementationAddress(certificateAnchorAddr),
      },
      RevocationRegistry: {
        proxy: revocationRegistryAddr,
        implementation: await upgrades.erc1967.getImplementationAddress(revocationRegistryAddr),
      },
    },
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2));
  console.log(`  Deployment record → ${outFile}`);
  console.log(`  Next: npm run verify:${network.name} (explorer source verification)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
