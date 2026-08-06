# 7. Use Cases

14 detailed use cases covering the primary system behaviors. Format: actors, preconditions, main flow, alternative flows (A-x), exceptions (E-x), postconditions.

---

## UC-01: Institution Onboarding & Accreditation Approval

**Actors:** Institution Owner (primary), Platform Admin, Issuer Registry contract (system).
**Preconditions:** None.
**Trigger:** Institution signs up.

**Main flow:**
1. Owner registers account (email verify, MFA enroll).
2. Owner creates institution tenant: legal name, type, accreditation body + ID, uploads proof documents.
3. Owner proves domain ownership via DNS TXT record.
4. Platform Admin reviews KYB queue: checks accreditation registry (UGC/AICTE/board), documents, domain.
5. Admin approves. System generates issuer DID + signing key in KMS, registers issuer on-chain (IssuerRegistry.registerIssuer), emits event.
6. Tenant unlocked for production issuance; owner notified; onboarding checklist (templates, users, sandbox test) presented.

**Alternative flows:**
- A-1 (step 4): Admin requests more documents → tenant in "info requested" state; owner resubmits → return to step 4.
- A-2 (step 3): Institution has no domain admin access → fallback verification via official-email challenge + enhanced manual review.
- A-3: Regulator pre-attested institution (allowlist) → fast-track approval.

**Exceptions:**
- E-1: Accreditation cannot be confirmed → reject with reason; appeal channel; audit-logged.
- E-2: Duplicate tenant for same institution → merge workflow, not second tenant.
- E-3: On-chain registration tx fails → retry with idempotency; tenant stays "approved, activation pending"; ops alert.

**Postconditions:** Tenant active; issuer resolvable on-chain; all steps audit-logged.

---

## UC-02: Bulk Certificate Issuance (Convocation Batch)

**Actors:** Issuer Operator (primary), Approver, Anchoring Service, Relayer, CertificateAnchor contract.
**Preconditions:** UC-01 complete; published template + schema; operator + approver roles exist.
**Trigger:** Operator uploads graduate CSV.

**Main flow:**
1. Operator selects template/schema, uploads CSV (e.g., 8,000 rows).
2. System validates rows (types, required fields, duplicates vs. batch and history); produces dry-run report.
3. Operator fixes/excludes failing rows; previews sample rendered certificates.
4. Operator submits batch for approval.
5. Approver reviews summary (counts, sample, anomalies) and approves.
6. System: canonicalizes each cert → salted SHA-256 hash → builds Merkle tree → signs each VC with issuer key → stores VC + artifacts (S3/IPFS) → queues root.
7. Anchoring service batches root into next anchor window; relayer submits tx; waits confirmations; marks batch ANCHORED.
8. Holders notified with claim links; issuance report generated.

**Alternative flows:**
- A-1 (step 5): Approver rejects with comments → batch back to draft.
- A-2 (step 1): API-initiated batch (ERP) → same pipeline from step 2.
- A-3 (step 7): Scheduled anchoring → holds queue until scheduled time.
- A-4: Multi-step approval chain → sequential approvals before step 6.

**Exceptions:**
- E-1 (step 2): >20% rows invalid → batch blocked pending data-quality confirmation.
- E-2 (step 7): Tx fails (gas spike/RPC outage) → exponential retry, alternate RPC, ops alert at 3 failures; batch remains "anchoring"; no partial state.
- E-3 (step 7): Reorg drops anchor block → detector re-anchors automatically; event logged.
- E-4 (step 6): Signing service unavailable → batch paused fail-closed; no unsigned certs released.

**Postconditions:** Every cert has Merkle proof to an on-chain root; report links tx hash; audit trail complete.

---

## UC-03: Student Claims a Certificate

**Actors:** Student (primary), Notification Service.
**Preconditions:** Certificate issued with holder email/phone on record.
**Trigger:** Student opens claim link.

**Main flow:**
1. Student opens claim link from email/SMS.
2. If no account: creates one (or OTP passwordless) with the same contact.
3. System sends OTP; student enters it.
4. System matches claim identity fields (e.g., DOB + roll number) against certificate data.
5. Certificate binds to student account/DID; appears in wallet; issuer sees "claimed."

**Alternative flows:**
- A-1: Student already has account with different email → logs in, adds/verifies the contact the cert was issued to, then claims.
- A-2: Certificate never claimed → remains fully verifiable; issuer sees unclaimed list and can re-notify or correct contact.

**Exceptions:**
- E-1: Identity fields mismatch → claim denied; dispute case offered (routes to issuer, UC-09).
- E-2: OTP brute-force attempt → rate limit + lockout + security alert.
- E-3: Claim link forwarded to wrong person → OTP goes to registered contact only; interceptor cannot claim.

**Postconditions:** Cert visible in wallet; claim event on timeline; consent baseline recorded.

---

## UC-04: Public Verification via QR

**Actors:** Verifier (anonymous, primary), Verification Service, chain RPC/indexer.
**Preconditions:** Certificate anchored.
**Trigger:** Verifier scans QR / opens URL.

**Main flow:**
1. Verifier scans QR on certificate → verification URL opens.
2. Service loads cert record, recomputes content hash, validates Merkle proof against on-chain root (cached indexer state, chain-confirmed).
3. Service checks issuer registry status, revocation status list, expiry, supersession.
4. Page renders verdict (VALID) with breakdown: issuer identity + accreditation, issue date, disclosed fields, anchor tx link, status checks.
5. Verification event logged (coarse, no verifier PII).

**Alternative flows:**
- A-1: Share link with field selection → only disclosed fields shown; verdict identical.
- A-2: Verifier downloads machine-readable proof bundle for records.
- A-3: Indexer cache stale → service falls back to direct RPC read (slower, still < 5 s).
- A-4: Verifier uses open-source CLI with the bundle → verifies with zero TrustChain dependency.

**Exceptions:**
- E-1: Hash mismatch → TAMPERED verdict with guidance ("do not trust; report").
- E-2: Cert revoked → REVOKED with permitted reason detail and revocation date.
- E-3: Issuer suspended → cert-level checks shown + prominent "issuer currently suspended" warning.
- E-4: Link expired/over view limit/PIN failed → no certificate data rendered.
- E-5: Chain RPC fully unavailable → verdict from last-finalized cached state with staleness banner; hard failure only if cache also unavailable.

**Postconditions:** Verdict delivered ≤ 3 s p95; event logged; holder can see view event (for share links).

---

## UC-05: Certificate Revocation (Malpractice)

**Actors:** Issuer Approver ×2 (primary), Revocation Registry contract, Holder, watching Verifiers.
**Preconditions:** Cert anchored; two users with approver rights.
**Trigger:** Disciplinary committee outcome requires revocation.

**Main flow:**
1. Approver A initiates revocation: selects cert, reason code (malpractice), attaches case reference, sets reason-visibility policy.
2. Approver B (different person, enforced) reviews and confirms.
3. System updates status list, anchors new status root on-chain, emits revocation event.
4. Verification flips to REVOKED ≤ 5 min.
5. Holder notified with reason + appeal channel; watching verifiers receive webhooks.

**Alternative flows:**
- A-1: Bulk revocation of a compromised batch → impact preview, then same two-person flow.
- A-2: Temporary suspension instead (pending investigation) → SUSPENDED state, reversible.

**Exceptions:**
- E-1: Second approver rejects → revocation aborted, logged.
- E-2: Status-anchor tx fails → status shown "revocation pending" (fail-safe: verification already flags pending revocation off-chain); retry until anchored.
- E-3: Wrong certificate revoked → cannot un-revoke; corrective path = supersede-and-reissue (UC-06) + public note; incident logged.

**Postconditions:** Irreversible revocation on-chain; complete evidence trail.

---

## UC-06: Correction via Supersede-and-Reissue

**Actors:** Issuer Operator, Approver, Holder.
**Preconditions:** Issued cert contains an error (e.g., name typo).
**Trigger:** Issuer accepts a correction (often from UC-09 dispute).

**Main flow:**
1. Operator opens cert → "correct & reissue"; edits fields; diff displayed.
2. Approver approves correction.
3. System issues new cert (new ID, new hash, anchored in next batch) with `supersedes` link; old cert auto-marked SUPERSEDED (status list) pointing to successor.
4. Holder notified; new cert lands in wallet; old share links show SUPERSEDED verdict with forward pointer.

**Exceptions:**
- E-1: Correction changes identity-critical fields (different person!) → blocked; requires revoke + fresh issuance with re-claim.
- E-2: Holder disputes the "correction" → case reopened; supersession is transparent in timeline either way.

**Postconditions:** Clean cryptographic chain old→new; no history erased.

---

## UC-07: Employer Bulk Verification via API (ATS)

**Actors:** Employer System (primary), Verification API.
**Preconditions:** Employer org with API key (`verify:read`, batch scope).
**Trigger:** ATS stage change ("offer") for N candidates.

**Main flow:**
1. ATS calls `POST /v1/verifications/batch` with candidate credential URLs/IDs + idempotency key.
2. API returns 202 + job ID.
3. Service verifies each item (as UC-04 checks); compiles report.
4. Completion webhook fires; ATS fetches results; verdicts attached to candidate records.

**Alternative flows:**
- A-1: Employer subscribes results to watch list → future revocations push webhooks (UC-05 step 5).
- A-2: Some items are share-links requiring PIN/consent → marked CONSENT_REQUIRED; consent request sent to holders (UC-08).

**Exceptions:**
- E-1: Quota exceeded → 429 with Retry-After; verification path never silently drops items.
- E-2: Malformed rows → per-item error codes; valid items still processed.
- E-3: Webhook endpoint down → retries with backoff 24 h → DLQ visible in dashboard; polling still available.

**Postconditions:** Auditable verification records with verdict snapshots.

---

## UC-08: Consented Credential Request (Employer → Holder)

**Actors:** Employer (primary), Holder, Consent Service.
**Preconditions:** Both parties have accounts; holder owns relevant credential.
**Trigger:** Employer requests "B.Tech degree + final CGPA" from candidate.

**Main flow:**
1. Employer creates request specifying credential type + fields + purpose + retention period.
2. Holder receives request; sees exactly what's asked and why.
3. Holder approves (optionally trimming fields via selective disclosure).
4. Employer receives presentation; verification runs automatically; consent record stored (scope, timestamp, expiry).
5. Access auto-expires at retention end.

**Alternative flows:**
- A-1: Holder counter-offers fewer fields → employer accepts or re-requests.
- A-2: Holder ignores → request expires in 14 days.

**Exceptions:**
- E-1: Holder declines → employer notified without prejudice data.
- E-2: Holder revokes consent later → employer access invalidated; revocation logged.

**Postconditions:** GDPR/DPDP-grade consent evidence for every disclosure.

---

## UC-09: Holder Dispute / Correction Request

**Actors:** Holder (primary), Issuer Registrar.
**Trigger:** Holder finds an error or contests a revocation.

**Main flow:**
1. Holder opens dispute from cert detail: category (data error / wrongful revocation / not mine), description, evidence upload.
2. Case created; issuer queue notified; SLA clock starts.
3. Registrar investigates, responds; if upheld → correction via UC-06 (or suspension lift).
4. Holder notified of outcome; case closed with full trail.

**Exceptions:**
- E-1: Issuer unresponsive past SLA → escalation to platform admin; tenant health flag.
- E-2: Abusive/duplicate disputes → rate-limited; pattern flagged.

**Postconditions:** Every contested record has a documented adjudication.

---

## UC-10: Legacy Certificate Digitization

**Actors:** Issuer Operator, AI OCR service, Approver.
**Preconditions:** Institution approved; legacy paper/PDF records exist.
**Trigger:** Institution imports historical records.

**Main flow:**
1. Operator uploads scans/PDF archive + optional metadata CSV.
2. OCR + field extraction populates draft records; low-confidence fields queued for human review.
3. Operator reviews/corrects; approver approves batch.
4. Certificates issued marked `legacyAttested: true` with attestation date; anchored normally.
5. Alumni notified where contact data exists; unclaimed certs remain verifiable.

**Exceptions:**
- E-1: Source document illegible → row parked; never guess-issued.
- E-2: Conflicting duplicate found in archive → both routed to registrar adjudication.

**Postconditions:** Verifiers see honest provenance ("attested retroactively on <date>"), never implied contemporaneous issuance.

---

## UC-11: Suspicious Certificate Flag & Investigation

**Actors:** Verifier (flagger), Fraud Analyst (platform), Issuer, AI risk scoring.
**Trigger:** Verifier hits "report suspicious" on a verification page or an AI anomaly fires.

**Main flow:**
1. Flag captured with context (verdict, channel, reporter contact optional).
2. Case auto-created; AI risk score attached (prior flags, issuance anomalies).
3. Analyst triages: platform-level issue (e.g., phishing clone site) vs issuer-level (e.g., insider fraud).
4. Issuer consulted where relevant; outcome recorded (dismissed / revoked via UC-05 / issuer suspended via admin controls / law-enforcement referral).
5. Reporter (if contactable) notified of resolution status.

**Exceptions:**
- E-1: Mass-flag abuse campaign against a person → dedup + abuse detection; holder protected.
- E-2: Confirmed insider fraud at issuer → tenant suspension, regulator notification workflow.

**Postconditions:** Fraud metrics feed analytics (FR-ANA-007); no automated punitive action without human decision (FR-AI-009).

---

## UC-12: Issuer Key Rotation (incl. Compromise)

**Actors:** Institution Owner, Platform Security, Issuer Registry contract.
**Trigger:** Scheduled rotation or suspected compromise.

**Main flow (scheduled):**
1. Owner initiates rotation; new key generated in KMS.
2. Registry updated on-chain: new key active, old key marked valid-until (overlap window for in-flight batches).
3. New issuances sign with new key; old certs verify against key-validity timeline.

**Alternative flow (compromise):**
- A-1: Security invokes emergency rotation: old key revoked immediately on-chain with compromise timestamp; certs signed after compromise timestamp flagged for review/reissue; incident response runbook runs; affected holders/verifiers notified.

**Exceptions:**
- E-1: Registry tx fails during emergency → contract `pause` on issuer's issuance while retrying; verification shows conservative warning.

**Postconditions:** Verifiable key history on-chain; no signature ambiguity.

---

## UC-13: DigiLocker Push (India Bridge)

**Actors:** Holder, Issuer, DigiLocker Issuer API.
**Preconditions:** Institution registered as DigiLocker issuer; holder consents; APAAR/Aadhaar linkage on holder side.
**Trigger:** Holder toggles "add to DigiLocker" (or issuer enables auto-push with consent capture at claim).

**Main flow:**
1. Holder consents (scope: this credential to DigiLocker).
2. Bridge maps credential to DigiLocker document schema; pushes via issuer API.
3. Holder sees document in DigiLocker issued-docs; TrustChain records push receipt + consent.

**Exceptions:**
- E-1: DigiLocker API failure → retry queue; holder sees pending state.
- E-2: Identity mismatch (name/DOB vs Aadhaar-seeded data) → push blocked; correction guidance (may trigger UC-09).

**Postconditions:** Credential lives in both ecosystems; consent evidence stored.

---

## UC-14: Platform Disaster — Vendor-Independence Verification

**Actors:** Any Verifier, open-source verifier CLI, public chain.
**Preconditions:** Holder possesses exported proof bundle (VC JSON + Merkle proof + anchor references) — exportable any time (FR-VER-009).
**Trigger:** TrustChain servers unreachable (outage or company ceases operations).

**Main flow:**
1. Verifier obtains bundle from holder.
2. Runs OSS CLI: validates VC signature against issuer DID history (on-chain registry), Merkle proof against anchored root (public RPC), revocation against last anchored status root.
3. CLI outputs verdict with staleness caveat on revocation (as of last anchored status root).

**Exceptions:**
- E-1: Holder never exported bundle and platform is gone → cert hash + tx references printed on artifact QR payload allow partial integrity verification; documented limitation drives "export encouraged" UX.

**Postconditions:** Credential value survives the platform — the core trust promise (lesson of Learning Machine/Hyland, section 2.1.4).
