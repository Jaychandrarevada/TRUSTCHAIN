# Deployment Guide

## Environments

| Env | Network | ChainId | Purpose |
|---|---|---|---|
| Local | Hardhat node | 31337 | Development, tests, seeding |
| Testnet A | **Sepolia** | 11155111 | Ethereum-family staging (requested stack) |
| Testnet B | **Polygon Amoy** | 80002 | Approved sandbox/staging chain (TDD §8.6) |
| Production | **Polygon PoS** | 137 | Mainnet |

## Prerequisites

1. Node 20+, `npm install`, `.env` from `.env.example`.
2. Funded deployer key (testnets: faucet; Sepolia faucets via Alchemy/Infura, Amoy via Polygon faucet).
3. Explorer API keys for verification (`ETHERSCAN_API_KEY` / `POLYGONSCAN_API_KEY`).

## Local

```bash
npm run node:local        # terminal 1 — Hardhat chain
npm run deploy:local      # terminal 2 — deploys 3 UUPS proxies
npm run seed:local        # registers demo issuer + anchors a 10-cert batch
```

Outputs: `deployments/localhost.json` (addresses) and `deployments/localhost.seed.json` (salts/proofs — the off-chain evidence a backend would store).

## Sepolia / Amoy

```bash
npm run deploy:sepolia    # or deploy:amoy
npm run verify:sepolia    # explorer source verification (implementations)
```

The deploy script wires roles from env (`GOVERNANCE_SAFE_ADDRESS`, `REGISTRAR_SERVICE_ADDRESS`, `ANCHORER_SERVICE_ADDRESS`, `PAUSER_ADDRESS`), falling back to the deployer on testnets. Deployment records land in `deployments/<network>.json` and are committed.

## Mainnet strategy (Polygon PoS)

Hard gates — the script enforces #1; process enforces the rest:

1. **Governance gate (enforced):** deploy aborts unless `TIMELOCK_ADDRESS`/`GOVERNANCE_SAFE_ADDRESS` is set — the deployer EOA must never hold admin on mainnet.
2. **Audit gate:** two independent audits clean of critical/high findings (NFR-SEC-07); contract bytecode frozen at audited commit (tag `contracts-v1.0.0-audited`).
3. **Key ceremony:** Safe (3-of-5, hardware wallets) and TimelockController (48 h, Safe as proposer/executor) deployed and verified first; ceremony recorded per runbook.
4. **Deploy order:** IssuerRegistry → CertificateAnchor → RevocationRegistry (same script, `--network polygon`), with `REGISTRAR_SERVICE_ADDRESS`/`ANCHORER_SERVICE_ADDRESS` pointing at KMS-backed service addresses.
5. **Post-deploy checklist:** explorer verification; `deployments/polygon.json` committed + published at `/system/contracts`; subgraph deployed; monitoring watchers armed (role changes, pauses, anomalous volume); relayer balance alerts configured; canary batch anchored and verified end-to-end via the OSS verifier.
6. **Rollback posture:** there is no state rollback on a public chain — incident response = `pause()` (writes only) + fix-forward via timelocked upgrade or sibling deployment. Anchored history is immutable by design.

## Migration notes

"Migrations" in the UUPS world = implementation upgrades (state stays in the proxy) — see [UPGRADES.md](UPGRADES.md) and `scripts/upgrade.ts`. Moving chains (e.g., Sepolia pilot → Polygon production) is a **redeployment**: anchors are not migrated; historical verification against the old chain remains valid forever, and proof bundles pin `(chainId, contractAddr)` so verifiers can't confuse environments.
