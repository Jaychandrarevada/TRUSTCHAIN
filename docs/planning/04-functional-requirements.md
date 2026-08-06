# 4. Functional Requirements

**Total: 221 requirements** across 16 categories.

**Priority scale:** P0 = MVP-critical · P1 = required for GA · P2 = post-GA / enterprise · P3 = future.
**Acceptance criteria** are stated as the single testable condition that closes the requirement (full test plans live in the QA suite).

## 4.1 Authentication & Identity (AUTH) — 18

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-AUTH-001 | Users register with email + password with mandatory email verification | P0 | — | Unverified accounts cannot log in; verification link expires in 24 h |
| FR-AUTH-002 | Passwords enforce policy (min 12 chars, breach-list check) | P0 | AUTH-001 | Weak/breached password rejected with actionable message |
| FR-AUTH-003 | Support TOTP-based MFA | P0 | AUTH-001 | Login with MFA enabled requires valid TOTP; recovery codes issued |
| FR-AUTH-004 | MFA mandatory for issuer-admin and platform-admin roles | P0 | AUTH-003 | Privileged role cannot perform actions until MFA enrolled |
| FR-AUTH-005 | OIDC/SAML SSO per tenant (Azure AD, Google Workspace, generic) | P1 | INST-001 | Tenant users authenticate via configured IdP; JIT provisioning maps roles |
| FR-AUTH-006 | Session management: JWT access (≤15 min) + rotating refresh tokens | P0 | AUTH-001 | Stolen refresh token invalidated on rotation reuse detection |
| FR-AUTH-007 | Role-based access control with predefined roles (Owner, Issuer Admin, Issuer Operator, Approver, Viewer, Holder, Verifier, Platform Admin) | P0 | — | Each API route enforces role matrix; unauthorized calls return 403 |
| FR-AUTH-008 | Fine-grained permissions overridable per tenant (custom roles) | P2 | AUTH-007 | Custom role restricted to selected permissions passes permission tests |
| FR-AUTH-009 | Account lockout after 5 failed attempts with exponential backoff | P0 | AUTH-001 | 6th attempt within window blocked; unlock via email or timeout |
| FR-AUTH-010 | Password reset via signed, single-use, 1-hour link | P0 | AUTH-001 | Used/expired link rejected; all sessions revoked on reset |
| FR-AUTH-011 | Holder (student) login via email OTP (passwordless option) | P1 | AUTH-001 | OTP valid 10 min, single use, rate-limited |
| FR-AUTH-012 | Each holder gets a platform-managed DID (did:key / did:web) at onboarding | P1 | STU-001 | DID resolvable; credential subject binds to holder DID |
| FR-AUTH-013 | Holders may link a self-managed DID/wallet (BYO-DID) | P3 | AUTH-012 | Ownership proven via challenge-response signature |
| FR-AUTH-014 | API authentication via scoped API keys (per tenant, per environment) | P0 | INST-001 | Key with `verify:read` scope cannot call issuance endpoints |
| FR-AUTH-015 | API keys support rotation and immediate revocation | P0 | AUTH-014 | Revoked key rejected within 60 s across all nodes |
| FR-AUTH-016 | OAuth2 client-credentials flow for machine-to-machine partners | P1 | AUTH-014 | Token issuance, expiry, and scope enforcement verified |
| FR-AUTH-017 | Admin impersonation ("login as tenant user") with consent flag + audit log | P2 | AUTH-007, AUD-001 | Impersonated session watermarked and fully logged |
| FR-AUTH-018 | Device/session list with remote logout for all users | P1 | AUTH-006 | User revokes a session; that session's next request fails |

## 4.2 Institution / Tenant Management (INST) — 15

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-INST-001 | Self-serve institution signup creating an isolated tenant | P0 | AUTH-001 | New tenant sees only its own data (row-level isolation verified) |
| FR-INST-002 | KYB verification workflow: institution uploads accreditation proof; platform admin approves before issuance rights granted | P0 | INST-001, ADM-002 | Unapproved tenant cannot anchor credentials |
| FR-INST-003 | Institution profile: legal name, logo, domains, accreditation IDs, public verification page branding | P0 | INST-001 | Profile renders on public verify page |
| FR-INST-004 | DNS-based domain ownership proof (TXT record) for issuer identity | P1 | INST-002 | did:web resolution matches verified domain |
| FR-INST-005 | On approval, issuer DID + keys registered in on-chain Issuer Registry | P0 | INST-002, BC-003 | Registry event emitted; verify page shows "accredited issuer" |
| FR-INST-006 | Multi-department support (sub-organizations with own operators/templates) | P1 | INST-001 | Department operator cannot see other departments' drafts |
| FR-INST-007 | Invite institution users by email with role assignment | P0 | AUTH-007 | Invitee lands with the assigned role; invites expire in 7 days |
| FR-INST-008 | Institution-level settings: default expiry, approval policy, notification prefs | P1 | INST-001 | Settings apply to subsequently issued credentials |
| FR-INST-009 | Issuer signing-key management: platform-custodied (KMS/HSM) by default | P0 | BC-002 | Private keys never exportable; signing only via service |
| FR-INST-010 | BYO-key option: institution holds keys in own HSM, signs via API | P2 | INST-009 | Externally signed batch verifies identically |
| FR-INST-011 | Key rotation with on-chain registry update and overlap window | P1 | INST-005 | Credentials signed pre-rotation still verify |
| FR-INST-012 | Institution suspension (by platform admin or regulator flag) halts issuance, keeps verification live | P1 | ADM-003 | Suspended tenant issuance blocked; existing certs verify with "issuer suspended" notice |
| FR-INST-013 | Tenant data export (full JSON/CSV dump) on demand | P1 | INST-001 | Export contains all credentials, logs, settings |
| FR-INST-014 | Tenant offboarding: data deletion per retention policy while chain anchors persist | P2 | INST-013 | PII removed; previously shared credentials verify with issuer-record notice |
| FR-INST-015 | Sandbox environment per tenant (testnet anchoring, watermarked certs) | P1 | BC-001 | Sandbox certs clearly non-production and excluded from analytics |

## 4.3 Templates & Credential Schemas (TPL) — 12

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-TPL-001 | Template designer: drag-drop layout with institution branding for the human-readable certificate (PDF/PNG) | P1 | INST-003 | Rendered PDF matches designed layout across sample data |
| FR-TPL-002 | Prebuilt templates: degree, diploma, marksheet, course completion, participation, employee training | P0 | — | Each template issues a valid credential end-to-end |
| FR-TPL-003 | Credential schema editor defining typed fields (string, number, date, enum, GPA scale) | P0 | — | Schema validation rejects out-of-type issuance data |
| FR-TPL-004 | Schemas map to W3C VC 2.0 credentialSubject with JSON-LD context | P0 | TPL-003 | Issued VC passes W3C VC validator |
| FR-TPL-005 | Open Badges 3.0 export mapping per schema | P1 | TPL-004 | Exported badge passes 1EdTech conformance checks |
| FR-TPL-006 | Template versioning; issued certificates pin the version used | P0 | TPL-001 | Editing a template never alters previously issued certs |
| FR-TPL-007 | Field-level disclosure flags (always public / holder-controlled / never in QR view) | P1 | TPL-003 | Public verify page hides holder-controlled fields absent consent |
| FR-TPL-008 | Multi-language template variants (min: English + one regional language) | P2 | TPL-001 | Language variant selected at issuance renders correctly |
| FR-TPL-009 | Dynamic QR code + verification URL auto-embedded in rendered artifact | P0 | VER-001 | Scanning printed QR opens correct verification page |
| FR-TPL-010 | Template approval workflow (design → review → publish) | P1 | INST-006 | Unpublished template cannot be used for issuance |
| FR-TPL-011 | Grading-system metadata (10-pt CGPA, 4-pt GPA, percentage, classification) with conversion notes | P2 | TPL-003 | Verifier page shows grading context |
| FR-TPL-012 | Template marketplace/sharing across departments of a tenant | P3 | TPL-010 | Shared template cloned with independent versioning |

## 4.4 Certificate Issuance (ISS) — 20

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-ISS-001 | Single-certificate issuance form with schema-driven validation | P0 | TPL-003 | Invalid field blocks submission with inline error |
| FR-ISS-002 | Bulk issuance via CSV/XLSX upload (≥ 50,000 rows per batch) | P0 | ISS-001 | 50k-row file validates, previews, and issues without timeout |
| FR-ISS-003 | Bulk upload dry-run: row-level validation report before commit | P0 | ISS-002 | Report lists every failing row with reason; zero certs issued in dry-run |
| FR-ISS-004 | Duplicate detection within batch and against history (same holder + credential type + period) | P0 | ISS-002 | Duplicate rows flagged; override requires approver role |
| FR-ISS-005 | SIS/ERP integration import (REST pull + SFTP drop) | P2 | ISS-002, API-001 | Records imported and mapped via saved field mapping |
| FR-ISS-006 | Maker-checker approval: operator drafts, approver releases batch | P0 | AUTH-007 | Unapproved batch cannot reach anchoring queue |
| FR-ISS-007 | Configurable multi-step approval chains (e.g., HoD → Registrar) | P2 | ISS-006 | Batch requires all configured approvals in order |
| FR-ISS-008 | Each certificate gets a globally unique, non-guessable ID (UUIDv7 + checksum) | P0 | — | ID collision probability tests pass; sequential guessing infeasible |
| FR-ISS-009 | Certificate content canonicalized (JCS) and hashed (SHA-256) with per-cert salt | P0 | ISS-008 | Same content always produces same hash; salt prevents rainbow lookup of PII |
| FR-ISS-010 | Certificates signed with issuer key as W3C VC (Data Integrity proof / SD-JWT) | P0 | INST-009, TPL-004 | Signature verifies against issuer DID document |
| FR-ISS-011 | Batch Merkle tree built over cert hashes; root queued for anchoring | P0 | ISS-009, BC-004 | Every cert stores its Merkle proof; proof validates against root |
| FR-ISS-012 | Rendered artifacts (PDF/PNG) generated and stored (S3 + optional IPFS pin) | P0 | TPL-001 | Artifact downloadable; IPFS CID recorded when enabled |
| FR-ISS-013 | Holder notification on issuance (email/SMS) with claim link | P0 | NOT-001 | Holder receives link; claim binds cert to holder account/DID |
| FR-ISS-014 | Unclaimed-certificate flow: cert verifiable pre-claim; claim requires OTP identity check | P0 | ISS-013 | Pre-claim verification works; claim transfers wallet visibility |
| FR-ISS-015 | Scheduled issuance (issue on convocation date) | P2 | ISS-006 | Batch anchors at scheduled time ±5 min |
| FR-ISS-016 | Draft persistence and resume for in-progress batches | P1 | ISS-002 | Browser crash does not lose validated batch state |
| FR-ISS-017 | Reissue/correction workflow: revoke old + issue corrected cert linked by supersedes-chain | P0 | REV-001 | Old cert shows "superseded" with pointer; new cert verifies |
| FR-ISS-018 | Backdated legacy import: institutions register historical certificates (marked as legacy-attested) | P1 | ISS-002 | Legacy certs verify with "attested retroactively on <date>" label |
| FR-ISS-019 | Issuance API for programmatic single/bulk issuance | P1 | API-001, ISS-006 | API batch follows same approval policy as UI |
| FR-ISS-020 | Per-batch issuance report (counts, hashes, anchor tx, failures) exportable PDF/CSV | P1 | ISS-011 | Report matches on-chain anchor data |

## 4.5 Blockchain & Anchoring (BC) — 15

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-BC-001 | Anchor Merkle roots to Polygon PoS mainnet (Amoy testnet for sandbox) | P0 | — | Anchor tx confirmed; root readable via contract call |
| FR-BC-002 | Platform relayer service manages gas wallets; institutions never touch crypto | P0 | — | Issuance completes with no user-side wallet interaction |
| FR-BC-003 | On-chain Issuer Registry contract (register, rotate keys, suspend, metadata URI) | P0 | — | Registry state changes emit events consumed by indexer |
| FR-BC-004 | Anchoring queue with batching window (configurable, default ≤ 10 min or ≥ N roots) | P0 | BC-002 | Roots anchor within window at p95 |
| FR-BC-005 | Idempotent anchoring: retry on failure without double-anchor | P0 | BC-004 | Simulated RPC failure results in exactly one on-chain root |
| FR-BC-006 | Confirmation tracking: pending → confirmed (N confirmations) → finalized state machine | P0 | BC-004 | UI/API reflect accurate anchor status transitions |
| FR-BC-007 | Chain reorg detection and automatic re-anchor | P1 | BC-006 | Injected reorg in test triggers re-anchor and alert |
| FR-BC-008 | Gas price strategy (EIP-1559 fee oracle, cap + alerting) | P0 | BC-002 | Anchors succeed under fee spikes without exceeding cap unnoticed |
| FR-BC-009 | On-chain Revocation Registry (status-list roots / revocation events) | P0 | BC-003 | Revocation reflected in verification within 5 min |
| FR-BC-010 | Multi-chain abstraction layer (chain adapters) for future chains | P2 | BC-001 | Second-chain adapter passes same anchoring contract tests |
| FR-BC-011 | Independent verification data: publish issuer registry + anchor index as open data (The Graph subgraph) | P1 | BC-003 | Third party reconstructs verification with no TrustChain API |
| FR-BC-012 | Gas spend accounting per tenant/batch for billing and monitoring | P1 | BC-004, BIL-001 | Per-batch gas cost visible in tenant report |
| FR-BC-013 | Hot-wallet security: relayer keys in KMS; balance threshold alerts; cold top-up procedure | P0 | BC-002 | Key never in env/plaintext; low-balance alert fires |
| FR-BC-014 | Contract upgradeability via UUPS proxy with timelock + multisig | P0 | BC-003 | Upgrade only executable by multisig after timelock delay |
| FR-BC-015 | Public contract addresses + ABI documentation page | P1 | BC-011 | Docs page lists verified (Sourcify/Polygonscan) contracts |

## 4.6 Verification (VER) — 18

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-VER-001 | Public verification page per certificate (no login) at stable URL | P0 | ISS-008 | Verdict renders < 3 s p95 |
| FR-VER-002 | QR-code scan → verification page | P0 | TPL-009, VER-001 | Phone camera scan resolves to correct cert |
| FR-VER-003 | Verification checks: hash integrity, Merkle proof, on-chain anchor, issuer registry status, revocation status, expiry, holder binding | P0 | BC-001..009 | Each check individually surfaced in verdict breakdown |
| FR-VER-004 | Clear verdicts: VALID / REVOKED / SUPERSEDED / EXPIRED / TAMPERED / UNKNOWN ISSUER / SUSPENDED ISSUER | P0 | VER-003 | Each state renders distinct explanation and color-safe iconography |
| FR-VER-005 | File-upload verification: drop a PDF/JSON credential; platform recomputes hash and verifies | P0 | VER-003 | Tampered file yields TAMPERED with mismatch details |
| FR-VER-006 | Verification by certificate ID lookup | P1 | VER-001 | ID search rate-limited to prevent enumeration |
| FR-VER-007 | Bulk verification: CSV of IDs/URLs → report | P1 | VER-003 | 1,000-row bulk verify completes < 60 s |
| FR-VER-008 | Verification REST API with per-key quotas | P0 | API-001 | API verdict identical to web verdict for same cert |
| FR-VER-009 | Verification result includes machine-readable proof bundle (VC, Merkle proof, tx hash, block) | P1 | VER-008 | Bundle re-verifiable offline by open-source CLI |
| FR-VER-010 | Open-source standalone verifier CLI/library (works without TrustChain servers) | P1 | BC-011, VER-009 | CLI verifies bundle using only a public RPC endpoint |
| FR-VER-011 | Selective-disclosure presentation: holder chooses fields; verifier sees only disclosed subset with intact proof | P1 | TPL-007, STU-006 | Hidden fields absent yet signature validates (SD-JWT) |
| FR-VER-012 | Share-link controls: expiring links, max-view counts, PIN protection | P1 | STU-005 | Expired/over-limit link renders "link expired," not cert data |
| FR-VER-013 | Verifier identity capture (optional): verifications can request verifier name/org for holder visibility | P2 | VER-001 | Holder sees who verified when verifier self-identified |
| FR-VER-014 | Anti-enumeration and rate limiting on all public verification surfaces | P0 | VER-006 | Automated scan blocked; legitimate burst allowed |
| FR-VER-015 | Verification records logged (timestamp, channel, result, coarse geo) for analytics | P1 | ANA-001 | Log excludes verifier PII unless volunteered |
| FR-VER-016 | Offline verification mode: signed static bundle + cached chain state validate without network | P3 | VER-010 | Airplane-mode CLI verification passes with warning about revocation staleness |
| FR-VER-017 | Embeddable verification widget/badge for institution and holder websites | P2 | VER-001 | Iframe/JS badge shows live verdict |
| FR-VER-018 | Legacy-document verification: upload of non-TrustChain certificate routes to AI forgery screening + manual institution confirmation workflow | P2 | AI-001 | Result clearly labeled "assisted opinion," never blockchain-verified verdict |

## 4.7 Revocation & Lifecycle (REV) — 12

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-REV-001 | Issuer can revoke a certificate with reason code (fraud, error, misconduct, superseded, holder request) | P0 | BC-009 | Revocation live in verification ≤ 5 min; reason shown per policy |
| FR-REV-002 | Revocation requires approver role + second-person confirmation | P0 | ISS-006 | Single operator cannot complete revocation |
| FR-REV-003 | Bulk revocation (batch recall) with impact preview | P1 | REV-001 | Preview lists affected holders before commit |
| FR-REV-004 | Revocation is irreversible; corrections use supersede-and-reissue | P0 | ISS-017 | Attempted "un-revoke" is rejected; supersede flow offered |
| FR-REV-005 | Holder notified on revocation with reason and appeal channel | P0 | NOT-001 | Notification sent; appeal creates case for issuer |
| FR-REV-006 | Verifier webhook notification for previously verified certs that later get revoked (watch list) | P2 | API-005 | Watching verifier receives webhook within 10 min of revocation |
| FR-REV-007 | Certificate expiry support (fixed date or validity period) with auto-expired verdict | P1 | TPL-003 | Expired cert renders EXPIRED, not VALID |
| FR-REV-008 | Renewal flow for expiring credentials (re-attest without full reissue) | P2 | REV-007 | Renewed cert links to prior period |
| FR-REV-009 | Suspension state (temporary hold, e.g., pending investigation) distinct from revocation | P2 | REV-001 | SUSPENDED verdict reversible; audit trail complete |
| FR-REV-010 | Status list published as W3C Bitstring Status List credential + on-chain root | P1 | BC-009 | Third-party VC verifier resolves status correctly |
| FR-REV-011 | Revocation reason visibility policy configurable (public / verifier-only / private) | P1 | REV-001 | Public page shows only permitted detail level |
| FR-REV-012 | Full lifecycle timeline per certificate (issued → claimed → verified × N → revoked/superseded) | P1 | AUD-001 | Timeline API returns ordered events with actor + tx references |

## 4.8 Student / Holder Wallet (STU) — 15

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-STU-001 | Holder dashboard listing all owned credentials across institutions | P0 | ISS-014 | Certs from 2 tenants appear in one wallet |
| FR-STU-002 | Certificate detail view: rendered artifact, status, chain proof, history | P0 | STU-001 | Detail matches public verification verdict |
| FR-STU-003 | Download as PDF, PNG, W3C VC JSON, Open Badges 3.0 | P0/P1 | TPL-004/005 | Each format downloads and validates (VC JSON P0; OB3 P1) |
| FR-STU-004 | Claim flow: OTP + identity-field match binds unclaimed cert to account | P0 | ISS-014 | Mismatched identity cannot claim; disputes route to issuer |
| FR-STU-005 | Share via link, QR, email with per-share controls (expiry, views, PIN, field selection) | P0 | VER-012 | Share created with expiry enforces it |
| FR-STU-006 | Selective disclosure builder: choose fields per share | P1 | VER-011 | Verifier page shows only selected fields |
| FR-STU-007 | Share-activity log: when/where each share was viewed | P1 | VER-015 | Holder sees view events per share link |
| FR-STU-008 | Revoke a share link at any time | P0 | STU-005 | Revoked link stops resolving ≤ 60 s |
| FR-STU-009 | Profile with contact info, notification prefs, linked DIDs | P1 | AUTH-012 | Changes to email require re-verification |
| FR-STU-010 | Export all my data (DPDP/GDPR data portability) | P1 | — | Export delivered ≤ 72 h containing all holder data |
| FR-STU-011 | Request correction: structured dispute to issuer with evidence upload | P1 | ISS-017 | Issuer receives case; holder tracks state |
| FR-STU-012 | Push credential to DigiLocker (India) via issuer bridge | P2 | INT: DigiLocker | Credential appears in holder's DigiLocker issued-docs |
| FR-STU-013 | LinkedIn "Add to profile" deep link with verification URL | P2 | STU-005 | LinkedIn certification entry links to live verify page |
| FR-STU-014 | Progressive Web App with offline access to owned artifacts | P2 | STU-001 | Airplane-mode wallet shows cached certs (marked as cached) |
| FR-STU-015 | Account merge (student email → personal email after graduation) with issuer-verified identity continuity | P1 | AUTH-001 | Old-email cert access preserved post-merge; audit logged |

## 4.9 Employer / Verifier Portal (EMP) — 12

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-EMP-001 | Employer organization accounts with team members | P1 | AUTH-007 | Org members share verification history |
| FR-EMP-002 | Verification history with notes/tags per candidate | P1 | EMP-001 | Past verification retrievable with original verdict snapshot |
| FR-EMP-003 | Bulk candidate verification (CSV upload of links/IDs) | P1 | VER-007 | Report emailed + downloadable |
| FR-EMP-004 | Candidate consent flow: employer requests credential; holder approves scope | P2 | STU-006 | Data visible only after holder consent; consent recorded |
| FR-EMP-005 | ATS integrations (Greenhouse, Lever, generic webhook/Zapier) | P2 | API-005 | Verification triggered from ATS stage change |
| FR-EMP-006 | Watch list: monitor verified credentials for later revocation | P2 | REV-006 | Revocation triggers alert to watching org |
| FR-EMP-007 | Verification certificates: signed PDF attestation of a verification event for audit files | P2 | VER-009 | Attestation itself verifiable by hash |
| FR-EMP-008 | Employer API with volume tiers and usage dashboard | P1 | API-001, BIL-002 | Quota enforcement + usage graphs accurate |
| FR-EMP-009 | Background-check partner white-label verification endpoint | P3 | EMP-008 | Partner branding on verification report |
| FR-EMP-010 | Fraud-report button: verifier flags suspicious credential to issuer + platform | P1 | ADM-008 | Flag creates case; repeated flags raise cert risk score |
| FR-EMP-011 | Talent-pool proofs (P3, opt-in): candidates share credentials to employer pools | P3 | EMP-004 | Only opted-in holders discoverable |
| FR-EMP-012 | SLA-backed enterprise verification tier (dedicated quota, support) | P2 | BIL-003 | Tier limits and SLA reporting enforced |

## 4.10 Platform Administration (ADM) — 15

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-ADM-001 | Platform admin console (separate app/subdomain, MFA + IP allowlist) | P0 | AUTH-004 | Console unreachable from public internet paths without allowlist |
| FR-ADM-002 | Tenant approval queue with KYB document review | P0 | INST-002 | Approve/reject with reason; SLA timer visible |
| FR-ADM-003 | Tenant lifecycle controls: suspend, limit, restore, offboard | P1 | INST-012 | Each action takes effect ≤ 60 s and is audited |
| FR-ADM-004 | Global search across tenants/certs/users (privacy-scoped) | P1 | ADM-001 | Search results respect data-access policy |
| FR-ADM-005 | Anchoring operations dashboard: queue depth, gas spend, wallet balances, failed txs | P0 | BC-004 | Failed anchor visible with one-click retry |
| FR-ADM-006 | Feature flags per tenant/plan | P1 | — | Flag flip changes behavior without deploy |
| FR-ADM-007 | Rate-limit and quota configuration per tenant/key | P1 | API-002 | Config change applies without restart |
| FR-ADM-008 | Abuse/fraud case management (flags, investigations, outcomes) | P1 | EMP-010 | Case workflow states tracked with assignee |
| FR-ADM-009 | Announcement/banner system (maintenance notices per audience) | P2 | — | Banner targets selected tenants/roles |
| FR-ADM-010 | Support tooling: view-as (read-only) tenant context | P1 | AUTH-017 | All support access audit-logged |
| FR-ADM-011 | System health dashboard (SLO burn, error rates, chain RPC health) | P0 | MON stack | On-call sees red/amber/green per subsystem |
| FR-ADM-012 | Manual anchor override & replay tools (dead-letter queue handling) | P1 | BC-005 | Replayed job maintains idempotency |
| FR-ADM-013 | Regulator read-only portal (issuance stats, accreditation status, fraud reports by jurisdiction) | P2 | ANA-004 | Regulator sees aggregates, never raw PII |
| FR-ADM-014 | Data-subject-request console (DPDP/GDPR erasure, access, correction) | P1 | STU-010 | Erasure completes within statutory window; chain anchors unaffected |
| FR-ADM-015 | Platform configuration as code (env-scoped, versioned, reviewed) | P1 | DevOps | Config change traceable to PR |

## 4.11 APIs & Integrations (API) — 15

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-API-001 | Versioned public REST API (`/v1`) with OpenAPI 3.1 spec | P0 | AUTH-014 | Spec published; CI validates implementation against spec |
| FR-API-002 | Global + per-key rate limiting with standard headers (429, Retry-After) | P0 | API-001 | Limits enforced; headers correct |
| FR-API-003 | GraphQL API for issuer/holder dashboards (internal-first, partner later) | P1 | API-001 | Persisted queries only in production |
| FR-API-004 | Idempotency keys on all mutating endpoints | P0 | API-001 | Duplicate POST with same key returns original result |
| FR-API-005 | Webhooks: certificate.issued, claimed, revoked, verified, batch.anchored, issuer.updated — signed (HMAC), retried with backoff | P1 | — | Consumer verifies signature; failed delivery retries ≤ 24 h then DLQ |
| FR-API-006 | Webhook management UI (endpoints, secrets, event filter, delivery log, replay) | P1 | API-005 | Replay of failed delivery succeeds |
| FR-API-007 | SDKs: JavaScript/TypeScript and Python | P2 | API-001 | SDK examples run against sandbox |
| FR-API-008 | DigiLocker issuer integration (push issued docs) | P2 | Gov approval | Cert visible in DigiLocker sandbox |
| FR-API-009 | OIDC4VCI credential issuance endpoint (wallet-initiated claim) | P3 | AUTH-013 | Standards-compliant wallet completes claim |
| FR-API-010 | OIDC4VP presentation endpoint (wallet-initiated verification) | P3 | VER-011 | Standards-compliant wallet presents; verdict correct |
| FR-API-011 | Zapier/Make connectors for no-code workflows | P3 | API-005 | Published connector passes marketplace review |
| FR-API-012 | Batch async API pattern (202 + status polling + completion webhook) for jobs > 30 s | P0 | API-001 | 50k bulk job trackable to completion |
| FR-API-013 | API changelog + deprecation policy (≥ 6 months notice, sunset headers) | P1 | API-001 | Deprecated endpoint emits Sunset header |
| FR-API-014 | Sandbox API environment with testnet anchoring and fake-data generator | P0 | INST-015 | Sandbox key cannot touch production data |
| FR-API-015 | Institution-to-institution verification API (transcript exchange for admissions) | P2 | VER-008 | Receiving institution retrieves consented transcript VC |

## 4.12 Notifications (NOT) — 10

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-NOT-001 | Transactional email service with templated, localized messages | P0 | — | All lifecycle emails delivered with correct locale |
| FR-NOT-002 | SMS notifications for claim links and OTP (India DLT-compliant sender) | P1 | NOT-001 | SMS delivered via registered template |
| FR-NOT-003 | In-app notification center with read state | P1 | — | Events appear ≤ 30 s after trigger |
| FR-NOT-004 | Per-user notification preferences (channel × event matrix) | P1 | NOT-003 | Opt-outs honored except mandatory security notices |
| FR-NOT-005 | Digest mode (daily/weekly summaries for high-volume issuers) | P2 | NOT-004 | Digest aggregates events since last digest |
| FR-NOT-006 | Security alerts (new device login, key rotation, role change) — non-optoutable | P0 | AUTH-018 | Alert sent for each security event |
| FR-NOT-007 | Batch progress notifications (validated, approved, anchored, failed) | P0 | ISS-006 | Operator informed at each state change |
| FR-NOT-008 | Expiry reminders to holders and issuers (90/30/7 days) | P2 | REV-007 | Reminder schedule fires correctly |
| FR-NOT-009 | Delivery tracking + bounce handling with automatic email-status flag | P1 | NOT-001 | Hard bounce marks address invalid and surfaces in issuer UI |
| FR-NOT-010 | Webhook + email failover (if holder email bounces, issuer notified to correct) | P1 | NOT-009 | Issuer sees undeliverable-holder queue |

## 4.13 Analytics & Reporting (ANA) — 12

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-ANA-001 | Issuer dashboard: issuance volume, verification counts, geography, channel mix | P1 | VER-015 | Metrics match raw event counts ±0 |
| FR-ANA-002 | Per-certificate verification analytics (views over time) | P1 | ANA-001 | Chart matches event log |
| FR-ANA-003 | Platform analytics for admins (tenant growth, anchoring costs, API usage) | P1 | ANA-001 | Dashboards refresh ≤ 15 min lag |
| FR-ANA-004 | Regulator aggregate reports (jurisdiction issuance/fraud stats, no PII) | P2 | ADM-013 | Export passes PII scan |
| FR-ANA-005 | Scheduled report exports (CSV/PDF, email delivery) | P2 | ANA-001 | Weekly schedule delivers on time |
| FR-ANA-006 | Verification funnel analytics (scan → view → proof download) | P2 | ANA-002 | Funnel steps instrumented |
| FR-ANA-007 | Fraud analytics: flagged certs, tamper attempts, enumeration attempts | P1 | EMP-010, VER-014 | Security team dashboard shows trend + drill-down |
| FR-ANA-008 | Cost analytics: gas per batch/tenant, infra unit economics | P1 | BC-012 | Finance export reconciles with chain explorer |
| FR-ANA-009 | Holder engagement metrics for issuers (claim rate, share rate) | P2 | STU-004 | Claim-rate metric matches cohort query |
| FR-ANA-010 | Custom date-range and cohort filters on all dashboards | P2 | ANA-001 | Filters compose correctly |
| FR-ANA-011 | Data warehouse export (S3/Parquet or BigQuery share) for enterprise tenants | P3 | ANA-001 | Nightly export lands with schema contract |
| FR-ANA-012 | Anonymized benchmark reports (tenant vs. sector median) | P3 | ANA-011 | No tenant identifiable from benchmarks |

## 4.14 Audit & Compliance (AUD) — 12

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-AUD-001 | Append-only audit log for every privileged action (who, what, when, where, before/after) | P0 | — | Log write failure blocks the action (fail-closed) |
| FR-AUD-002 | Audit log tamper-evidence: daily hash chained and anchored on-chain | P1 | BC-001 | Modified historical log detectable via hash chain |
| FR-AUD-003 | Tenant-scoped audit log viewer with filters and export | P1 | AUD-001 | Registrar reproduces "who revoked cert X" in ≤ 3 clicks |
| FR-AUD-004 | Consent records: every holder consent (share, employer request, DigiLocker push) stored with scope + timestamp | P0 | STU-005 | Consent retrievable per data-subject request |
| FR-AUD-005 | DPDP (India) compliance: purpose limitation, consent manager readiness, breach notification workflow | P0 | ADM-014 | DPIA completed; breach runbook tested |
| FR-AUD-006 | GDPR compliance for international tenants (erasure, portability, SCCs) | P1 | ADM-014 | Erasure removes PII in ≤ 30 days incl. backup cycles |
| FR-AUD-007 | Data-retention policies configurable per tenant within legal bounds | P1 | AUD-006 | Expired data purged by scheduled job with certificate of destruction |
| FR-AUD-008 | PII encryption at rest (field-level for sensitive columns) and in transit | P0 | — | DB dump exposes no plaintext PII |
| FR-AUD-009 | SOC 2 Type II readiness: control mapping, evidence collection automation | P2 | AUD-001 | Evidence pack generated per control per quarter |
| FR-AUD-010 | Right-to-correction workflow with issuer adjudication and audit trail | P1 | STU-011 | Correction resolves via supersede flow, fully logged |
| FR-AUD-011 | Legal-hold: freeze deletion for specified records under investigation | P2 | AUD-007 | Held records survive retention purge |
| FR-AUD-012 | Chain-of-custody export for legal proceedings (cert + proofs + logs, notarized bundle) | P2 | VER-009, AUD-002 | Bundle accepted format for affidavit annexure |

## 4.15 AI Features (AI) — 10

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-AI-001 | Document forgery screening: uploaded legacy certificates scored for tampering (font/ELA/metadata/layout anomalies) | P2 | VER-018 | Known-forgery test set ≥ 90% recall at ≤ 5% false-positive |
| FR-AI-002 | Issuance anomaly detection (volume spikes, off-hours issuance, unusual grade distributions) | P2 | ANA-001 | Injected anomaly raises alert within 1 cycle |
| FR-AI-003 | Verification-pattern anomaly detection (enumeration, scraping, geo anomalies) | P2 | VER-015 | Synthetic attack traffic flagged |
| FR-AI-004 | Entity resolution across name variants/transliterations for claim matching | P2 | STU-004 | Devanagari/Latin transliteration pairs matched ≥ 95% precision |
| FR-AI-005 | OCR + field extraction for legacy-certificate digitization | P2 | ISS-018 | Extraction accuracy ≥ 98% on printed certificates; human review queue for low confidence |
| FR-AI-006 | Natural-language verification assistant ("Is this certificate valid? What does CGPA 8.2 mean here?") | P3 | VER-003 | Assistant answers grounded only in verified data with citations |
| FR-AI-007 | Issuer copilot: draft schema/template from an uploaded sample certificate | P3 | TPL-003 | Generated schema requires ≤ 2 manual corrections on average |
| FR-AI-008 | Fraud-risk scoring per certificate combining signals (flags, anomalies, issuer history) | P2 | AI-002/003 | Score visible to admins; never auto-revokes |
| FR-AI-009 | AI outputs always human-in-the-loop: no autonomous revocation/rejection | P0 (policy) | AI-* | Audit shows human decision on every AI-flagged action |
| FR-AI-010 | Model governance: versioning, evaluation reports, bias review for name matching | P2 | AI-004 | Each model release ships eval card |

## 4.16 Billing & Subscription (BIL) — 10

| ID | Requirement | Priority | Depends on | Acceptance criteria |
|---|---|---|---|---|
| FR-BIL-001 | Plan tiers: Free (sandbox), Starter, Institution, Enterprise with feature/quota matrix | P1 | ADM-006 | Tier limits enforced at API and UI |
| FR-BIL-002 | Usage metering: certificates issued, verifications, API calls, storage | P1 | BC-012 | Metered usage matches event counts |
| FR-BIL-003 | Subscription management: upgrade/downgrade, proration, invoicing (Stripe + Razorpay for India) | P1 | BIL-001 | Payment success/failure webhooks update entitlements ≤ 60 s |
| FR-BIL-004 | GST/tax-compliant invoices (India) with institution GSTIN | P1 | BIL-003 | Invoice passes GST format validation |
| FR-BIL-005 | Overage handling: soft warning → grace → throttle (never block verification) | P1 | BIL-002 | Verification path unaffected by tenant nonpayment |
| FR-BIL-006 | Purchase orders / offline invoicing for government & university procurement | P2 | BIL-003 | Manual invoice cycle supported with entitlement activation |
| FR-BIL-007 | Public-good policy: holder wallet and public verification free forever | P0 (policy) | — | No paywall exists on holder/verifier basic paths |
| FR-BIL-008 | Billing admin portal per tenant (invoices, usage, payment methods) | P1 | BIL-003 | Tenant owner downloads invoices self-serve |
| FR-BIL-009 | Trial period with automated conversion prompts | P2 | BIL-001 | Trial expiry downgrades gracefully without data loss |
| FR-BIL-010 | Revenue/finance reporting export for accounting | P2 | BIL-002 | Monthly export reconciles with payment processor |

## 4.17 Requirement Summary

| Category | Count | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|
| AUTH | 18 | 8 | 6 | 3 | 1 |
| INST | 15 | 6 | 6 | 3 | 0 |
| TPL | 12 | 4 | 4 | 3 | 1 |
| ISS | 20 | 12 | 4 | 4 | 0 |
| BC | 15 | 9 | 4 | 2 | 0 |
| VER | 18 | 7 | 6 | 4 | 1 |
| REV | 12 | 5 | 4 | 3 | 0 |
| STU | 15 | 6 | 6 | 3 | 0 |
| EMP | 12 | 0 | 5 | 5 | 2 |
| ADM | 15 | 4 | 9 | 2 | 0 |
| API | 15 | 5 | 4 | 3 | 3 |
| NOT | 10 | 3 | 5 | 2 | 0 |
| ANA | 12 | 0 | 6 | 4 | 2 |
| AUD | 12 | 4 | 5 | 3 | 0 |
| AI | 10 | 1 | 0 | 7 | 2 |
| BIL | 10 | 1 | 6 | 3 | 0 |
| **Total** | **221** | **75** | **80** | **54** | **12** |
