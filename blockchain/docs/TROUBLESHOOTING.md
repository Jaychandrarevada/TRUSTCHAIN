# Troubleshooting Guide

## Development

| Symptom | Cause → Fix |
|---|---|
| `npm install` ERESOLVE on gas reporter | Don't add `hardhat-gas-reporter` explicitly — toolbox v5 bundles v1.x |
| `npx hardhat` downloads Hardhat 3 / Node version error | You're outside the project or node_modules missing — run `npm install` in `blockchain/` and use `npm run …` scripts |
| `__UUPSUpgradeable_init` undeclared | OZ v5 removed it (stateless) — the base contract already reflects this |
| `Missing initializer` on upgrade validation | Pure logic upgrades: annotate `@custom:oz-upgrades-unsafe-allow missing-initializer`; state-adding upgrades: use `reinitializer(n)` |
| `InvalidInitialization` calling `initialize` | You're calling the implementation, not the proxy — use the proxy address from `deployments/<network>.json` |
| TypeChain types missing in tests | Run `npm run build` once (generates `typechain-types/`) |

## Deployment & operations

| Symptom | Cause → Fix |
|---|---|
| Deploy aborts "MAINNET SAFETY GATE" | Intentional: set `TIMELOCK_ADDRESS`/`GOVERNANCE_SAFE_ADDRESS` — deployer EOA may not hold mainnet admin |
| `AccessControlUnauthorizedAccount` from services | Role not granted to that service address on this network — check `deployments/<network>.json` governance and grant via admin |
| `RootAlreadyAnchored` in relayer logs | Usually **benign idempotency**: a retry of an already-landed tx. Treat as success; alert only if the root was never marked anchored internally |
| `IssuerNotEligible` on anchor | Issuer suspended/retired or wrong issuerId mapping — check `IssuerRegistry.getIssuer` |
| `NonMonotonicVersion` on status update | Concurrent status publishers or version counter drift — the DB `revocation_lists.version` is the source; re-read and retry with `version+1` |
| Stuck transaction (no receipt) | Fee below market: relayer fee-bumps same-nonce automatically; manually: resend with same nonce, +12.5% fees |
| Explorer verify fails "already verified" | Harmless — script tolerates it; confirm proxy page shows Read/Write-as-Proxy |
| Reorg alert fired | Expected on Polygon occasionally: FSM auto re-anchors; verify the replacement tx landed, then close the alert |
| Wallet balance alarm | Follow the top-up runbook (cold → hot); anchoring queues durably in the meantime — no data loss |

## Verification disputes

| Symptom | Diagnosis path |
|---|---|
| "Valid cert shows TAMPERED" | Recompute content hash from the ORIGINAL canonical JSON (JCS! — key order matters). 99% of cases: non-canonical JSON or wrong salt pairing |
| "Anchored but isAnchored=false" | Wrong network/contract pair — proof bundles pin `(chainId, contract)`; check you're querying the recorded pair |
| "Proof verifies locally, fails on-chain" | Off-chain toolkit drift — run `test/Merkle.test.ts` + `CertificateAnchor.test.ts` parity suite; never modify one side of the algorithm |
| Verdict shows stale revocation | Indexer lag — check `/health/chain` indexer cursor vs latest block; verdicts carry the staleness banner by design (BR-20) |
