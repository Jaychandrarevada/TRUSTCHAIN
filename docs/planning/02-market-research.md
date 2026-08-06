# 2. Existing Market Research

Research snapshot as of July 2026. Sources include product documentation, standards bodies (W3C, 1EdTech), and government portals (DigiLocker/NAD).

## 2.1 Product-by-Product Analysis

### 2.1.1 DigiLocker + NAD + ABC/APAAR (Government of India)

**What it is:** DigiLocker is India's national document wallet; the National Academic Depository (NAD) is the academic-records repository layered on it; the Academic Bank of Credits (ABC) and APAAR ID tie student identity and credit records together under NEP 2020. As of mid-2026, 110+ crore academic records are digitized, ~2,963 higher-education institutions registered on ABC, 26+ crore APAAR IDs generated.

| Aspect | Assessment |
|---|---|
| Advantages | Massive adoption; free for citizens; legally recognized (IT Act rule 9A); Aadhaar-linked identity; issuer-pushed documents; employer verification APIs |
| Disadvantages | **Not blockchain / not cryptographically independent** — trust depends entirely on the central operator and issuer databases; India-only; verifier must trust DigiLocker uptime and integrity; no selective disclosure; limited international recognition; closed onboarding for private certifiers |
| Missing features | Independent cryptographic verification, revocation transparency, cross-border interop (W3C VC export), analytics for issuers, non-academic credential types, developer-friendly webhooks |
| Improvement opportunity for TrustChain | Be **complementary, not competitive**: push TrustChain-issued credentials into DigiLocker for Indian users while adding chain-anchored, globally verifiable proofs on top |

### 2.1.2 Blockcerts (MIT Media Lab + Learning Machine, open standard)

**What it is:** the original open standard (2016) for blockchain credentials: issuer signs a JSON credential, hashes are Merkle-batched and anchored to Bitcoin or Ethereum; recipients hold certs in the Blockcerts mobile wallet. Now aligned with W3C Verifiable Credentials, Data Integrity, and DIDs.

| Aspect | Assessment |
|---|---|
| Advantages | Open source; chain-agnostic anchoring; Merkle batch model is gas-efficient (TrustChain adopts this); recipient-centric; now W3C-aligned |
| Disadvantages | **Revocation is centralized** (issuer-hosted revocation list URL — dies if issuer's server dies); issuer identity resolution depends on issuer-hosted profiles (same fragility); poor issuer tooling/UX — requires technical staff; no multi-tenant SaaS; no analytics; wallet UX dated; community momentum slowed after Learning Machine's exit |
| Missing features | On-chain revocation, selective disclosure, enterprise APIs, bulk issuance UI, SIS integrations, verifier analytics, SLAs |
| Improvement opportunity | Keep the Merkle-anchor pattern; fix revocation (on-chain status registry), issuer identity (on-chain issuer registry + DID), and wrap it all in a real product |

### 2.1.3 MIT Digital Certificates / MIT digital diplomas

**What it is:** MIT's 2017 pilot issuing digital diplomas via Blockcerts to graduates (with Learning Machine); the precursor project `digital-certificates` came from the Media Lab.

| Aspect | Assessment |
|---|---|
| Advantages | Proved institutional viability and recipient demand; strong brand validation for the whole category |
| Disadvantages | A pilot, not a product; single-institution; inherits all Blockcerts weaknesses; optional add-on to paper (never replaced the system of record) |
| Missing features | Everything an operating platform needs: multi-tenancy, lifecycle management, support, billing |
| Improvement opportunity | Target "system of record" status, not commemorative add-on: integrate with SIS/ERP so the verifiable credential *is* the primary artifact |

### 2.1.4 Learning Machine → Hyland Credentials

**What it is:** the commercial company behind Blockcerts; acquired by Hyland (2020) and productized as Hyland Credentials; subsequently deprioritized/wound down as Hyland refocused on core content services.

| Aspect | Assessment |
|---|---|
| Advantages | First real commercial issuer platform; government deployments (Malta, Bahamas); proved willingness-to-pay |
| Disadvantages | **Cautionary tale:** acquisition killed momentum; customers left with credentials whose issuer-hosted verification infrastructure decayed — demonstrating the danger of issuer/vendor-hosted trust components |
| Missing features (structural lesson) | Vendor-independent survivability: verification must keep working even if the platform vendor disappears |
| Improvement opportunity | **Design for vendor failure:** all data needed to verify (issuer registry, anchors, revocation roots) lives on a public chain + open-standard credential format, so TrustChain credentials outlive TrustChain |

### 2.1.5 Hyperledger-based solutions (Fabric, Indy/Aries/AnonCreds)

**What it is:** permissioned-ledger credential systems — Hyperledger Fabric consortium deployments (e.g., university networks, IBM-backed pilots) and the Indy/Aries/AnonCreds self-sovereign-identity stack (Sovrin, provincial government deployments in Canada).

| Aspect | Assessment |
|---|---|
| Advantages | No gas fees; high throughput; data-privacy-friendly (permissioned); AnonCreds pioneered ZK selective disclosure and predicate proofs; governance frameworks for regulated sectors |
| Disadvantages | **Verifier must join or trust the consortium** — no public verifiability; consortium governance is slow and expensive to bootstrap; Indy/Sovrin ecosystem fragmented (Sovrin foundation instability); AnonCreds historically non-W3C-standard (now converging); ops burden of running peers |
| Missing features | Public anyone-can-verify path; simple SaaS onboarding; cross-consortium interop |
| Improvement opportunity | Take AnonCreds' privacy ideas (selective disclosure, predicates) but anchor trust on a public chain so any verifier on Earth can check a credential with zero membership |

### 2.1.6 Ethereum-based systems (OpenCerts, BCdiploma, EBSI, NFT-cert projects)

**What it is:** OpenCerts (Singapore GovTech — national deployment on Ethereum, Merkle batch anchoring, OpenAttestation framework); BCdiploma (encrypted data on EVM chains); EBSI (EU Blockchain Services Infrastructure — permissioned EVM for diplomas across member states); assorted academic NFT-certificate projects.

| Aspect | Assessment |
|---|---|
| Advantages | OpenCerts proved **national-scale public-chain anchoring works** (all Singapore school-leaving certs); public verifiability; OpenAttestation's document-integrity + selective-redaction model is strong; EBSI shows regulator appetite |
| Disadvantages | Ethereum L1 gas cost and volatility (OpenCerts mitigates by batching, but still); OpenCerts is Singapore-government-scoped, not a SaaS others can buy; BCdiploma's on-chain encrypted data model creates GDPR-erasure tension; NFT-cert projects conflate ownership with attestation (certificates shouldn't be transferable!); EBSI is EU-membership-gated |
| Missing features | Low-cost chain (L2), open SaaS onboarding, revocation UX, holder wallets with selective disclosure, analytics |
| Improvement opportunity | Use an EVM L2 (Polygon PoS) for ~1000× cheaper anchoring; make credentials **non-transferable attestations** (soulbound-style anchors, not NFTs); productize what OpenCerts proved |

## 2.2 Comparative Matrix

| Capability | DigiLocker/NAD | Blockcerts | Hyland Cred. | Hyperledger/Indy | OpenCerts/EVM | **TrustChain (target)** |
|---|---|---|---|---|---|---|
| Public, issuer-independent verification | ✗ | ✔ | ✔ | ✗ | ✔ | ✔ |
| Survives vendor/issuer disappearance | ✗ | Partial | ✗ (proven) | ✗ | ✔ | ✔ |
| On-chain revocation | ✗ | ✗ | ✗ | Partial | Partial | ✔ |
| Selective disclosure / ZK predicates | ✗ | ✗ | ✗ | ✔ | Redaction only | ✔ (SD-JWT/BBS+) |
| W3C VC 2.0 conformance | ✗ | Converging | ✗ | Converging | Partial | ✔ |
| GDPR/DPDP-safe (no PII on chain) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Multi-tenant SaaS with self-serve onboarding | ✗ | ✗ | Was | ✗ | ✗ | ✔ |
| Bulk issuance + SIS/ERP integration | Partial | ✗ | Partial | ✗ | Gov-internal | ✔ |
| Employer/ATS APIs + webhooks | Partial | ✗ | ✗ | ✗ | ✗ | ✔ |
| Issuer & verifier analytics | ✗ | ✗ | ✗ | ✗ | ✗ | ✔ |
| AI fraud detection | ✗ | ✗ | ✗ | ✗ | ✗ | ✔ |
| Cost per credential | Free (tax-funded) | L1 gas | N/A | Infra-heavy | L1 gas | **< $0.005** |
| Legal recognition (India) | ✔ Strong | ✗ | ✗ | ✗ | SG only | Via DigiLocker bridge |

## 2.3 Synthesized Weaknesses of the Field → TrustChain's Improvements

1. **Revocation is the graveyard of v1 systems** (issuer-hosted lists rot). → On-chain revocation registry with Bitstring Status List; revocation check is part of every verification, cryptographically, forever.
2. **Issuer identity is hand-waved** (hosted JSON profiles, email domains). → On-chain Issuer Registry: DIDs bound to accredited institutions, governed with admission/suspension events, plus optional regulator attestation.
3. **Vendor death kills verification.** → All trust primitives on public chain + open formats; a static open-source verifier can validate any TrustChain credential with zero TrustChain servers.
4. **Verifier UX assumed crypto literacy.** → QR/URL verification page; no wallet, no extension, no account.
5. **Issuance was a developer task.** → Registrar-grade UI: CSV/SIS import, template designer, approval workflow, one-click batch anchor.
6. **Privacy: all-or-nothing sharing.** → SD-JWT VC selective disclosure; predicate proofs ("CGPA ≥ X") on roadmap.
7. **Certificates modeled as NFTs (transferable).** → Attestation model: bound to holder DID, non-transferable, revocable.
8. **No business model / no analytics.** → SaaS tiers, per-verification analytics, fraud dashboards, regulator views.
9. **Jurisdiction lock-in.** → Standards-based core + regional bridges (DigiLocker/NAD, EBSI, Open Badges platforms).
10. **Nothing learns from verification traffic.** → AI layer: forgery detection on uploaded legacy documents, anomaly detection on issuance/verification patterns, entity resolution across name variants.

## 2.4 Sources

- [Blockcerts — open standard & standards alignment](https://www.blockcerts.org/guide/standard.html), [Blockcerts introduction](https://www.blockcerts.org/guide/)
- [W3C Verifiable Credentials guide & use cases](https://www.trueoriginal.com/insights/verifiable-credentials-w3c-guide)
- [National Academic Depository (NAD)](https://nad.digilocker.gov.in/), [DigiLocker](https://www.digilocker.gov.in/), [NAD factsheet — PIB](https://www.pib.gov.in/FactsheetDetails.aspx?id=150733&NoteId=150733&ModuleId=16&reg=5&lang=1)
- [Digital India: 110 crore academic records](https://thenewsmill.com/2026/07/digital-india-enables-secure-access-to-over-110-crore-academic-records/), [Tech Observer coverage](https://techobserver.in/news/egov/over-110-crore-academic-records-digitised-as-digital-india-expands-education-platforms-325964/)
- [Role of DigiLocker in NAD — TruScholar](https://www.truscholar.io/blog/role-of-digilocker-in-nad-powering-secure-digital-academic-records-in-india)
- Academic literature: [ShikkhaChain (Bangladesh)](https://arxiv.org/pdf/2508.05334), [security analysis of academic-credential certification protocols](https://arxiv.org/pdf/1910.04622), [lightweight selective disclosure](https://arxiv.org/pdf/2103.07655), [NFT certificate sharing](https://arxiv.org/pdf/2310.20036)
