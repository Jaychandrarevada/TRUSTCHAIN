# 15. Blockchain Planning

Design maxim: **the chain stores trust, not data.** Three small contracts, tiny writes, no PII, no tokens. Everything else lives off-chain and proves itself against these anchors.

## 15.1 Smart Contracts

### 15.1.1 `IssuerRegistry` (UUPS proxy)

Authoritative on-chain list of accredited issuers and their signing-key history.

| Function | Access | Behavior |
|---|---|---|
| `registerIssuer(issuerId, did, keyHash, metadataURI)` | REGISTRAR_ROLE (platform multisig-gated) | Adds issuer; emits event |
| `rotateKey(issuerId, newKeyHash, validFrom)` | REGISTRAR_ROLE or issuer's delegate key | Old key gets `validUntil`; overlap window supported |
| `revokeKey(issuerId, keyHash, compromisedAt)` | REGISTRAR_ROLE | Emergency: marks compromise timestamp (UC-12) |
| `setIssuerStatus(issuerId, status)` | REGISTRAR_ROLE / REGULATOR_ROLE | active / suspended / retired |
| `attestIssuer(issuerId, attestorRef)` | REGULATOR_ROLE | Optional regulator endorsement (US-G-006) |
| Views: `getIssuer`, `isKeyValidAt(issuerId, keyHash, timestamp)` | public | Verifier hot path — key validity at signing time |

### 15.1.2 `CertificateAnchor` (UUPS proxy)

Merkle-root anchoring for issuance batches (and audit-log day roots).

| Function | Access | Behavior |
|---|---|---|
| `anchorRoot(root, issuerId, batchRef, anchorType)` | ANCHORER_ROLE (relayer) | Stores root → {issuerId, timestamp, type}; **rejects duplicate root** (idempotency backstop, FR-BC-005) |
| `anchorRoots(bytes32[] roots, ...)` | ANCHORER_ROLE | Multi-root batching — one tx, many tenants' batches |
| Views: `getAnchor(root)`, `isAnchored(root)` | public | Verification path |

No per-certificate writes ever — a 50,000-certificate batch is exactly one 32-byte root.

### 15.1.3 `RevocationRegistry` (UUPS proxy)

On-chain commitment to W3C Bitstring Status Lists.

| Function | Access | Behavior |
|---|---|---|
| `updateStatusRoot(issuerId, listId, root, listURI)` | ANCHORER_ROLE | New status-list snapshot root; monotonically versioned |
| `getStatusRoot(issuerId, listId)` | public | Latest root + version + timestamp |

Verifiers fetch the bitstring (S3/IPFS via `listURI`), check the credential's `statusListIndex` bit, and verify the list hashes to the anchored root — revocation checking that survives issuer *and* platform death.

### Shared infrastructure
- `AccessControl` (OpenZeppelin roles: DEFAULT_ADMIN → timelock+multisig, REGISTRAR, ANCHORER, REGULATOR, PAUSER).
- `Pausable` on all write paths (US-A-016) — pause halts writes, never reads.
- `MerkleLib` — domain-separated hashing (`leaf = H(0x00 ‖ salt ‖ certHash)`, `node = H(0x01 ‖ L ‖ R)`) to kill second-preimage/ambiguity attacks (RT-07); sorted-pair verification.

## 15.2 Events

| Event | Emitted by | Consumers |
|---|---|---|
| `IssuerRegistered(issuerId, did, keyHash, metadataURI)` | IssuerRegistry | Subgraph, internal indexer, OSS verifier |
| `KeyRotated(issuerId, oldKeyHash, newKeyHash, validFrom)` | IssuerRegistry | Key-history resolution |
| `KeyRevoked(issuerId, keyHash, compromisedAt)` | IssuerRegistry | Emergency verification warnings |
| `IssuerStatusChanged(issuerId, status)` | IssuerRegistry | SUSPENDED ISSUER verdicts |
| `IssuerAttested(issuerId, attestor)` | IssuerRegistry | Regulator badge |
| `RootAnchored(root, issuerId, batchRef, anchorType, timestamp)` | CertificateAnchor | Batch status flip → ANCHORED; subgraph |
| `StatusRootUpdated(issuerId, listId, root, version, listURI)` | RevocationRegistry | Revocation propagation (≤ 5 min SLA) |
| `Paused/Unpaused(actor)` | all | Ops alerting |

Indexing: The Graph subgraph (public, FR-BC-011) + internal Postgres indexer (verification hot path, populated by a listener with confirmation-depth logic).

## 15.3 Transaction Design

| Tx type | Frequency | Payload | Est. gas |
|---|---|---|---|
| `anchorRoots` (multi-batch) | Every ≤10 min window when queue non-empty | N×32-byte roots | ~50k + ~25k/root |
| `updateStatusRoot` | On revocation events (coalesced ≤5 min) | 32-byte root + URI | ~60k |
| Registry ops | Rare (onboarding/rotation) | Small | ~100k |
| Audit-log day root | 1/day | 32 bytes | ~75k |

**Cost model:** at Polygon PoS typical gas prices, total chain spend ≈ **tens of dollars per month even at 1M certs/year** → amortized < $0.001/cert (beats KPI < $0.005 with margin). Relayer strategy: EIP-1559 with fee oracle, per-tx cap, alert on cap-hit (FR-BC-008); nonce management with gap detection; stuck-tx replacement (speed-up) policy.

**Finality state machine (FR-BC-006/007):** `queued → submitted → confirmed (N blocks) → finalized (Heimdall checkpoint observed)`; reorg watcher compares stored block hashes → auto-resubmit on orphaned anchor. Verification treats `confirmed` as VALID-with-note, `finalized` as fully VALID.

## 15.4 Gas Optimization

1. **Merkle batching** — the dominant optimization: unbounded certs per 32-byte root.
2. **Multi-root anchoring** — one tx serves many tenants per window; amortizes 21k base cost.
3. **Storage-minimal layout** — mapping `root ⇒ packed struct {issuerId: uint64, timestamp: uint40, anchorType: uint8}`; single slot per anchor.
4. **Events over storage** where history suffices (key rotation details live in events + subgraph; contract keeps only current validity data needed for on-chain reads).
5. **Custom errors** instead of require strings; `calldata` params; unchecked counters where safe.
6. **No loops over unbounded arrays** in state-changing paths; `anchorRoots` bounded (≤ 100 roots/tx).
7. **Gas snapshots in CI** (Foundry `forge snapshot`) — regression gate on every contract PR.

## 15.5 Security

| Control | Detail |
|---|---|
| Minimal attack surface | ~3 contracts, no value transfer, no user funds, no tokens — nothing to drain; worst case is trust-signal corruption, mitigated below |
| Audits | 2 independent firms pre-mainnet (NFR-SEC-07); re-audit on any upgrade touching verification semantics |
| Testing | Foundry unit + fuzz + invariant suites (e.g., *anchored root can never change*, *key validity intervals never overlap ambiguously*); Slither + Echidna in CI; ≥90% branch coverage |
| Access control | All admin roles behind Gnosis Safe multisig (3-of-5) + 48 h TimelockController; ANCHORER is the only hot role and can only *add* data, never modify |
| Relayer key | AWS KMS secp256k1, non-exportable; low balance by policy (top-up runbook); compromise impact = spam anchors only (roots carry no authority without matching issuer-signed VCs) — RT-05 |
| Issuer keys | Off-chain in KMS/HSM; on-chain registry only holds key *hashes* and validity windows; compromise handled by `revokeKey` with timestamp fencing |
| Input validation | Root ≠ 0, duplicate-root rejection, issuerId existence checks, monotonic status-list versions |
| Monitoring | Forta-style/custom watchers on unexpected role changes, pause events, anomalous anchor volume |
| Verified source | Sourcify + Polygonscan verification in deploy pipeline; addresses published (FR-BC-015) |

**Threat note — what the chain does *not* protect against:** a legitimate issuer signing fraudulent content (garbage-in). That is mitigated off-chain: KYB (RS-01), maker-checker (ISS-006), anomaly detection (AI-002), regulator suspension (registry status). The contract layer guarantees *integrity and provenance*, not *truth* — documented explicitly in verifier-facing language.

## 15.6 Upgradeability

- **Pattern:** UUPS proxies (OpenZeppelin) — upgrade logic in implementation, gated by `onlyRole(UPGRADER_ROLE)` held by the timelock+multisig.
- **Process:** proposal → 48 h timelock (public notice on status page) → multisig execution → post-upgrade invariant test-run on fork → monitoring window. Storage-layout safety checked by OpenZeppelin upgrades plugin in CI.
- **Philosophy:** anchors are append-only facts; upgrades may extend behavior but an upgrade that could rewrite historical anchors is prohibited by invariant tests and audit scope. If semantics must change (e.g., new hash algorithm), deploy a **versioned sibling contract** (`CertificateAnchorV2`) and dual-read in verifiers — old anchors remain verifiable against old code forever.
- **Escape hatch:** chain-adapter abstraction (FR-BC-010) treats the whole contract set as a pluggable target; migration playbook = deploy on new chain, re-anchor active status roots, dual-verify window, deprecate.

## 15.7 What Goes On-Chain vs Off-Chain (final word)

| On-chain (Polygon PoS) | Off-chain |
|---|---|
| Merkle roots of cert-hash batches | Certificates, VC documents, artifacts (Postgres/S3/IPFS) |
| Issuer DIDs + key hashes + validity/status | Issuer PII, KYB documents |
| Status-list roots (revocation/suspension) | Bitstring files, reason codes |
| Audit-log day roots | Audit logs themselves |
| Regulator attestations | Everything about holders — **zero holder data on-chain, ever** (NFR-SEC-04) |
