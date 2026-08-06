# 17. Deliverables & Implementation Roadmap

The complete inventory of what gets produced, by phase, with owners and acceptance gates. This is the checklist the program is managed against.

## 17.1 Phase 0 — Planning (this package) ✅

| Deliverable | Artifact | Owner |
|---|---|---|
| Market research & competitive analysis | [02-market-research.md](02-market-research.md) | PM |
| Requirements (221 FRs, NFRs) | [04](04-functional-requirements.md), [05](05-non-functional-requirements.md) | PM + Architect |
| Stories (152) & use cases (14) | [06](06-user-stories.md), [07](07-use-cases.md) | PM + QA Lead |
| Chain decision & risk register | [09](09-technology-comparison.md), [10](10-risk-analysis.md) | Blockchain Architect |
| Stack, structure, API, DB, chain design | [11](11-tech-stack.md)–[15](15-blockchain-planning.md) | Architects |
| Roadmap | [16-roadmap.md](16-roadmap.md) | PM + Tech Lead |

**Gate 0:** leadership sign-off on scope, chain choice (Polygon PoS), budget, and hiring plan.

## 17.2 Phase 1 — Foundation (Sprints 0–2)

| Deliverable | Acceptance gate |
|---|---|
| Monorepo + CI/CD + IaC (dev/staging) + devcontainer | New engineer to merged PR < 5 days; `terraform plan` clean |
| Design system + wireframes → hi-fi for 4 apps | Usability review of verify page with non-technical testers |
| Auth/RBAC/tenancy services with RLS-proven isolation | Cross-tenant access test suite 100% pass |
| Smart contracts v1 (IssuerRegistry, CertificateAnchor, RevocationRegistry) + Foundry suites | ≥90% branch coverage; fuzz/invariants green; Slither clean |
| Issuance pipeline (CSV → VC → Merkle → Amoy anchor) + relayer + render service | M2 demo: 10k-row batch anchored end-to-end |
| ADRs 001–010 (architecture, chain, tenancy, hashing, key custody, queues, PII encryption, API style, monorepo, upgrade policy) | ADR review board sign-off |

**Gate 1:** M2 demo + architecture review + threat model v1 (STRIDE) documented in `docs/security/`.

## 17.3 Phase 2 — Trust Loop & Beta (Sprints 3–4)

| Deliverable | Acceptance gate |
|---|---|
| Public verification page + file verification + verdict engine | p95 < 3 s under 1k RPS load test; WCAG audit pass |
| Revocation (two-person, on-chain status lists) + supersede flow | Revoke→verdict propagation ≤ 5 min measured |
| Holder wallet (claim, share controls, VC export, timeline, disputes) | Design-partner students complete claim+share unaided |
| Notification platform (email/SMS/in-app + bounce handling) | Delivery instrumentation live |
| Contract audit #1 report + remediations | No unresolved high/critical |
| Private-beta program (2 institutions, testnet) | Signed pilot agreements; feedback log |

**Gate 2:** M4 beta review — pilot NPS interviews, defect burn-down, go/no-go for API buildout.

## 17.4 Phase 3 — Platform & Launch (Sprints 5–6)

| Deliverable | Acceptance gate |
|---|---|
| Public REST /v1 (OpenAPI), sandbox, webhooks, SDK seeds, Postman collection | Schemathesis contract suite green; external integrator completes quickstart < 15 min |
| Employer portal (bulk verify, history, flags) + billing (Stripe/Razorpay, GST) | Metering reconciles with processor to the paisa |
| Open-source verifier CLI + The Graph subgraph | Third party verifies a credential with zero TrustChain infrastructure |
| Analytics v1 (issuer + ops dashboards) | Metrics match raw events exactly |
| Security package: pentest report, audit #2, key ceremony record, incident runbooks | Zero criticals; game-day drill executed |
| Compliance package: DPIA, consent architecture, DSR console, residency policy checks, s.65B evidence-bundle legal review | Counsel sign-off |
| Mainnet deployment (verified contracts, multisig+timelock, funded relayers, RPC failover) | Vendor-death drill passes against mainnet anchors |
| Launch collateral: docs site, API reference, issuer onboarding guide, holder/verifier help center, status page | Docs reviewed by pilot institutions |

**Gate 3 (GA):** M6 — production certificates anchored; 3+ institutions live; SLO dashboards green for 2 consecutive weeks.

## 17.5 Phase 4 — Post-GA (Quarters 2–4)

| Deliverable | Target |
|---|---|
| SD-JWT selective disclosure GA + consented credential requests | Q2 |
| DigiLocker/NAD issuer bridge certification | Q2–Q3 |
| Enterprise pack: SSO/SAML breadth, multi-step approvals, BYO-HSM, SIS/ATS connectors, SLA tiers | Q2–Q3 |
| AI pack: OCR digitization, forgery screening, anomaly detection, risk scoring (+ model eval cards) | Q3 |
| Interop pack: Open Badges 3.0, OIDC4VCI/VP, W3C conformance evidence | Q3–Q4 |
| SOC 2 Type I → Type II program | Type I M9, Type II M18 |
| Scale pack: multi-region design, ClickHouse analytics, 10× capacity test | Q4 |

## 17.6 Continuous Deliverables (every sprint, forever)

- Updated OpenAPI spec + changelog; regenerated SDK clients.
- ADR for every significant decision; runbook updates with every new failure mode.
- Release notes (tenant-facing) + status-page transparency.
- Risk-register review (monthly), SLO report (monthly), restore drill (monthly), access review (quarterly), chain-health review (quarterly).
- KPI dashboard vs. targets in [01-executive-summary.md §1.7](01-executive-summary.md).

## 17.7 Success Criteria Recap (program level)

1. **GA in 13 weeks** on Polygon mainnet with the full trust loop (issue → anchor → claim → share → verify → revoke).
2. **10 institutions / 100k certificates / 250k verifications** in year 1.
3. **Zero on-chain PII, zero unresolved critical vulns, verified vendor-independent verification** — the three non-negotiables.
4. **< $0.005 amortized chain cost per certificate**, verification p95 < 3 s, 99.9% verification-path uptime.
5. Credentials verify in third-party W3C VC tooling — proof that TrustChain is infrastructure, not a silo.

---

*End of planning documentation set. Next step: Gate 0 review, then Sprint 0 kickoff per [16-roadmap.md](16-roadmap.md).*
