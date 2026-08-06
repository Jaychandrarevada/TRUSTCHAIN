# 9. Technology Comparison — Blockchain Platform

## 9.1 Evaluation Criteria

Weighted for TrustChain's workload: **low-frequency writes (batched Merkle roots), very high-frequency reads, public verifiability as the product's core promise, and cost invisibility to non-crypto customers.**

| Criterion | Weight | Why it matters here |
|---|---|---|
| Public verifiability (anyone, no membership) | 25% | The product promise — verification must not require trusting us or joining anything |
| Transaction cost & predictability | 20% | Anchoring must cost < $0.01/batch sustainably; spikes can't break unit economics |
| Ecosystem & tooling maturity (EVM, audits, indexers) | 15% | Solidity auditors, OpenZeppelin, The Graph, wallets — de-risks delivery |
| Longevity / institutional credibility | 15% | Certificates live 50+ years; chain must plausibly outlive vendors |
| Finality & throughput | 10% | Batching makes raw TPS mostly irrelevant; finality time affects UX |
| Decentralization / censorship resistance | 10% | Trust anchor should not be controlled by few parties |
| Regulatory acceptability (India/EU) | 5% | Anchoring hashes (no PII) is low-risk everywhere, but perception matters |

## 9.2 Candidate Analysis

### Ethereum (L1)
- **Pros:** strongest decentralization, credibility, and longevity of any smart-contract chain; deepest audit/tooling ecosystem; the reference EVM.
- **Cons:** gas cost volatile — an anchor tx can swing $0.50–$50; overkill finality cost for hash anchoring; would force wider batching windows (worse issuance latency).
- **Verdict:** ideal *trust ceiling*, wrong *cost floor* as primary chain. Retained as optional secondary notarization target for premium tenants (multi-chain adapter, FR-BC-010).

### Polygon PoS
- **Pros:** full EVM equivalence (all Ethereum tooling, auditors, OpenZeppelin, The Graph work as-is); fees consistently fractions of a cent; ~2 s blocks, minutes to strong finality (Heimdall checkpoints to Ethereum add an Ethereum-anchored security narrative); massive production adoption incl. government/enterprise pilots (e.g., Maharashtra caste-certificate issuance precedent in India — direct regulatory relevance); reliable RPC vendor ecosystem.
- **Cons:** validator set smaller than Ethereum's (decentralization trade-off); POL token/chain governance evolution (Polygon 2.0) requires monitoring; reorgs historically possible pre-checkpoint → we designed reorg handling (FR-BC-007).
- **Verdict:** best fit — public, cheap, EVM-standard, credible in our primary market.

### Hyperledger (Fabric / Indy)
- **Pros:** no gas; high throughput; permissioned privacy; AnonCreds ZK heritage; consortium governance suits regulated sectors.
- **Cons:** **fails the core criterion** — verification requires trusting/joining the consortium, recreating the centralized-trust problem TrustChain exists to solve; bootstrapping a consortium is slow and expensive; ops burden of running peers; ecosystem momentum has shifted toward public-chain + W3C VC hybrids.
- **Verdict:** rejected as trust anchor. Its best ideas (selective disclosure, predicates) are adopted at the credential layer (SD-JWT/BBS+) instead. A Fabric-based private deployment remains a possible future enterprise SKU.

### Solana
- **Pros:** very high throughput, sub-second finality, low fees.
- **Cons:** non-EVM (Rust/Anchor — separate audit ecosystem, no OpenZeppelin equivalents at same maturity); historical network outages are toxic for a "your certificate is always verifiable" promise; batching erases its throughput advantage for our workload; weaker enterprise/government presence in our target markets.
- **Verdict:** rejected — throughput solves a problem we don't have, at the cost of tooling and reliability narrative.

### Avalanche
- **Pros:** EVM-compatible C-Chain; fast finality (~1–2 s); subnets could offer a dedicated compliance-tailored chain later.
- **Cons:** fees higher than Polygon (though low); smaller credential/identity ecosystem; subnets reintroduce consortium-style bootstrap costs; less recognition among Indian public-sector stakeholders.
- **Verdict:** solid runner-up; no advantage that outweighs Polygon's ecosystem head start for this use case.

## 9.3 Scorecard

| Criterion (weight) | Ethereum | **Polygon PoS** | Hyperledger | Solana | Avalanche |
|---|---|---|---|---|---|
| Public verifiability (25) | 25 | 24 | 5 | 22 | 22 |
| Cost & predictability (20) | 6 | 19 | 20 | 18 | 16 |
| Ecosystem & tooling (15) | 15 | 14 | 8 | 9 | 11 |
| Longevity & credibility (15) | 15 | 12 | 9 | 9 | 9 |
| Finality & throughput (10) | 6 | 8 | 9 | 9 | 9 |
| Decentralization (10) | 10 | 7 | 3 | 6 | 6 |
| Regulatory acceptability (5) | 4 | 5 | 5 | 3 | 3 |
| **Total (100)** | **81** | **89** | **59** | **76** | **76** |

## 9.4 Decision

**Primary chain: Polygon PoS.** Amoy testnet for sandbox/staging; mainnet for production.

**Why, in one paragraph:** TrustChain's chain workload is a few hundred tiny writes per day (Merkle roots, status roots, registry events) and millions of reads. What matters is that *anyone on Earth can verify without permission, forever, for near-zero cost, with tooling our auditors and hires already know*. Polygon PoS is the only candidate scoring high on all four simultaneously: public EVM chain, sub-cent fees, checkpointed to Ethereum for a credible security story, with proven Indian government-adjacent deployments that ease regulator conversations. Ethereum L1 is more credible but 1000× more expensive per anchor with volatile spikes; Hyperledger sacrifices the public-verifiability promise entirely; Solana and Avalanche trade away EVM tooling/ecosystem maturity for throughput we cannot use.

**Hedges built into the architecture:**
1. **Chain-adapter abstraction (FR-BC-010):** anchoring targets are pluggable; migrating or adding chains (Ethereum L1 notarization, an L2 like Base/Arbitrum, or Polygon zkEVM successors) is a config + adapter, not a rewrite.
2. **Standards-layer independence:** credentials are W3C VCs whose proofs reference chain anchors generically — the credential format survives a chain migration.
3. **Reorg/finality state machine (FR-BC-006/007)** neutralizes Polygon's pre-checkpoint reorg risk.
4. **Quarterly chain-health review** (fees, decentralization metrics, governance changes) with a documented migration playbook as the exit strategy.
