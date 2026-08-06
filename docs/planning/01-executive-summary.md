# 1. Executive Summary

## 1.1 Problem

Academic and professional certificate fraud is a global, growing problem:

- **Forgery is trivial.** Paper certificates and PDF scans are easily forged with commodity editing tools; diploma mills sell fake degrees at industrial scale (estimated multi-billion-dollar industry).
- **Verification is slow and manual.** Employers and universities verify credentials by emailing registrars or paying background-check vendors; turnaround is days to weeks and costs $10–$100+ per check.
- **Issuers bear a permanent support burden.** Institutions answer verification requests forever, with no revenue attached.
- **Existing digital systems are centralized.** Repositories like DigiLocker/NAD are trustworthy but depend on a single operator, are jurisdiction-locked, and offer no cryptographic proof independent of the operator.
- **Existing blockchain systems stalled.** Blockcerts and first-generation Ethereum systems proved the concept but failed on issuer UX, revocation, selective disclosure, cost, and enterprise integration (see [02-market-research.md](02-market-research.md)).
- **Students don't own their records.** Credentials live in institutional silos; graduates cannot present a portable, instantly verifiable record across borders.

## 1.2 Solution

**TrustChain** — a multi-tenant SaaS platform for issuing, holding, verifying, and revoking digital certificates with blockchain-backed integrity.

Core design decisions:

1. **Standards-first:** every certificate is a W3C Verifiable Credential (VC 2.0) and Open Badges 3.0 compatible — portable beyond TrustChain itself.
2. **Hybrid architecture:** rich data and PII stay off-chain (encrypted PostgreSQL + IPFS for artifacts); only salted hashes and Merkle roots go on-chain. This resolves the GDPR/DPDP "right to erasure vs. immutability" conflict.
3. **Batch anchoring on Polygon PoS:** thousands of certificates anchor in one transaction (~$0.001–0.01 per batch), giving public, issuer-independent verifiability at negligible cost.
4. **On-chain issuer registry and revocation registry:** verifiers never need to contact the issuer; revocation is checked cryptographically (Bitstring Status List + on-chain root).
5. **3-second verification:** QR code / URL / API — no wallet, no crypto knowledge required from the verifier.
6. **Enterprise-grade platform:** multi-tenancy, RBAC, SSO, bulk issuance, webhooks, REST/GraphQL APIs, ATS/HRMS connectors, analytics, SLAs, and audit trails.
7. **Ecosystem interoperability:** connectors for DigiLocker/NAD/APAAR (India), EBSI (EU), and generic OIDC4VC exchange.

## 1.3 Target Users

| Segment | Description | Primary Need |
|---|---|---|
| Universities & colleges | Degree/diploma/marksheet issuers | Cut verification workload, prevent forgery, NEP-2020/NAD compliance |
| EdTech & certification bodies | MOOCs, bootcamps, professional certifiers (cloud, finance, medical CPD) | Branded, verifiable micro-credentials at scale |
| Students & alumni (holders) | Credential owners | Portable lifelong wallet, instant sharing, privacy control |
| Employers & background-check firms | Verifiers at hiring scale | Instant, cheap, legally reliable verification; ATS integration |
| Government & regulators | Education ministries, accreditation bodies | Registry oversight, fraud analytics, policy compliance |
| Training departments (enterprise L&D) | Internal certification programs | Compliance training records with audit-proof integrity |

## 1.4 Value Proposition

- **For issuers:** reduce verification support cost ~90%; one-click bulk issuance from existing SIS/ERP; anti-forgery brand protection; compliance reporting.
- **For holders:** free, lifelong, portable wallet; share a link/QR instead of couriering transcripts; selective disclosure (prove "has B.Tech CSE, CGPA ≥ 8" without exposing full marksheet).
- **For verifiers:** verification in seconds for ~$0 instead of days for $30+; cryptographic certainty instead of institutional goodwill; bulk/API verification inside existing hiring tools.
- **For regulators:** real-time visibility into issuance patterns, fraud signals, and institutional compliance.

**Positioning statement:** *For institutions and employers who cannot afford credential fraud, TrustChain is a certificate lifecycle platform that makes every credential instantly and independently verifiable — unlike centralized repositories that require trusting one operator, or first-generation blockchain tools that ignored revocation, privacy, and enterprise integration.*

## 1.5 Goals

| # | Goal | Horizon |
|---|---|---|
| G1 | Launch production platform with issuance, anchoring, verification, revocation on Polygon mainnet | Month 3 (end of Sprint 6) |
| G2 | Onboard 10 pilot institutions and issue 100,000 certificates in year 1 | Month 12 |
| G3 | Sub-3-second public verification with zero verifier onboarding | Launch |
| G4 | Full W3C VC 2.0 + Open Badges 3.0 conformance; pass external interop test suite | Month 6 |
| G5 | Zero PII on-chain; GDPR/DPDP-compliant erasure workflow | Launch |
| G6 | External smart-contract audit with no unresolved critical/high findings | Before mainnet |
| G7 | Enterprise readiness: SSO, RBAC, API, webhooks, 99.9% uptime SLA | Month 6 |
| G8 | DigiLocker/NAD issuer integration for Indian institutions | Month 9 |

## 1.6 Non-Goals

- **Not a cryptocurrency product.** No token, no ICO, no user-facing crypto wallets or gas payments; the chain is invisible infrastructure.
- **Not a learning platform.** No course delivery, assessment, or proctoring.
- **Not an identity provider for the general public.** We consume DIDs/SSO; we do not run a national ID scheme.
- **Not a background-check bureau.** We verify credentials we can cryptographically prove; we do not investigate employment history or references.
- **Not on-chain document storage.** Certificate images/PDFs never go on-chain; only hashes do.
- **Not a permissioned consortium chain operator** (phase 1). We anchor to a public chain; a private-ledger deployment option is a future enterprise feature.

## 1.7 KPIs

| KPI | Definition | Target (Y1) |
|---|---|---|
| Certificates issued | Total credentials anchored | 100,000 |
| Active issuing institutions | Issued ≥1 batch in last 90 days | 10 |
| Verifications performed | Public + API verifications | 250,000 |
| Verification latency (p95) | QR scan → verdict rendered | < 3 s |
| Issuance batch success rate | Batches anchored without manual retry | ≥ 99.5% |
| Platform uptime | Verification path availability | 99.9% |
| Cost per certificate (chain) | Amortized gas per credential | < $0.005 |
| Time-to-first-issuance | Institution signup → first live certificate | < 5 business days |
| API adoption | % verifications via API/webhook vs manual | ≥ 40% by Y1 end |
| Fraud catches | Forged/tampered documents flagged by AI + hash mismatch | Tracked, reported quarterly |
| NPS (issuer admins) | Quarterly survey | ≥ 45 |
| Security posture | Unresolved critical/high vulns in prod | 0 |

## 1.8 Success Metrics (how we judge the launch)

1. **Adoption:** ≥ 10 institutions live, ≥ 3 paying enterprise tiers by month 12.
2. **Trust:** ≥ 1 government/regulator pilot or DigiLocker integration accepted.
3. **Reliability:** no verification-path outage > 5 min after GA; anchoring backlog never > 1 hour.
4. **Security:** clean external audit; zero on-chain PII incidents; zero credential-forgery incidents attributable to platform flaws.
5. **Economics:** blended infrastructure + gas cost < $0.05 per certificate lifecycle; gross margin path to 80%+ on SaaS tiers.
6. **Interoperability:** TrustChain credentials verify successfully in ≥ 2 third-party W3C VC verifier implementations.
