# TrustChain — Blockchain Security Audit (PART 8)

| Field | Value |
|---|---|
| Scope | `IssuerRegistry`, `CertificateAnchor`, `RevocationRegistry`, `TrustChainBase`, `MerkleLib` |
| Method | Code review + 54-test suite (incl. security suite `test/security/attacks.test.ts`) + Slither config prepared |
| Compiler | solc 0.8.24, optimizer runs 10000 |
| Standard | SWC Registry, OZ security patterns |
| Verdict | No Critical/High in internal review. **Two external audits are a mainnet prerequisite** (not yet performed). |

## Findings by category (severity · impact · likelihood · mitigation)

| Vector | Severity | Impact | Likelihood | Status / mitigation |
|---|---|---|---|---|
| **Reentrancy** | Info | — | None | No external calls / no value transfer. Guard intentionally omitted (R1). Tested: no `call/send/transfer` in `contracts/`. |
| **Integer overflow/underflow** | Info | — | None | 0.8 checked math; only loop counters `unchecked` (bounded `i<len`). uint40 timestamps valid to ~year 36812. |
| **Access control** | ✅ Mitigated | High if broken | Low | OZ AccessControl deny-by-default; hot ANCHORER role is append-only. `R2`+`R11` tests: 8 mutators reject unprivileged callers; anchorer cannot grant roles/upgrade. |
| **Replay** | ✅ Mitigated | Medium | Low | Duplicate-root revert (idempotent); monotonic status versions; EIP-155 chain-bound txs. `R4` tests prove replayed anchor + stale status update both fail. |
| **Front-running / MEV** | Info | None | None | Anchor txs carry no extractable value; roots are hashes of salted hashes → mempool leaks nothing. |
| **Timestamp dependency** | Info | — | None | Coarse day-scale windows only (R6/R13). |
| **DoS (gas)** | ✅ Mitigated | Medium | Low | `MAX_ROOTS_PER_TX=100`; no unbounded loops in write paths. `R9` test: 100-root batch < 4M gas asserted. |
| **Storage collision (upgrade)** | ✅ Mitigated | Critical if broken | Low | `__gap` reservations (50 base / 45 children), append-only layout, OZ upgrades plugin validates layout in CI. Upgrade-preservation test proves anchors/roles/state survive a UUPS upgrade. |
| **Upgradeability abuse** | ✅ Mitigated | Critical if broken | Low | UUPS gated by UPGRADER_ROLE (timelock 48h + Safe 3-of-5 in prod); `_authorizeUpgrade` role-checked; outsider upgrade reverts (tested). |
| **Merkle second-preimage / proof forgery** | ✅ Mitigated | High | Low | Domain separation (0x00 leaf / 0x01 node), sorted pairs, odd-node promotion. `R7` tests: internal node cannot pose as leaf; reordered/truncated proofs fail. |
| **Initializer takeover** | ✅ Mitigated | High | Low | `_disableInitializers()` in constructors; `R12` test proves bare implementation cannot be initialized. |
| **Oracle risk** | N/A | — | — | No oracles; chain records commitments, not asserted facts (garbage-in mitigated off-chain: KYB, maker-checker). |

## SWC coverage

SWC-100/101/105/106/107/114/115/116/118/119/121/122/128/131/136 — all addressed (mapping in `blockchain/docs/SECURITY.md`). SWC-136 (unencrypted private data on-chain) is the design keystone: **zero PII on-chain**, only salted hashes/roots.

## Gas optimization review

Measured (`blockchain/docs/GAS.md`): `anchorRoot` ~68.6k avg, ~24.8k marginal per batched root, 100-root cap < 2.7M, verification = free `view`. Amortized chain cost per certificate at batch scale is fractions of a hundredth of a cent — four orders of magnitude under the < $0.005 target. Optimizations (12, each documented): Merkle batching, struct packing, custom errors, events-over-storage, calldata params, bounded `unchecked` loops, high optimizer runs.

## Static analysis

Slither config prepared (`qa/security/configs/slither.config.json`) and wired into `qa.yml` via `crytic/slither-action`. Expected result: zero high/medium; the two Info-level design choices (no ReentrancyGuard, timestamp windows) are documented accepted findings. **Mythril** deep symbolic execution and the **two external audits** are scheduled as the mainnet gate.

## Recommendations

1. Execute Slither + Mythril in CI on the frozen contract set; attach output.
2. Commission two independent external audits (hard mainnet gate, NFR-SEC-07).
3. Run the Foundry fuzz/invariant suite in CI (invariants: anchored roots immutable across upgrades, status versions monotonic, pause never blocks reads).
4. Perform the key ceremony (Safe + timelock) and publish verified source at deploy.
