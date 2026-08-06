# Gas Report & Optimization Notes

Measured with `hardhat-gas-reporter` (solc 0.8.24, optimizer runs=10000). Reproduce with `npm run test:gas`.

## Measured costs (local, representative)

| Operation | Gas | Notes |
|---|---|---|
| `anchorRoot` (single) | ~58.4k min / ~68.6k avg | avg includes non-empty metadataURI event data |
| `anchorRoots` (3 roots) | ~133.4k | ≈ 24.8k marginal per additional root |
| `anchorRoots` (100 roots, cap) | < 2.7M | security test asserts < 4M (R9) |
| `registerIssuer` | ~238k | one-time per institution (2 storage structs + array push) |
| `setIssuerStatus` | ~38.5k | single slot update |
| `updateStatusRoot` | ~70–90k | struct update + string URI |
| `pause` | ~52k | emergency path |
| Deployments | 1.9M–2.9M each | one-time; 3–5% of a 60M block |

**Cost per certificate:** one root commits an entire batch. A 5,000-certificate batch anchored inside a 100-root relayer window costs ~25k gas → at Polygon fees (~30 gwei, POL ≈ $0.40) that is **≈ $0.0003 per batch → ~$0.00000006 per certificate** — four orders of magnitude under the < $0.005 target (NFR-BC-01). Even Ethereum Sepolia/mainnet pricing keeps batches affordable, which is why the same contracts run unmodified on both families.

## Optimizations applied (each explained)

| # | Optimization | Where | Why it matters |
|---|---|---|---|
| O1 | **Merkle batching** | architecture | The dominant win: chain cost is O(1) per batch, independent of certificate count. Everything else is noise by comparison |
| O2 | **Struct packing** | `AnchorRecord` (uint64+uint40+uint8 = 112 bits → 1 slot); `Issuer` header fields share a slot; `KeyRecord` packs 3×uint40+enum | Each avoided slot saves 20k gas on first write |
| O3 | **Multi-root batching** | `anchorRoots` (≤100) | Amortizes the 21k tx base + calldata overhead across roots (68.6k solo → ~24.8k marginal) |
| O4 | **Custom errors** | everywhere (`error X()` vs revert strings) | ~50–200 gas per revert + smaller bytecode; enforced by solhint `gas-custom-errors` |
| O5 | **Events over storage** | `metadataURI` in `RootAnchored`; key-history detail via events/subgraph | Event data ≈ 8 gas/byte vs 20k/slot; history readers use the indexer, not storage |
| O6 | **`unchecked` loop counters** | `anchorRoots`, `MerkleLib.verifyProof` | Safe (bounded by `i < len`); saves ~60 gas/iteration of overflow checking |
| O7 | **`calldata` over `memory`** | all external array/string params | Avoids copying into memory (~3 gas/word + expansion costs) |
| O8 | **Constants over storage** | `MAX_ROOTS_PER_TX`, role hashes (`constant`) | Inlined at compile time — zero SLOADs. No `immutable` vars: UUPS implementations must hold no constructor-set state |
| O9 | **Mappings over arrays** | `_anchors`, `_lists`, `_keyIndex` (+1 sentinel trick avoids an existence flag slot) | O(1) access, no iteration, no length bookkeeping |
| O10 | **Sorted-pair Merkle** | `MerkleLib` | Proofs carry no left/right position bits → smaller calldata for verifiers |
| O11 | **High optimizer runs (10k)** | `hardhat.config.ts` | Anchoring is called thousands of times; runtime gas is worth larger deploy bytecode |
| O12 | **View-based verification** | `verifyCertificate` is `view` | The entire verification hot path costs ZERO gas — reads are free via RPC |

## Regression discipline

`npm run test:gas` in CI; treat >5% regression on `anchorRoot`/`anchorRoots` as a build failure (mirrors NFR-BC-03). Contract size checked via `npm run size` (all implementations < 24 KB Spurious Dragon limit with wide margin).
