# TrustChain — Blockchain Layer

Production Hardhat project implementing the TrustChain trust layer per the approved architecture ([TDD §7–8](../docs/architecture/TRUSTCHAIN-TDD.md)): an on-chain issuer registry, Merkle-batched certificate anchoring, and revocation status lists — **UUPS-upgradeable, role-governed, pausable (writes only), with zero PII ever touching the chain.**

```
issue (off-chain, signed VCs) ──► Merkle root ──► CertificateAnchor      ┐
issuer admission (post-KYB)  ────────────────► IssuerRegistry           ├─► public, vendor-
revocation bitstrings        ────────────────► RevocationRegistry       ┘   independent verification
```

## Requested-name mapping

This repo implements the requirement set exactly, through the audited 3-contract surface the architecture approved:

| Requested | Implemented as | Where |
|---|---|---|
| InstitutionRegistry | `IssuerRegistry` | `contracts/IssuerRegistry.sol` |
| CertificateRegistry + CertificateVerifier | `CertificateAnchor` (+ `verifyCertificate` view) | `contracts/CertificateAnchor.sol` |
| CertificateRevocation | `RevocationRegistry` | `contracts/RevocationRegistry.sol` |
| AccessControl / Ownership / EmergencyPause | `TrustChainBase` (OZ AccessControl + Pausable + UUPS) | `contracts/base/TrustChainBase.sol` |
| AuditContract | `AnchorType.AuditLog` anchors (daily audit-log roots) | `CertificateAnchor` |

Why not per-certificate on-chain records or NFTs: certificates are non-transferable attestations; Merkle batching anchors unbounded batches for ~25k gas and keeps every byte of PII off-chain (SRS C-1, BR-07). See [docs/CONTRACTS.md](docs/CONTRACTS.md).

## Repository layout

```
blockchain/
├── contracts/
│   ├── base/TrustChainBase.sol        # roles, pause, UUPS gate, storage gap
│   ├── IssuerRegistry.sol             # institutions + signing-key history
│   ├── CertificateAnchor.sol          # Merkle anchors (issuance/status/audit)
│   ├── RevocationRegistry.sol         # bitstring status-list roots (monotonic)
│   ├── interfaces/                    # I* interfaces (types, events, errors)
│   ├── libraries/MerkleLib.sol        # domain-separated proof verification
│   └── mocks/IssuerRegistryV2Mock.sol # upgrade-path test double
├── scripts/                           # deploy.ts · verify.ts · upgrade.ts · seed.ts
├── test/                              # 54 tests: unit / integration / security / merkle
├── utils/merkle.ts                    # off-chain tree builder (parity-tested vs Solidity)
├── integration/
│   ├── wallet/metamask.ts             # EIP-1193 connect/sign/verify (scoped: DID-link + ops)
│   └── ipfs/pinata.ts                 # manifest/artifact pinning + gateway failover
├── docs/                              # CONTRACTS · SECURITY · GAS · DEPLOYMENT · UPGRADES ·
│                                      # INTEGRATION-API · TROUBLESHOOTING
├── deployments/                       # per-network address records (committed)
└── hardhat.config.ts · package.json · .env.example
```

## Quick start

```bash
npm install
npm run build          # compile + typechain
npm test               # 54 tests (unit, integration, security, upgrade)
npm run test:gas       # with gas report
npm run coverage       # solidity-coverage

# local end-to-end
npm run node:local     # terminal 1
npm run deploy:local   # terminal 2 — three UUPS proxies
npm run seed:local     # demo issuer + anchored 10-cert batch + evidence file
```

Testnets/mainnet: see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Supported networks: **Sepolia (11155111)**, **Polygon Amoy (80002)**, **Polygon PoS (137)**, local (31337).

## Security model (summary)

- **Roles:** timelock(48 h)←Safe(3-of-5) holds admin/upgrades; hot relayer key holds *only* append-only `ANCHORER_ROLE` — compromise can spam anchors, never forge certificates (authority lives in issuer VC signatures checked against `isKeyValidAt`).
- **Invariants (tested):** roots anchor exactly once and are never mutated; key history append-only with compromise fencing; status-list versions strictly monotonic; `Retired` is terminal; reads (verification) are architecturally unpausable.
- **Hashing:** `leaf = keccak256(0x00‖salt‖sha256(JCS(cert)))`, sorted-pair `0x01` nodes — second-preimage-safe; destroying a salt = GDPR/DPDP erasure without touching the chain.
- Full review incl. SWC mapping: [docs/SECURITY.md](docs/SECURITY.md). External audits ×2 are a mainnet gate.

## Gas (measured)

`anchorRoot` ~68.6k avg · multi-root marginal ~24.8k · 100-root cap < 2.7M · verification = free `view`. Per-certificate chain cost at batch scale: **fractions of a hundredth of a cent** — see [docs/GAS.md](docs/GAS.md).

## Status

✅ 54/54 tests passing · compiles clean (solc 0.8.24, optimizer 10k runs) · deploy/verify/upgrade/seed scripts operational · internal security review documented · **pending before mainnet:** external audits ×2, key ceremony, subgraph deployment.
