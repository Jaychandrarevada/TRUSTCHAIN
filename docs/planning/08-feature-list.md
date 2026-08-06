# 8. Complete Feature List

Features roll up the functional requirements in [04-functional-requirements.md](04-functional-requirements.md); each feature lists its primary FR anchors.

## 8.1 Core Features (MVP — Sprints 1–4)

| Feature | Description | FRs |
|---|---|---|
| Multi-tenant institution onboarding | Self-serve signup, KYB accreditation review, tenant isolation | INST-001..003, ADM-002 |
| On-chain issuer registry | DID-bound issuer identity, key rotation, suspension | INST-005, BC-003 |
| Credential schemas & templates | Typed schemas mapped to W3C VC 2.0; prebuilt templates; versioning | TPL-002..006 |
| Single & bulk issuance | Form + 50k-row CSV with dry-run validation, duplicate detection | ISS-001..004 |
| Maker-checker approval | Operator drafts, approver releases | ISS-006 |
| Merkle batch anchoring | Salted hashes → Merkle root → Polygon PoS; relayer-managed gas | ISS-009..011, BC-001..008 |
| Public verification page | QR/URL, no login, 7 verdict states, < 3 s | VER-001..006 |
| File-upload verification | Recompute hash of received PDF/JSON | VER-005 |
| On-chain revocation | Two-person rule, reason codes, status list anchored | REV-001..004, BC-009 |
| Supersede-and-reissue | Correction chain without history erasure | ISS-017 |
| Holder wallet | Claim (OTP), multi-institution wallet, download PDF/VC JSON | STU-001..005 |
| Share links | Expiry, view limits, PIN, instant revoke | STU-005..008, VER-012 |
| Notifications | Issuance/claim/revocation email + SMS, batch progress | NOT-001..007 |
| REST API v1 + sandbox | OpenAPI, scoped keys, idempotency, async batches | API-001..004, 012, 014 |
| Audit logging | Append-only, fail-closed, tenant-scoped viewer | AUD-001, 003 |
| Platform admin console | KYB queue, tenant lifecycle, anchoring ops dashboard | ADM-001..005 |

## 8.2 Advanced Features (GA — Sprints 5–6 and fast-follow)

| Feature | Description | FRs |
|---|---|---|
| Selective disclosure | SD-JWT VC field-level sharing | VER-011, STU-006, TPL-007 |
| Open Badges 3.0 export | 1EdTech-conformant badge export | TPL-005 |
| Open-source verifier | CLI/library verifying with zero TrustChain servers | VER-009..010, BC-011 |
| Webhooks platform | Signed events, retries, delivery log, replay | API-005..006 |
| Legacy import | OCR-assisted historical certificate attestation | ISS-018, AI-005 |
| Template designer | Drag-drop branded layout editor | TPL-001 |
| SSO (OIDC/SAML) | Tenant IdP integration with JIT role mapping | AUTH-005 |
| Employer org portal | Team accounts, history, bulk CSV verify | EMP-001..003 |
| Issuer & holder analytics | Verification traffic, claim rates, geography | ANA-001..002, 009 |
| Scheduled issuance | Convocation-day anchoring | ISS-015 |
| Dispute/correction cases | Structured holder→issuer adjudication | STU-011, AUD-010 |
| Billing & plans | Tiers, metering, Stripe + Razorpay, GST invoices | BIL-001..005 |

## 8.3 Enterprise Features

| Feature | Description | FRs |
|---|---|---|
| BYO signing keys (HSM) | Institution-held keys, external signing API | INST-010 |
| Custom roles & permissions | Tenant-defined RBAC | AUTH-008 |
| Multi-step approval chains | Configurable HoD → Registrar → CoE flows | ISS-007 |
| SIS/ERP connectors | REST pull + SFTP import with saved mappings | ISS-005 |
| ATS integrations | Greenhouse/Lever/webhook verification in hiring flow | EMP-005 |
| Watch lists & revocation webhooks | Post-hire credential monitoring | EMP-006, REV-006 |
| Verification attestation PDFs | Signed evidence for audit files | EMP-007 |
| SLA tiers | Dedicated quotas, uptime SLA, support | EMP-012, BIL-003 |
| SOC 2 evidence automation | Control mapping and quarterly evidence packs | AUD-009 |
| Data warehouse export | Nightly Parquet/BigQuery share | ANA-011 |
| Regulator portal | Read-only aggregates, accreditation sync | ADM-013, ANA-004 |
| Legal evidence bundles | Notarizable chain-of-custody exports (s.65B-ready) | AUD-012 |
| White-label verification | Partner-branded endpoints for background-check vendors | EMP-009 |
| Data residency pinning | Region-pinned tenant PII | NFR-CMP-03 |

## 8.4 Blockchain Features

| Feature | Description | FRs |
|---|---|---|
| Polygon PoS anchoring (Amoy sandbox) | Cheap, EVM-standard, public verifiability | BC-001 |
| Gasless UX (relayer) | Institutions never touch crypto | BC-002 |
| Issuer Registry contract | Admission, key history, suspension events | BC-003 |
| Revocation Registry contract | Bitstring status list roots on-chain | BC-009, REV-010 |
| Reorg detection & re-anchor | Finality state machine | BC-006..007 |
| The Graph subgraph | Open indexed registry/anchor data | BC-011 |
| UUPS upgradeability + timelock multisig | Governed contract evolution | BC-014 |
| Multi-chain adapter layer | Future chains without re-architecture | BC-010 |
| Audit-log hash anchoring | Daily tamper-evidence root | AUD-002 |
| Verified open contracts | Sourcify/Polygonscan verification + ABI docs | BC-015 |

## 8.5 AI Features

| Feature | Description | FRs |
|---|---|---|
| Forgery screening | ELA/font/metadata anomaly scoring for legacy uploads | AI-001 |
| Issuance anomaly detection | Volume/timing/grade-distribution outliers | AI-002 |
| Verification-pattern detection | Enumeration, scraping, geo anomalies | AI-003 |
| Entity resolution | Cross-script name matching for claims | AI-004 |
| OCR digitization | Legacy certificate field extraction with review queue | AI-005 |
| Fraud risk scoring | Composite per-certificate signal, human-in-the-loop | AI-008..009 |
| NL verification assistant | Grounded Q&A on verified data (future) | AI-006 |
| Issuer copilot | Schema/template drafting from samples (future) | AI-007 |
| Model governance | Eval cards, bias review for name matching | AI-010 |

## 8.6 Analytics Features

| Feature | Description | FRs |
|---|---|---|
| Issuer dashboard | Volume, verifications, geography, channels | ANA-001 |
| Per-certificate analytics | Views over time | ANA-002 |
| Platform ops analytics | Tenant growth, gas costs, API usage | ANA-003, 008 |
| Fraud analytics | Flags, tamper attempts, enumeration trends | ANA-007 |
| Funnel analytics | Scan → view → proof download | ANA-006 |
| Scheduled exports | CSV/PDF email delivery | ANA-005 |
| Benchmarks | Anonymized sector comparisons (future) | ANA-012 |

## 8.7 Administration Features

| Feature | Description | FRs |
|---|---|---|
| KYB review queue | Accreditation approval with SLA timers | ADM-002 |
| Tenant lifecycle controls | Suspend/limit/restore/offboard | ADM-003, INST-012..014 |
| Feature flags | Per-tenant/plan rollout + kill switches | ADM-006, NFR-MNT-03 |
| Rate/quota management | Live per-tenant/key config | ADM-007 |
| Fraud case management | Investigation workflow | ADM-008 |
| Support view-as | Read-only, watermarked, audited | ADM-010, AUTH-017 |
| Ops dashboards | Anchoring queue, wallet balances, SLO burn | ADM-005, 011 |
| DLQ replay tooling | Idempotent recovery of failed jobs | ADM-012 |
| DSR console | DPDP/GDPR erasure/access/correction | ADM-014 |
| Config as code | Versioned, reviewed platform config | ADM-015 |

## 8.8 Future Features (P3 / roadmap horizon)

| Feature | Rationale |
|---|---|
| BYO-DID holder wallets + OIDC4VCI/VP | Full SSI interop as wallet ecosystem matures (API-009..010, AUTH-013) |
| ZK predicate proofs ("CGPA ≥ 8" without value) | Privacy frontier beyond SD-JWT; BBS+ signatures |
| Offline verification mode | Signed cached chain state for no-connectivity contexts (VER-016) |
| EBSI / EU wallet bridge | Cross-border recognition for EU-bound graduates |
| Skill passports & micro-credential stacking | Aggregate credentials into competency profiles (ABC credit alignment) |
| Talent-pool opt-in marketplace | Holder-consented employer discovery (EMP-011) |
| Permissioned deployment option | Private-ledger flavor for governments wanting sovereign infra |
| Zapier/Make connectors, template marketplace | Long-tail integration & ecosystem (API-011, TPL-012) |
| NL assistant + issuer copilot | AI UX layer once core trust features are proven (AI-006..007) |
| Multi-region active-active | Global latency + sovereignty at scale (NFR-SCA-07) |
