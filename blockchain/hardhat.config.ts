/**
 * TrustChain — Hardhat configuration.
 *
 * Networks (TDD §8.6 + user-requested Sepolia support):
 *  - hardhat/localhost : deterministic local chain for tests & CI
 *  - sepolia           : Ethereum Sepolia testnet (chainId 11155111)
 *  - amoy              : Polygon Amoy testnet (chainId 80002) — sandbox/staging (approved architecture)
 *  - polygon           : Polygon PoS mainnet (chainId 137) — production (approved architecture)
 *
 * Security notes:
 *  - Private keys come ONLY from environment variables (.env is git-ignored).
 *    In production the relayer signs via AWS KMS (SEC-KEY-2); raw keys here are
 *    for testnets and local development only.
 *  - Optimizer runs=10_000 favours cheap runtime calls (anchoring is called
 *    thousands of times; deployment happens once).
 */
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-contract-sizer";
import * as dotenv from "dotenv";

dotenv.config();

/** Returns accounts array only when a key is configured (avoids HH errors on fresh clones). */
function accounts(): string[] {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  return key && key.length > 0 ? [key] : [];
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 10_000 },
      // Reject any use of transient storage / new opcodes not on target chains.
      evmVersion: "paris",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // Deterministic accounts for fixtures; never used outside tests.
      initialBaseFeePerGas: 1_000_000_000,
    },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts: accounts(),
    },
    amoy: {
      url: process.env.AMOY_RPC_URL ?? "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: accounts(),
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL ?? "https://polygon-rpc.com",
      chainId: 137,
      accounts: accounts(),
    },
  },
  etherscan: {
    // Explorer verification keys (Etherscan v2 API covers both families).
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY ?? "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY ?? "",
      polygon: process.env.POLYGONSCAN_API_KEY ?? "",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    excludeContracts: ["mocks/"],
  },
  contractSizer: { runOnCompile: false, strict: true },
  typechain: { outDir: "typechain-types", target: "ethers-v6" },
  paths: {
    sources: "contracts",
    tests: "test",
    cache: "cache",
    artifacts: "artifacts",
  },
  mocha: { timeout: 120_000 },
};

export default config;
