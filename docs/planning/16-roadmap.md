# 16. Development Roadmap

Six 2-week sprints (12 weeks) to GA on Polygon mainnet, followed by post-GA tracks. Team assumption: 6–8 engineers (2 frontend, 2 backend, 1 blockchain, 1 DevOps/SRE, 1 QA, + tech lead), PM, designer part-time security consult.

**Standing definition of done (every sprint):** code reviewed, unit tests ≥ 80% on touched core modules, E2E green, docs/ADRs updated, deployed to staging, demoed.

## Sprint 0 (pre-sprint, 1 week — setup)

Monorepo scaffold, CI/CD skeleton, Terraform dev environment, devcontainer, design tokens, OpenAPI stub, ADR-001 (architecture) & ADR-002 (chain choice) ratified from this planning set.

## Sprint 1 — Foundations & Identity

**Goal:** a tenant can exist; a user can log in securely; the skeleton runs end to end.

| Deliverables | FRs |
|---|---|
| Auth service: register/login, email verify, MFA (TOTP), sessions, password reset | AUTH-001..004, 006, 009, 010 |
| RBAC framework + role matrix enforcement middleware | AUTH-007 |
| Tenant creation, member invites, tenant isolation (RLS) proven by tests | INST-001, 007 |
| Platform admin app shell + KYB review queue (manual approve) | ADM-001, 002 |
| Postgres schema v1 (identity/tenancy tables), audit-log append-only store | AUD-001 |
| Contracts first cut: IssuerRegistry + CertificateAnchor on local Anvil, Foundry test harness | BC-003 (dev) |
| Observability baseline: structured logs, traces, Sentry, dashboards | NFR-AUD-03 |

**Milestone M1:** secure login → create tenant → admin approves → audit trail visible.

## Sprint 2 — Issuance Pipeline & Testnet Anchoring

**Goal:** a certificate becomes a signed VC anchored on Amoy testnet.

| Deliverables | FRs |
|---|---|
| Credential schemas (typed fields → VC 2.0 mapping) + prebuilt templates | TPL-002..004, 006 |
| Single issuance form + canonicalization/salted hashing + VC signing via KMS | ISS-001, 008..010; INST-009 |
| Merkle batch builder + anchoring worker + relayer (Amoy), anchor FSM (queued→finalized) | ISS-011, BC-001..006, 008 |
| Bulk CSV upload with dry-run validation + duplicate detection (10k rows target this sprint) | ISS-002..004 |
| Maker-checker approval flow | ISS-006 |
| Issuer registry on-chain registration in tenant-approval flow | INST-005 |
| PDF render service + QR embedding | ISS-012, TPL-009 |

**Milestone M2:** CSV → approved batch → anchored on Amoy → PDF with QR downloadable.

## Sprint 3 — Verification & Revocation

**Goal:** anyone can verify in < 3 s; issuers can revoke; the trust loop closes.

| Deliverables | FRs |
|---|---|
| Public verification page (SSR, cached, 7 verdict states, accessibility pass) | VER-001..004, NFR-ACC-01 |
| File-upload verification + certificate-ID lookup with anti-enumeration | VER-005, 006, 014 |
| RevocationRegistry contract + Bitstring status lists + two-person revocation flow | BC-009, REV-001, 002, 004 |
| Supersede-and-reissue correction flow | ISS-017 |
| Expiry handling | REV-007 |
| Holder notifications (issued/revoked) via email + SMS | NOT-001, 002, 006, 007 |
| Internal chain indexer (verification hot path) + reorg watcher | BC-006, 007 |
| Contract audit #1 engagement starts (registry + anchor + revocation frozen scope) | NFR-SEC-07 |

**Milestone M3:** golden path complete on testnet — issue → anchor → verify → revoke → verify shows REVOKED ≤ 5 min.

## Sprint 4 — Holder Wallet & Claim

**Goal:** students own their credentials.

| Deliverables | FRs |
|---|---|
| Holder wallet app: claim via OTP + identity match, multi-tenant wallet, detail view | ISS-013, 014; STU-001..004 |
| Share links: expiry, view limits, PIN, revoke; share-activity log | STU-005, 007, 008; VER-012 |
| Downloads: PDF + W3C VC JSON | STU-003 |
| Certificate timeline (lifecycle events) | REV-012 |
| Dispute/correction case flow (holder → issuer queue) | STU-011, AUD-010 |
| Unclaimed-cert management + bounce handling for issuers | NOT-009, 010 |
| Passwordless OTP login for holders; account email migration | AUTH-011, STU-015 |
| Load test round 1: verification burst 1k RPS; bulk 50k rows | NFR-PERF-04, NFR-SCA-02 |

**Milestone M4:** pilot-ready private beta — 2 design-partner institutions issue real (testnet) batches; students claim and share.

## Sprint 5 — APIs, Employer Surface & Hardening

**Goal:** the platform becomes programmable and enterprise-credible.

| Deliverables | FRs |
|---|---|
| Public REST /v1 GA surface: issuance, batches, verification, proof bundles — OpenAPI published, sandbox env | API-001..004, 012, 014; VER-008, 009 |
| Webhooks platform (signed, retried, replayable) + management UI | API-005, 006 |
| Employer orgs: bulk CSV verify, history, fraud-flag button | EMP-001..003, 010 |
| Open-source verifier CLI/lib + The Graph subgraph published | VER-010, BC-011 |
| Issuer analytics dashboard v1 + ops dashboards (anchor queue, gas, wallets) | ANA-001, 002; ADM-005, 011 |
| SSO (OIDC) for tenants; API key scopes/rotation | AUTH-005, 014, 015 |
| Security hardening sprint-within-sprint: pentest round, rate limits everywhere, WAF rules, audit #1 remediations | NFR-SEC-01, 09 |
| Billing v1: plans, metering, Stripe/Razorpay, GST invoices | BIL-001..005 |

**Milestone M5:** external pentest report clean of criticals; first API-integrated pilot (ERP-triggered issuance).

## Sprint 6 — Mainnet Launch & GA

**Goal:** production on Polygon mainnet with launch-grade reliability and compliance.

| Deliverables | FRs |
|---|---|
| Contract audit #2 complete; remediations; key ceremony (multisig + timelock); mainnet deployment with verified source | BC-014, 015; NFR-SEC-07 |
| Mainnet cutover: relayer wallets funded, RPC failover live, chain kill-switch drilled | BC-013; US-A-016 |
| DR validation: restore drill, RPO/RTO measured; vendor-death verification drill (OSS verifier vs prod anchors) | NFR-AVL-03, 07 |
| Compliance pack: DPIA, DPDP consent flows, DSR console, data-residency policy checks | AUD-004..006; ADM-014 |
| Localization EN+HI; WCAG 2.2 AA audits on verify + wallet | NFR-ACC-01, 05 |
| Legacy import v1 (CSV attested path; OCR queue behind flag) | ISS-018 |
| Load test final: 5k RPS burst; convocation-day game day | NFR-SCA-02, RO-01 |
| Launch ops: status page, on-call rotation, runbooks ×10, support playbooks | NFR-MNT-04 |
| Pilot conversion: 3+ institutions live on mainnet during launch window | KPI G1 |

**Milestone M6 (GA):** first production certificates anchored on Polygon mainnet; public launch.

## Post-GA Tracks (quarters 2–4)

| Track | Contents | Target |
|---|---|---|
| Privacy | SD-JWT selective disclosure GA, disclosure flags UI, consented credential requests | Q2 |
| India ecosystem | DigiLocker issuer bridge, APAAR mapping, NAD alignment certification | Q2–Q3 |
| Enterprise | Multi-step approvals, BYO-HSM keys, SIS/ERP + ATS connectors, watch lists, SOC 2 Type I | Q2–Q3 |
| AI | OCR digitization GA, forgery screening, issuance/verification anomaly detection, risk scoring | Q3 |
| Interop | Open Badges 3.0 export, OIDC4VCI/VP endpoints, EBSI exploration | Q3–Q4 |
| Scale | Multi-region readiness, ClickHouse analytics, benchmark reports, SOC 2 Type II groundwork | Q4 |

## Milestone Summary

| Milestone | Week | Proof |
|---|---|---|
| M1 Foundations | 3 | Tenant + auth + audit live in staging |
| M2 Issuance | 5 | Anchored batch on Amoy from CSV |
| M3 Trust loop | 7 | Verify + revoke round-trip < 5 min |
| M4 Private beta | 9 | Design partners issuing; students claiming |
| M5 Programmable | 11 | API pilot + clean pentest |
| M6 **GA on mainnet** | 13 | Production certificates, paying pilots |
