# 10. Risk Analysis

Risk register format: Likelihood (L) and Impact (I) on 1–5; Score = L×I; owner; mitigation; contingency. Reviewed monthly; scores ≥ 12 tracked at leadership level.

## 10.1 Technical Risks

| ID | Risk | L | I | Score | Mitigation | Contingency |
|---|---|---|---|---|---|---|
| RT-01 | Smart-contract bug in registry/anchor/revocation contracts | 2 | 5 | 10 | Two independent audits, ≥90% branch coverage, fuzz/invariant tests, minimal contract surface (hash storage only), timelocked UUPS upgrades | Emergency pause; upgrade via multisig; re-anchor affected roots; disclosure protocol |
| RT-02 | Polygon reorg invalidates recent anchors | 3 | 3 | 9 | Finality state machine (pending→confirmed→finalized), checkpoint-aware confirmation depth, reorg detector with auto re-anchor | Re-anchor job; verification shows "confirming" state, never false VALID |
| RT-03 | Chain RPC provider outage | 4 | 3 | 12 | ≥2 independent providers with health-checked failover + self-hosted fallback node; verification serves cached finalized state | Degraded-mode banner; queue anchors until recovery |
| RT-04 | Gas price spike blows anchoring budget | 3 | 2 | 6 | EIP-1559 fee caps, wider batch windows under spike, cost alerts | Pause non-urgent anchors; revocations prioritized |
| RT-05 | Relayer hot-wallet key compromise | 2 | 4 | 8 | KMS-held keys, minimal balances, threshold alerts, IP-restricted signing service | Rotate wallet, pause writes, replay queued anchors from new wallet — anchors carry no authority, only issuer signatures do |
| RT-06 | Issuer signing-key compromise | 2 | 5 | 10 | HSM-backed KMS, non-exportable keys, per-signature audit, anomaly detection on signing volume | Emergency key rotation on-chain with compromise timestamp (UC-12); flag/reissue certs signed in exposure window |
| RT-07 | Merkle/hashing implementation flaw (second-preimage, malleability) | 1 | 5 | 5 | Standard libraries, domain-separated leaf/node hashing, salted leaves, external cryptographic review, test vectors | Versioned proof format allows corrected algorithm with re-anchor |
| RT-08 | Bulk pipeline fails at scale (50k rows) | 3 | 3 | 9 | Queue-based async design, load tests in CI gates, idempotent steps | DLQ replay; batch resumes from checkpoint |
| RT-09 | Vendor lock-in (cloud, RPC, email) blocks migration | 2 | 3 | 6 | IaC, containerized services, abstraction layers for chain/email/SMS | Documented migration playbooks |
| RT-10 | Polygon ecosystem shift (Polygon 2.0 / chain deprecation) | 2 | 4 | 8 | Chain-adapter abstraction; quarterly chain-health review; standards-layer independence | Execute migration playbook to successor chain; historical anchors remain readable |
| RT-11 | Data model can't serve 100M+ certs | 2 | 3 | 6 | Partitioning strategy designed up front; quarterly 10× capacity tests | Move verification reads to dedicated store (read model) |

## 10.2 Business Risks

| ID | Risk | L | I | Score | Mitigation | Contingency |
|---|---|---|---|---|---|---|
| RB-01 | Slow institution adoption (chicken-and-egg with verifiers) | 4 | 4 | 16 | Land anchor institutions via pilot pricing; verification is free/zero-friction so employer side needs no sales; DigiLocker complementarity pitch | Pivot emphasis to certification bodies/EdTech (faster sales cycles) |
| RB-02 | DigiLocker/NAD perceived as "good enough" in India | 4 | 3 | 12 | Position as complement (push to DigiLocker) + differentiate on international verifiability, revocation, analytics, private certifiers | Focus segments DigiLocker underserves: private certifiers, EdTech, cross-border |
| RB-03 | Blockchain skepticism / crypto stigma among registrars | 3 | 3 | 9 | Zero crypto exposure in UX; lead with outcomes (fraud prevention, workload cut); "no tokens, no wallets" messaging | De-emphasize chain in marketing; sell as verification platform |
| RB-04 | Incumbent (background-check firms, Parchment/TrueCopy/TruScholar) response | 3 | 3 | 9 | Speed + open standards as moat; partner channel for background-check vendors (white-label) | Partnership/acquisition conversations |
| RB-05 | Pricing model rejected by universities (budget cycles, POs) | 3 | 3 | 9 | PO/offline invoicing (BIL-006), annual academic pricing, government-tender readiness | Usage-based floor pricing; channel via ERP vendors |
| RB-06 | Key-person dependency in small team | 3 | 3 | 9 | ADRs, runbooks, pairing, bus-factor audit per quarter | Contractor bench; documentation-first culture |
| RB-07 | Funding gap before enterprise revenue | 3 | 4 | 12 | Milestone-based burn plan; pilot revenue early (Sprint 6 GA) | Scope cut to verification-only wedge product |

## 10.3 Security Risks

| ID | Risk | L | I | Score | Mitigation | Contingency |
|---|---|---|---|---|---|---|
| RS-01 | Fake-issuer onboarding (diploma mill passes KYB) | 3 | 5 | 15 | Accreditation-registry cross-check, DNS domain proof, manual review, regulator attestation option, public issuer registry transparency | Suspend issuer on-chain; verdicts flip to SUSPENDED ISSUER; disclosure to affected verifiers |
| RS-02 | Phishing clones of verification pages | 4 | 4 | 16 | Canonical domain education, verdict pages signed/branded, holder-side reporting (US-S-027), domain monitoring, verifiable proof bundles | Takedown process; browser-blocklist submission; user alerts |
| RS-03 | PII breach of off-chain store | 2 | 5 | 10 | Field-level encryption, least-privilege IAM, SIEM, pentests, minimal PII collection | Breach runbook: DPDP/GDPR notifications, key rotation, forensics |
| RS-04 | Insider fraud at institution (legitimate account issues fraudulent certs) | 3 | 4 | 12 | Maker-checker, issuance anomaly detection (AI-002), immutable audit trail, regulator visibility | Revocation of affected certs; tenant investigation; permanent evidence chain |
| RS-05 | Insider threat at platform (admin abuse) | 2 | 5 | 10 | JIT elevation, no standing prod creds, watermarked impersonation, dual control for destructive ops, SIEM on privilege use | Access freeze; forensic audit via tamper-evident logs |
| RS-06 | Enumeration/scraping of certificate data | 4 | 2 | 8 | Non-guessable IDs (UUIDv7+checksum), rate limits, bot detection, minimal public-by-default fields | Rotate exposed share URLs; notify affected holders |
| RS-07 | Webhook/API abuse (SSRF via customer endpoints, replay) | 3 | 3 | 9 | Egress proxy for webhook delivery, HMAC signatures + timestamps, idempotency, URL validation | Disable offending endpoints; key revocation ≤ 60 s |
| RS-08 | Dependency/supply-chain compromise | 2 | 4 | 8 | Lockfiles, SCA scanning, provenance checks (npm/pip), minimal dependency policy for contract code | Pin-and-patch response; rebuild from audited baseline |
| RS-09 | DDoS on verification path | 3 | 3 | 9 | CDN + WAF, static-cacheable verdict assets, autoscaling, rate limits | Static fallback page serving cached finalized verdicts |

## 10.4 Legal & Compliance Risks

| ID | Risk | L | I | Score | Mitigation | Contingency |
|---|---|---|---|---|---|---|
| RL-01 | GDPR/DPDP erasure vs blockchain immutability challenge | 2 | 4 | 8 | Architecture answer: zero PII on-chain; salted hashes non-attributable post off-chain erasure; DPIA documenting this | Legal opinion on hash-as-personal-data; per-cert salt destruction renders hash unlinkable |
| RL-02 | DPDP Act enforcement action (consent, breach timelines) | 2 | 4 | 8 | DPO, consent records (AUD-004), breach drill, in-region data | Regulator cooperation protocol; cyber insurance |
| RL-03 | Certificates' legal standing questioned in court/tender | 3 | 3 | 9 | s.65B-ready evidence bundles, legal review, align with IT Act e-records provisions, DigiLocker bridge for statutory weight | Expert-witness support; paper-parallel mode for holdout institutions |
| RL-04 | UGC/AICTE policy shifts mandating NAD-only issuance | 2 | 4 | 8 | DigiLocker/NAD integration makes TrustChain additive, not competing; regulator relationships early | Reposition as NAD-feeding infrastructure + international/private markets |
| RL-05 | Cross-border data transfer restrictions | 2 | 3 | 6 | Region pinning, SCCs, transfer-impact assessments | Per-jurisdiction deployment cells |
| RL-06 | IP/trademark disputes (name, template designs) | 2 | 2 | 4 | Clearance search, contracts assigning institution template IP correctly | Rename/redesign playbook |
| RL-07 | Liability for wrong verdicts (false VALID on fraud, false REVOKED on valid) | 2 | 4 | 8 | Verdict = cryptographic statement with documented scope; ToS liability caps; insurance; human adjudication for disputes | Incident comms + correction protocol; E&O insurance claim |

## 10.5 Operational Risks

| ID | Risk | L | I | Score | Mitigation | Contingency |
|---|---|---|---|---|---|---|
| RO-01 | Convocation-day verification/issuance surge | 4 | 3 | 12 | Burst load tests (5k RPS), CDN caching, autoscaling, tenant calendar awareness | Priority queue for anchors; static verdict fallback |
| RO-02 | Support overwhelmed by student claim issues at scale | 4 | 2 | 8 | Self-serve claim troubleshooting, issuer-side contact correction tools (NOT-010), help center | Surge support contract; issuer-delegated support tier |
| RO-03 | Anchoring backlog from prolonged chain issues | 2 | 3 | 6 | Queue durability, multi-RPC, backlog alerts at 1 h | Manual anchor via alternate infra; customer comms templates |
| RO-04 | Failed DB migration corrupts production | 2 | 5 | 10 | Backward-compatible migrations, staging rehearsal, PITR, migration gates in CI | Point-in-time restore (RPO ≤ 5 min); incident postmortem |
| RO-05 | Third-party service outage (email/SMS/payment) | 3 | 2 | 6 | Provider abstraction with failover (e.g., SES→Postmark), status-page transparency | Queue-and-retry; manual notification export |
| RO-06 | On-call fatigue / alert noise | 3 | 2 | 6 | SLO-based alerting only, runbook links, alert review ritual | Rotation depth; alert budget enforcement |
| RO-07 | Legacy import data quality creates dispute wave | 3 | 3 | 9 | Human review queue for low-confidence OCR (AI-005), "legacy-attested" labeling, issuer sign-off | Batch rollback via supersede; dispute fast-lane |

## 10.6 Top-5 Risk Summary (leadership dashboard)

1. **RB-01 Adoption chicken-and-egg (16)** — free frictionless verification side + anchor-institution pilots is the strategy; measure time-to-first-issuance relentlessly.
2. **RS-02 Phishing clones (16)** — trust in the *verdict page* is the product; invest in canonical-domain trust signals from day one.
3. **RS-01 Fake issuers (15)** — KYB rigor is a launch-blocking control, not a growth-phase add-on.
4. **RT-03 RPC outage (12) / RB-02 DigiLocker overlap (12) / RS-04 insider issuance fraud (12) / RO-01 surge (12) / RB-07 funding (12)** — all have designed mitigations in the FR set.
5. Standing review: contract security (RT-01/RT-06) stays high-impact regardless of likelihood — audits and key ceremonies are non-negotiable gates.
