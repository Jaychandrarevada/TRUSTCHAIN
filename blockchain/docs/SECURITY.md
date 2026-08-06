# TrustChain Blockchain Layer — Security Review

Internal review v1.0 (pre-external-audit). Scope: `contracts/**`, deploy scripts, relayer trust model. Each risk lists its mitigation and where it is verified. Test references point at `test/security/attacks.test.ts` unless noted.

## Risk register

| # | Risk | Assessment & mitigation | Verified by |
|---|---|---|---|
| R1 | **Reentrancy** | No contract makes external calls to untrusted code and no value is ever transferred; the only cross-contract call is a `view` into our own `IssuerRegistry`. `ReentrancyGuard` is deliberately omitted — it would add an SSTORE per call for zero benefit. State writes follow checks-effects ordering anyway. | Code inspection; no `call/send/transfer` in `contracts/` |
| R2 | **Access control** | Deny-by-default via OZ `AccessControl`; every mutator is role-gated (`REGISTRAR`, `ANCHORER`, `REGULATOR`, `PAUSER`, `UPGRADER`). Admin = timelock ← 3-of-5 Safe in production; hot relayer key holds ONLY append-only `ANCHORER_ROLE` (blast radius: spam anchors, never forgery — authority lives in issuer signatures, off-chain). | R2 + R11 tests; role wiring in `scripts/deploy.ts` |
| R3 | **Overflow / underflow / integer issues** | Solidity 0.8 checked arithmetic globally; the only `unchecked` blocks are loop counters bounded by `i < len`. Timestamps use `uint40` (valid to year ~36812); versions `uint32` monotonic. | R13 test; solhint; code inspection |
| R4 | **Replay attacks** | Tx-level: EIP-155 chain-bound signatures + relayer nonce discipline. App-level: duplicate-root rejection makes replayed anchors inert (A1); status-list versions strictly monotonic (S1) so stale updates can't roll back revocations; off-chain challenge signatures are nonce+origin+TTL bound (`integration/wallet/metamask.ts`). | R4 tests (both) |
| R5 | **Front-running / MEV** | Anchor transactions carry no extractable value and are commutative; roots are hashes of salted hashes, so mempool observation leaks nothing. Worst case = ordering delay, not exploitation. No auctions, no swaps, no MEV surface. | Design analysis (TDD §8.7) |
| R6 | **Timestamp dependency** | `block.timestamp` is used only for coarse recording (anchor time) and day-scale key-validity windows. Miner drift (seconds) cannot flip any trust decision; no randomness derived from time. | R13 test |
| R7 | **Merkle second-preimage / proof forgery** | Domain-separated hashing: leaves `0x00`-prefixed, nodes `0x01`-prefixed, sorted-pair internal hashing; odd nodes promoted (never duplicated). Internal nodes cannot be replayed as leaves. | R7 tests ×2; `test/Merkle.test.ts` |
| R8 | **Oracle risks** | No oracles. The only external data dependency is the platform's own off-chain pipeline; the chain records commitments, not asserted facts. Garbage-in is mitigated off-chain (KYB, maker-checker, anomaly detection — documented limitation, TDD §7.10). | N/A by design |
| R9 | **DoS / gas exhaustion** | No unbounded loops in state-changing paths; `anchorRoots` capped at `MAX_ROOTS_PER_TX = 100` (measured ~2.6M gas — comfortable in any block). Per-mapping writes are O(1). Reads used by verification are loop-free except calldata-bounded proof verification. | R9 test with gas assertion |
| R10 | **Signature validation** | On-chain: none needed (role-gated calls; VC signatures verified off-chain against `isKeyValidAt`). Off-chain challenge flow: EIP-191 `verifyMessage` + address equality + nonce/origin/TTL checks; the message text states purpose and grants no session. | Wallet module unit surface; identity-service tests (platform repo) |
| R11 | **Privilege escalation between roles** | Role admin is `DEFAULT_ADMIN_ROLE` only (timelock); the hot `ANCHORER` cannot grant roles, upgrade, pause, or touch the registry. Registrar cannot upgrade. Pauser cannot write data. | R11 test |
| R12 | **Uninitialized implementation / initializer takeover** | Constructors call `_disableInitializers()`; proxies initialized atomically at deploy via OZ plugin; `initializer` modifier prevents re-init. | R12 test |
| R13 | **Delegatecall risks / storage collision** | Delegatecall exists only inside audited OZ UUPS machinery. Storage safety: ERC-7201-era discipline via `__gap` reservations (50 base / 45 children), append-only layout rule, and the OZ upgrades plugin's layout diff run in tests and CI. `upgradeTo` gated by `UPGRADER_ROLE`. | Upgrade test in `test/integration/lifecycle.test.ts`; plugin validation |
| R14 | **Upgrade risks (malicious/buggy upgrade)** | UUPS behind timelock (48 h public notice) + 3-of-5 Safe; invariant: anchored roots and key history are never rewritten (no code path exists; upgrade tests re-assert state). Semantic changes ship as sibling contracts, never in-place rewrites. Emergency `pause()` affects writes only — reads (verification) are architecturally unpausable. | Upgrade test; process in docs/UPGRADES.md |

## SWC registry mapping (relevant entries)

| SWC | Title | Status |
|---|---|---|
| SWC-100/108 | Visibility | All functions/state explicitly scoped; solhint enforced |
| SWC-101 | Integer overflow | 0.8 checked math; bounded `unchecked` counters only (R3) |
| SWC-105/106 | Unprotected write/selfdestruct | No selfdestruct; all writes role-gated (R2) |
| SWC-107 | Reentrancy | No external calls (R1) |
| SWC-114 | Front-running | No value to extract (R5) |
| SWC-115 | tx.origin auth | Never used |
| SWC-116 | Timestamp dependence | Coarse use only (R6) |
| SWC-118 | Incorrect constructor | N/A (initializers + `_disableInitializers`) |
| SWC-119 | Shadowing | Compiler warnings clean after parameter rename |
| SWC-121/122 | Missing/weak signature protection | Nonce+origin+TTL challenge design (R10) |
| SWC-128 | DoS via block gas limit | Bounded batches (R9) |
| SWC-131 | Unused variables | Lint-clean |
| SWC-136 | Unencrypted private data on-chain | **Core design guarantee:** zero PII on-chain; only salted hashes/roots (SRS C-1) |

## OWASP alignment

Smart-contract-adjacent OWASP concerns (A01 access control, A02 crypto failures, A04 insecure design, A08 integrity) are addressed by R2/R7/R14 and the SRS §7.11 platform mapping. The web/API OWASP surface belongs to the platform repo.

## Residual risks & required external steps

1. **Two independent external audits before mainnet** (NFR-SEC-07) — this internal review is a gate, not a substitute.
2. Relayer key compromise: contained (R2) but still an incident — runbook `key-compromise` applies; rotate KMS key + regrant `ANCHORER_ROLE` via governance.
3. Governance capture (Safe 3-of-5): mitigated by hardware wallets + geographic distribution + timelock visibility; monitored by role-change watchers.
4. Off-chain pipeline integrity (correct salts/leaves) is enforced by the platform's tested toolkit (`utils/merkle.ts` parity suite) — keep the parity tests green on any algorithm change.
