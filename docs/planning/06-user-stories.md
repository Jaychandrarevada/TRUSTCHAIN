# 6. User Stories

**Total: 152 stories** across 8 personas. Priority: P0 (MVP) / P1 (GA) / P2 (post-GA) / P3 (future). Acceptance criteria (AC) are the closing conditions; detailed Gherkin scenarios live in the QA repo. Story IDs cross-reference functional requirements in [04-functional-requirements.md](04-functional-requirements.md).

## 6.1 Student / Holder (30)

| ID | Story | Priority | Acceptance criteria |
|---|---|---|---|
| US-S-001 | As a student, I want to receive an email when my certificate is issued so that I know it exists and can claim it. | P0 | Email arrives ≤ 5 min after anchoring with working claim link |
| US-S-002 | As a student, I want to claim my certificate with an OTP so that only I can attach it to my account. | P0 | Wrong OTP/identity mismatch fails; success shows cert in wallet |
| US-S-003 | As a student, I want all my certificates from different institutions in one wallet so that I have a single lifelong record. | P0 | Certs from ≥ 2 tenants visible in one account |
| US-S-004 | As a student, I want to download my certificate as PDF so that I can print or attach it. | P0 | PDF contains QR that verifies |
| US-S-005 | As a student, I want to download my credential as W3C VC JSON so that I can use it in other wallets. | P1 | File passes external VC validator |
| US-S-006 | As a student, I want to share a verification link so that an employer can check it instantly. | P0 | Recipient sees VALID verdict without login |
| US-S-007 | As a student, I want to set an expiry on a share link so that old links stop working. | P1 | Post-expiry access shows "link expired" |
| US-S-008 | As a student, I want to revoke a share link immediately so that I control ongoing access. | P0 | Link dead ≤ 60 s after revoke |
| US-S-009 | As a student, I want to share only selected fields (hide my CGPA) so that I control my privacy. | P1 | Hidden field absent; proof still verifies |
| US-S-010 | As a student, I want to see who viewed my shared certificate so that I know my sharing footprint. | P1 | View events listed with time and channel |
| US-S-011 | As a student, I want a QR code for my certificate so that I can put it on a printed resume. | P0 | Printed QR scan resolves correctly |
| US-S-012 | As a student, I want to add my certificate to LinkedIn in one click so that my profile is verifiable. | P2 | LinkedIn entry links to live verify page |
| US-S-013 | As a student, I want my degree pushed to DigiLocker so that it counts for Indian government purposes. | P2 | Cert appears in DigiLocker issued documents |
| US-S-014 | As a student, I want to dispute an error in my certificate so that it gets corrected. | P1 | Dispute case created; issuer response tracked |
| US-S-015 | As a student, I want to be notified if my certificate is revoked so that I'm not surprised in an interview. | P0 | Notification with reason + appeal channel |
| US-S-016 | As a student, I want to change my login email after graduation so that I keep access when my college email dies. | P1 | Access continuity after verified email change |
| US-S-017 | As a student, I want passwordless OTP login so that I don't manage another password. | P1 | OTP login works; rate-limited |
| US-S-018 | As a student, I want to export all my data so that I can exercise my privacy rights. | P1 | Export delivered ≤ 72 h |
| US-S-019 | As a student, I want to delete my account so that my personal data is removed. | P1 | PII erased; anchors remain non-identifying |
| US-S-020 | As a student, I want my wallet to work on my phone so that I can share credentials anywhere. | P1 | Responsive PWA passes mobile usability audit |
| US-S-021 | As a student, I want offline access to my certificates so that I can show them without connectivity. | P2 | Cached artifact viewable offline, marked cached |
| US-S-022 | As a graduate applying abroad, I want my credential to verify in foreign systems so that admissions accept it. | P1 | Credential verifies in third-party W3C VC verifier |
| US-S-023 | As a student, I want to see the blockchain proof details so that I can trust (and demonstrate) the anchoring. | P1 | Tx hash, block, Merkle proof visible with explorer link |
| US-S-024 | As a student with an expiring certification, I want renewal reminders so that I re-certify on time. | P2 | Reminders at 90/30/7 days |
| US-S-025 | As a student, I want to see my full certificate history/timeline so that I understand every status change. | P1 | Timeline lists issue/claim/share/verify/revoke events |
| US-S-026 | As a student, I want a PIN-protected share so that only my intended recipient opens it. | P1 | Wrong PIN blocks after N attempts |
| US-S-027 | As a student, I want to report a phishing copy of the verification page so that others aren't scammed. | P2 | Report reaches security queue |
| US-S-028 | As a student with a non-Latin name, I want my name rendered correctly in both scripts so that documents match my ID. | P2 | Dual-script rendering matches issuance data |
| US-S-029 | As a visually impaired student, I want the wallet to work with my screen reader so that I can manage credentials independently. | P1 | NVDA/VoiceOver completes claim + share flows |
| US-S-030 | As a student, I want to link my own DID wallet so that I control my credentials self-sovereignly. | P3 | Challenge-signature links external DID |

## 6.2 Institution — Registrar / Operator / Approver (32)

| ID | Story | Priority | Acceptance criteria |
|---|---|---|---|
| US-I-001 | As a registrar, I want to sign up my institution and prove accreditation so that we can start issuing. | P0 | KYB flow completes; approval unlocks issuance |
| US-I-002 | As a registrar, I want to verify our domain via DNS so that verifiers see us as the authentic issuer. | P1 | TXT record check passes; did:web resolves |
| US-I-003 | As an operator, I want to issue a single certificate via a form so that ad-hoc issuance is easy. | P0 | Cert issued, anchored, verifiable |
| US-I-004 | As an operator, I want to upload a CSV of 10,000 graduates so that convocation issuance is one workflow. | P0 | Batch validates, previews, issues |
| US-I-005 | As an operator, I want row-level validation errors before committing so that bad data never becomes a certificate. | P0 | Dry-run report lists each failing row |
| US-I-006 | As an operator, I want duplicate warnings so that we don't double-issue. | P0 | Duplicates flagged; override needs approver |
| US-I-007 | As an approver, I want to review and approve batches so that issuance has maker-checker control. | P0 | Unapproved batch cannot anchor |
| US-I-008 | As a registrar, I want multi-step approval chains so that HoD and CoE both sign off. | P2 | Configured chain enforced in order |
| US-I-009 | As an operator, I want to design certificate templates with our branding so that outputs look official. | P1 | Rendered PDF matches design |
| US-I-010 | As a registrar, I want template versioning so that old certificates never change retroactively. | P0 | Issued certs pin template version |
| US-I-011 | As a registrar, I want to define credential schemas with typed fields so that data quality is enforced. | P0 | Type violations rejected at issuance |
| US-I-012 | As a registrar, I want to revoke a certificate for proven malpractice so that the record reflects reality. | P0 | Revocation live ≤ 5 min; reason coded |
| US-I-013 | As a registrar, I want revocation to require a second approver so that no single person can weaponize it. | P0 | Two-person rule enforced |
| US-I-014 | As a registrar, I want to correct a typo via supersede-and-reissue so that mistakes have a clean audit path. | P0 | Old cert shows SUPERSEDED with link to new |
| US-I-015 | As a registrar, I want a full audit log of who did what so that I can answer any inquiry. | P0 | Filterable, exportable log |
| US-I-016 | As a registrar, I want to import our last 20 years of certificates so that alumni benefit too. | P1 | Legacy certs marked retroactively-attested |
| US-I-017 | As an IT admin, I want SSO with our Azure AD so that staff use institutional accounts. | P1 | OIDC login with role mapping |
| US-I-018 | As an IT admin, I want to invite staff with specific roles so that access is least-privilege. | P0 | Invitee lands with assigned role only |
| US-I-019 | As an IT admin, I want a sandbox environment so that we can test before production. | P1 | Sandbox certs watermarked, testnet-anchored |
| US-I-020 | As an IT admin, I want an issuance API so that our ERP triggers issuance automatically. | P1 | API batch follows approval policy |
| US-I-021 | As a registrar, I want issuance reports per batch so that I can file them with exam records. | P1 | Report matches on-chain anchor |
| US-I-022 | As a registrar, I want a dashboard of verification activity so that I can quantify saved effort. | P1 | Counts match event logs |
| US-I-023 | As a registrar, I want to see which certificates are unclaimed so that we can chase students. | P1 | Unclaimed list with re-notify action |
| US-I-024 | As a registrar, I want undeliverable-email alerts so that wrong addresses get fixed. | P1 | Bounce queue visible with edit action |
| US-I-025 | As a department head, I want my department to manage only its own templates so that we don't step on each other. | P1 | Cross-department access denied |
| US-I-026 | As a registrar, I want scheduled issuance on convocation day so that certificates go live at the ceremony. | P2 | Batch anchors at scheduled time |
| US-I-027 | As a registrar, I want to respond to student disputes in a case queue so that corrections are orderly. | P1 | Case states tracked to resolution |
| US-I-028 | As a registrar, I want our certificates to also appear in DigiLocker so that we comply with NAD expectations. | P2 | DigiLocker push succeeds for consenting holders |
| US-I-029 | As an institution owner, I want key rotation without breaking old certificates so that a compromise is recoverable. | P1 | Pre-rotation certs still verify |
| US-I-030 | As an institution owner, I want to hold our own signing keys in our HSM so that trust stays in-house. | P2 | BYO-key signed batch verifies identically |
| US-I-031 | As a registrar, I want expiring-certification cohort reports so that we run renewal campaigns. | P2 | Cohort export by expiry window |
| US-I-032 | As an institution owner, I want to export all our data so that we're never locked in. | P1 | Full export delivered |

## 6.3 Employer / Verifier (25)

| ID | Story | Priority | Acceptance criteria |
|---|---|---|---|
| US-E-001 | As a recruiter, I want to scan a QR on a resume and get a verdict so that screening takes seconds. | P0 | Verdict < 3 s, plain-language |
| US-E-002 | As a recruiter, I want to verify without creating an account so that there's zero friction. | P0 | Public page needs no login |
| US-E-003 | As a recruiter, I want a clear TAMPERED/REVOKED verdict so that I don't misread a bad credential as good. | P0 | Distinct verdict states with explanations |
| US-E-004 | As a recruiter, I want to upload a PDF I received so that I can check it wasn't altered. | P0 | Hash mismatch yields TAMPERED |
| US-E-005 | As an HR ops lead, I want to bulk-verify 500 candidates via CSV so that campus-hiring season is manageable. | P1 | Report with per-row verdicts |
| US-E-006 | As an HR systems owner, I want a verification API so that our ATS verifies automatically. | P1 | API verdict matches web verdict |
| US-E-007 | As an HR systems owner, I want webhooks when a watched credential is revoked so that post-hire risk is covered. | P2 | Alert ≤ 10 min after revocation |
| US-E-008 | As a compliance officer, I want a signed verification attestation PDF so that our audit file has evidence. | P2 | Attestation itself hash-verifiable |
| US-E-009 | As a recruiter, I want to see the issuing institution's accreditation status so that I catch diploma mills. | P1 | Issuer registry status on verdict page |
| US-E-010 | As a recruiter, I want to request a credential from a candidate so that consented sharing is structured. | P2 | Holder consent recorded before access |
| US-E-011 | As an employer admin, I want team accounts with shared history so that verifications aren't repeated. | P1 | Org history visible to members |
| US-E-012 | As an employer admin, I want usage dashboards so that I can track our verification volume and spend. | P1 | Usage matches metering |
| US-E-013 | As a recruiter, I want to flag a suspicious certificate so that fraud gets investigated. | P1 | Flag creates a case |
| US-E-014 | As a verifier at an embassy, I want the verdict page in plain language so that non-technical staff can trust it. | P0 | Usability test with non-technical users passes |
| US-E-015 | As a graduate school admissions officer, I want to verify transcripts with grades so that evaluation is accurate. | P1 | Consented full-field share verifies |
| US-E-016 | As an admissions officer, I want grading-system context (10-pt CGPA vs 4-pt GPA) so that I can compare fairly. | P2 | Grading metadata shown |
| US-E-017 | As a background-check vendor, I want high-volume API tiers so that verification is part of my product. | P2 | Tiered quotas enforced |
| US-E-018 | As a background-check vendor, I want white-label verification reports so that my brand stays front. | P3 | Partner-branded report |
| US-E-019 | As a verifier, I want to independently re-verify using open tools so that I don't have to trust TrustChain. | P1 | OSS CLI verifies proof bundle via public RPC |
| US-E-020 | As a verifier, I want to know when a certificate was superseded so that I request the corrected one. | P1 | SUPERSEDED verdict links forward |
| US-E-021 | As a recruiter on a slow connection, I want the verification page to load fast so that field verification works. | P1 | < 100 KB critical path |
| US-E-022 | As an employer, I want expired share links to fail clearly so that I know to ask for a fresh link. | P1 | "Link expired — request a new one" message |
| US-E-023 | As an employer, I want an embeddable verified-hires badge so that our careers page shows diligence. | P3 | Widget renders live status |
| US-E-024 | As an HR lead, I want SSO for my verification team so that access follows our identity lifecycle. | P2 | OIDC SSO for employer org |
| US-E-025 | As a verifier, I want verification in my language so that verdicts are unambiguous. | P2 | Locale switch covers verdict strings |

## 6.4 Platform Admin / Operations (18)

| ID | Story | Priority | Acceptance criteria |
|---|---|---|---|
| US-A-001 | As a platform admin, I want a KYB review queue so that only legitimate institutions can issue. | P0 | Approve/reject with reason + SLA timer |
| US-A-002 | As a platform admin, I want to suspend a tenant so that abuse stops immediately while verification stays live. | P1 | Issuance blocked ≤ 60 s; verify path unaffected |
| US-A-003 | As an SRE, I want an anchoring dashboard so that queue depth and failures are visible at a glance. | P0 | Failed anchor visible with retry action |
| US-A-004 | As an SRE, I want relayer wallet balance alerts so that anchoring never stalls on empty gas. | P0 | Alert below threshold; top-up runbook linked |
| US-A-005 | As an SRE, I want automatic RPC failover so that one provider outage doesn't stop the platform. | P0 | Provider-kill test transparent |
| US-A-006 | As a platform admin, I want feature flags per tenant so that risky features roll out gradually. | P1 | Flag flip changes behavior without deploy |
| US-A-007 | As a support engineer, I want read-only view-as so that I can reproduce tenant issues safely. | P1 | Session watermarked and audited |
| US-A-008 | As a security engineer, I want SIEM alerts on privilege changes so that insider risk is watched. | P0 | Simulated change alerts ≤ 5 min |
| US-A-009 | As a platform admin, I want per-tenant rate/quota controls so that one tenant can't starve others. | P1 | Quota change applies live |
| US-A-010 | As a fraud analyst, I want a case-management view of flags so that investigations are tracked. | P1 | Case lifecycle with assignee |
| US-A-011 | As a billing admin, I want usage metering reconciled with invoices so that revenue is accurate. | P1 | Metering matches processor records |
| US-A-012 | As an SRE, I want dead-letter queues with replay so that no issuance is silently lost. | P0 | Replay idempotent |
| US-A-013 | As a compliance officer, I want a DSR console so that erasure/access requests meet deadlines. | P1 | DSR completes within statutory window |
| US-A-014 | As a platform admin, I want maintenance banners so that planned work surprises no one. | P2 | Targeted banner displays |
| US-A-015 | As an SRE, I want distributed traces across services so that slow issuance is diagnosable. | P1 | Trace covers UI → queue → tx |
| US-A-016 | As a security engineer, I want an emergency pause on chain writes so that a contract incident is containable. | P0 | Pause halts anchors; verification unaffected |
| US-A-017 | As a platform admin, I want tenant health scores so that churn risk and misuse surface early. | P2 | Score from usage + failures + flags |
| US-A-018 | As an executive, I want a KPI dashboard so that board reporting is one click. | P1 | KPIs match section 1.7 definitions |

## 6.5 Developer / Integrator (15)

| ID | Story | Priority | Acceptance criteria |
|---|---|---|---|
| US-D-001 | As an integrator, I want an OpenAPI spec so that I can generate clients. | P0 | Spec valid; CI-checked against implementation |
| US-D-002 | As an integrator, I want a sandbox with test keys so that I never risk production data. | P0 | Sandbox isolated; testnet anchors |
| US-D-003 | As an integrator, I want idempotency keys so that retries are safe. | P0 | Duplicate POST returns original result |
| US-D-004 | As an integrator, I want signed webhooks so that I can trust event authenticity. | P1 | HMAC verification documented + sample code |
| US-D-005 | As an integrator, I want webhook delivery logs with replay so that missed events are recoverable. | P1 | Replay succeeds from UI |
| US-D-006 | As an integrator, I want async batch APIs with status polling so that big jobs don't need long connections. | P0 | 202 + status + completion webhook |
| US-D-007 | As an integrator, I want clear error codes and messages so that debugging is fast. | P0 | Error catalog documented; codes stable |
| US-D-008 | As an integrator, I want SDKs in JS and Python so that integration is hours not weeks. | P2 | Quickstart runs in < 15 min |
| US-D-009 | As an integrator, I want a Postman/Bruno collection so that I can explore quickly. | P1 | Collection published and current |
| US-D-010 | As an integrator, I want API changelogs and deprecation headers so that upgrades are planned. | P1 | Sunset headers on deprecated routes |
| US-D-011 | As an ERP vendor, I want field-mapping templates so that SIS imports are reusable. | P2 | Saved mapping re-applies |
| US-D-012 | As an open-source developer, I want the verifier library on npm/PyPI so that I can embed verification anywhere. | P1 | Package published, semver'd, documented |
| US-D-013 | As a wallet developer, I want OIDC4VCI/VP endpoints so that standard wallets interoperate. | P3 | Conformance wallet completes both flows |
| US-D-014 | As an integrator, I want contract ABIs and addresses documented so that I can read chain state directly. | P1 | Verified contracts + subgraph documented |
| US-D-015 | As an integrator, I want per-key scopes so that a leaked verify-only key can't issue. | P0 | Scope enforcement tested |

## 6.6 Government / Regulator (10)

| ID | Story | Priority | Acceptance criteria |
|---|---|---|---|
| US-G-001 | As a regulator, I want a read-only dashboard of issuance by institution so that oversight is data-driven. | P2 | Aggregates only; no PII |
| US-G-002 | As a regulator, I want accreditation status reflected in the issuer registry so that derecognized institutions are flagged. | P1 | Suspension propagates to verdicts |
| US-G-003 | As a regulator, I want fraud-report statistics by jurisdiction so that policy targets real problems. | P2 | Quarterly export |
| US-G-004 | As a ministry, I want data residency in-country so that sovereignty rules are met. | P0 | Region pinning proven by infra policy |
| US-G-005 | As a ministry, I want DigiLocker/NAD interop so that this complements national infrastructure. | P2 | Issuer bridge certified in DigiLocker sandbox |
| US-G-006 | As a regulator, I want to attest accredited issuers on-chain so that the registry carries official weight. | P3 | Regulator attestation event verifiable |
| US-G-007 | As a government verifier, I want free verification so that public services can check documents at no cost. | P0 | No paywall on verification |
| US-G-008 | As a regulator, I want breach notifications per DPDP so that incidents are legally handled. | P0 | Notification workflow tested in drill |
| US-G-009 | As a standards body, I want W3C VC conformance so that credentials interoperate nationally and internationally. | P1 | Passes conformance suite |
| US-G-010 | As a public auditor, I want the anchoring contracts to be open and verified so that public trust is inspectable. | P1 | Verified source on explorer |

## 6.7 Auditor (internal/external) (10)

| ID | Story | Priority | Acceptance criteria |
|---|---|---|---|
| US-AU-001 | As an auditor, I want an immutable audit trail so that evidence can't be quietly edited. | P0 | Tamper test detects modification |
| US-AU-002 | As an auditor, I want audit logs hash-anchored on-chain so that log integrity is provable. | P1 | Daily anchor verifiable |
| US-AU-003 | As an auditor, I want to reconstruct any past verification verdict so that disputes are resolvable. | P1 | Historical verdict reproduced from evidence |
| US-AU-004 | As an auditor, I want role/permission change history so that access reviews are complete. | P0 | Full change log per principal |
| US-AU-005 | As an auditor, I want SOC 2 evidence exports so that fieldwork is efficient. | P2 | Evidence pack per control |
| US-AU-006 | As an auditor, I want consent records tied to each data share so that lawful basis is demonstrable. | P0 | Consent retrievable per share |
| US-AU-007 | As an auditor, I want key-usage logs from KMS so that signing activity is accountable. | P1 | Every signature maps to a request + principal |
| US-AU-008 | As an auditor, I want segregation-of-duties reports so that maker-checker violations surface. | P1 | Report lists any same-person draft+approve |
| US-AU-009 | As an auditor, I want data-retention compliance reports so that purges are provable. | P2 | Purge job certificates listed |
| US-AU-010 | As a court-appointed expert, I want a notarizable evidence bundle so that a certificate's validity stands in legal proceedings. | P2 | Bundle format legally reviewed |

## 6.8 Internal QA / DevOps (12)

| ID | Story | Priority | Acceptance criteria |
|---|---|---|---|
| US-Q-001 | As a QA engineer, I want seeded test tenants and fixtures so that E2E tests are deterministic. | P0 | One-command seed script |
| US-Q-002 | As a QA engineer, I want a local chain (Anvil/Hardhat) in CI so that contract-dependent tests run fast. | P0 | CI suite runs with ephemeral chain |
| US-Q-003 | As a QA engineer, I want E2E coverage of the golden path (issue → anchor → claim → share → verify → revoke) so that regressions are caught. | P0 | Playwright suite green per PR |
| US-Q-004 | As a QA engineer, I want load-test scripts for verification bursts so that convocation day is pre-validated. | P1 | 5,000 RPS burst test passes SLO |
| US-Q-005 | As a DevOps engineer, I want IaC for all environments so that environments are reproducible. | P0 | Terraform plan clean; drift detection on |
| US-Q-006 | As a DevOps engineer, I want one-command preview environments per PR so that reviews test real behavior. | P2 | PR spins ephemeral env with testnet |
| US-Q-007 | As a DevOps engineer, I want zero-downtime deploys so that releases don't interrupt verification. | P1 | Deploy under load causes no 5xx spike |
| US-Q-008 | As an on-call engineer, I want actionable alerts tied to runbooks so that MTTR stays low. | P0 | Every page links a runbook |
| US-Q-009 | As a DevOps engineer, I want automated DB backup restore drills so that RPO/RTO are real. | P1 | Monthly drill report |
| US-Q-010 | As a QA engineer, I want contract fuzz/invariant tests so that anchoring math can't be broken by edge cases. | P0 | Foundry invariants pass in CI |
| US-Q-011 | As a security engineer, I want secret scanning + SCA gates in CI so that known-bad code never ships. | P0 | CI blocks on critical findings |
| US-Q-012 | As a release manager, I want feature-flagged progressive rollout so that blast radius is controlled. | P1 | Canary → 10% → 100% pipeline works |

## 6.9 Story Count Summary

| Persona | Count |
|---|---|
| Student / Holder | 30 |
| Institution | 32 |
| Employer / Verifier | 25 |
| Platform Admin / Ops | 18 |
| Developer / Integrator | 15 |
| Government / Regulator | 10 |
| Auditor | 10 |
| Internal QA / DevOps | 12 |
| **Total** | **152** |
