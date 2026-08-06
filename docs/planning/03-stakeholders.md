# 3. Stakeholders

## 3.1 Stakeholder Map

| Stakeholder | Role in system | Interest | Influence | Key concerns |
|---|---|---|---|---|
| **Institution** (university, college, certifier) | Tenant; issues credentials | High | High | Forgery protection, workload reduction, brand, compliance, cost, data ownership |
| **University registrar / exam controller** | Primary issuer operator | High | Medium | Bulk issuance ease, correction/reissue workflow, approval controls, audit trail |
| **Student / alumnus (holder)** | Owns and shares credentials | High | Medium | Lifetime free access, privacy, portability, easy sharing, correction rights |
| **Employer** | Verifies at hiring scale | High | Medium | Speed, cost, legal reliability, bulk/API verification, ATS integration |
| **Verifier** (any third party: embassy, university admissions, licensing body, landlord) | Ad-hoc verification | Medium | Low | Zero-friction verification, no account needed, clear verdicts, revocation status |
| **Platform Admin** (TrustChain ops) | Operates the SaaS | High | High | Tenant management, uptime, abuse prevention, billing, support tooling |
| **Government / regulator** (education ministry, UGC/AICTE, accreditation bodies) | Oversight; may mandate or integrate | Medium | Very High | Data sovereignty, DPDP/GDPR, DigiLocker/NAD interop, fraud analytics, accreditation enforcement |
| **University IT department** | Integrates SIS/ERP | Medium | Medium | API quality, security review, SSO, data migration |
| **Background-check / HR-tech vendors** | Channel partners | Medium | Low | Volume API pricing, white-label verification |
| **Auditors (internal/external)** | Review controls | Low | Medium | Immutable logs, evidence exports, SOC 2 artifacts |
| **Investors / leadership** | Fund and steer | High | High | KPIs, unit economics, defensibility |

## 3.2 Stakeholder Needs → Platform Capabilities

| Stakeholder | Top needs | Mapped capabilities |
|---|---|---|
| Institution | Prevent forgery; reduce verification workload; comply with NEP-2020/NAD | Chain anchoring, public verify page, DigiLocker bridge, compliance reports |
| Student | Own, share, and control credentials for life | Holder wallet, share links with expiry, selective disclosure, export to VC/Open Badges/DigiLocker |
| Employer | Verify fast, in bulk, inside existing tools | Public verify, bulk CSV verify, REST API, ATS connectors, webhooks |
| Verifier | Trustworthy verdict without expertise | One-page verdict UI (valid / revoked / expired / tampered / unknown issuer) with plain-language explanation |
| Admin | Operate safely at scale | Tenant console, RBAC, rate limits, abuse detection, billing, feature flags |
| Government | Oversight without operating burden | Regulator read-only dashboards, accreditation-linked issuer registry, fraud analytics exports |
| University (as verifier of transfer students) | Validate incoming transcripts | Institution-to-institution verification API, credit-record (ABC) mapping |

## 3.3 RACI (major activities)

| Activity | Institution | Student | Employer | Platform Admin | Regulator |
|---|---|---|---|---|---|
| Tenant onboarding & accreditation proof | R/A | – | – | C (approves) | I (optionally attests) |
| Template & schema design | R/A | I | – | C | I |
| Certificate issuance & anchoring | R/A | I (notified) | – | C (platform SLA) | I |
| Revocation / correction | R/A | I (notified, can appeal) | I (webhook) | C | I |
| Verification | I | I (consent for private data) | R | A (availability) | I |
| Key management (issuer keys) | R | – | – | A (custody service or BYO-HSM) | I |
| Data-subject requests (DPDP/GDPR) | R | R (initiates) | – | A | C |
| Platform security & audits | C | – | – | R/A | I |

## 3.4 Personas (condensed)

1. **Dr. Meena Rao — Controller of Examinations**, 20k-student engineering university. Issues ~6,000 degree certificates + 40,000 marksheets/year. Non-technical; needs CSV import, maker-checker approval, and a defensible audit trail.
2. **Arjun — final-year B.Tech student.** Wants his degree in DigiLocker *and* a link he can put on LinkedIn/resume that a US grad school can verify instantly.
3. **Sofia — HR lead at a 500-hire/year IT services firm.** Pays a background-check vendor ₹2,000/candidate with 7-day turnaround; wants API verification inside her ATS in seconds.
4. **Vikram — TrustChain platform operator.** Needs tenant health dashboards, anchoring-queue monitoring, incident runbooks, and abuse controls.
5. **Joint Secretary, Higher Education Dept.** Will only endorse a platform that keeps PII in-country, integrates with DigiLocker/APAAR, and gives the ministry visibility.
