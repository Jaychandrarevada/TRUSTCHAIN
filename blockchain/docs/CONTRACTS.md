# Smart Contract Documentation

Authoritative reference for the deployed suite. Full architectural rationale: [TDD §7](../../docs/architecture/TRUSTCHAIN-TDD.md).

## Suite overview & requirement mapping

| Contract | Answers | Realizes (requested names) |
|---|---|---|
| `IssuerRegistry` | "Is this issuer real, accredited, and was this key valid at signing time?" | InstitutionRegistry (register/verify/suspend/remove) |
| `CertificateAnchor` | "Did this exact content exist, committed by this issuer, at time T?" | CertificateRegistry (issue/hash/metadata/lookup/verify) + AuditContract (`AnchorType.AuditLog`) + CertificateVerifier (`verifyCertificate` view) |
| `RevocationRegistry` | "Is it STILL valid?" | CertificateRevocation (revoke/restore-suspension/history) |
| `TrustChainBase` (abstract) | governance plumbing | AccessControl + Ownership (role model) + EmergencyPause |

Certificate **ownership** is deliberately off-chain: credentials are non-transferable attestations bound to a holder DID inside the signed VC (BR-07). There is no on-chain owner to transfer — `OwnershipTransferred` therefore exists only in its governance sense (role grants via AccessControl).

## Roles

| Role | Production holder | Powers |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | TimelockController (48 h) ← Gnosis Safe 3-of-5 | grant/revoke all roles |
| `UPGRADER_ROLE` | Timelock | UUPS upgrades |
| `PAUSER_ROLE` | Safe (fast path) | pause/unpause writes |
| `REGISTRAR_ROLE` | Registrar service (KMS) | issuer admission, key lifecycle, status, metadata |
| `ANCHORER_ROLE` | Relayer service (KMS, hot) | append-only anchoring + status roots |
| `REGULATOR_ROLE` | Regulator multisig (optional) | attest, suspend/reactivate issuers |

## Event catalog (with requested-name mapping)

| Event | Emitted by | Maps to requested event |
|---|---|---|
| `IssuerRegistered(issuerId, didHash, keyHash, metadataURI)` | IssuerRegistry | InstitutionRegistered |
| `IssuerAttested(issuerId, attestor, attestorRef)` | IssuerRegistry | InstitutionVerified |
| `IssuerStatusChanged(issuerId, status)` | IssuerRegistry | Institution suspend/remove |
| `KeyRotated / KeyRevoked` | IssuerRegistry | — (key lifecycle, UC-12) |
| `IssuerMetadataUpdated` | IssuerRegistry | — |
| `RootAnchored(root, issuerId, batchRef, anchorType, timestamp, metadataURI)` | CertificateAnchor | CertificateIssued (batch granularity) + audit events (`AuditLog` type) |
| `StatusRootUpdated(issuerId, listId, root, version, listURI)` | RevocationRegistry | CertificateRevoked (list granularity — per-cert detail = list diff) |
| `RoleGranted / RoleRevoked` (OZ) | all | RoleGranted / RoleRevoked / OwnershipTransferred |
| `Paused / Unpaused` (OZ) | all | SystemPaused / SystemResumed |
| `Upgraded(implementation)` (ERC-1967) | all proxies | — (upgrade trail) |
| *CertificateVerified* | **not on-chain by design** | verification is a free `view` call; verification *events* are recorded off-chain (platform `verifications` table) — emitting per-verification on-chain would cost gas per read and leak verifier behavior |
| *WalletConnected* | **off-chain** | wallet linking is an application event (identity service audit log), not a chain event |

## Storage layout (upgrade-critical)

Documented per contract in NatSpec; rules: append-only layout, `__gap[50]` in base / `__gap[45]` in children, OZ upgrades plugin layout validation in tests and CI, semantic changes → sibling contracts. See [UPGRADES.md](UPGRADES.md).

## Verification data flow

```
verdict = anchored(root)                       — CertificateAnchor.isAnchored / getAnchor
        ∧ merkleProof(leaf ∈ root)             — verifyCertificate view or OSS verifier
        ∧ issuerActive/known(issuerId)         — IssuerRegistry.getIssuer
        ∧ keyValidAt(signingTime)              — IssuerRegistry.isKeyValidAt
        ∧ ¬revoked(bit in status list)         — RevocationRegistry.getStatusList + bitstring fetch
        ∧ ¬expired (off-chain field)
```

All inputs are public — any third party can reconstruct every verdict with zero TrustChain infrastructure (vendor-independence guarantee, NFR-AVL-07).
