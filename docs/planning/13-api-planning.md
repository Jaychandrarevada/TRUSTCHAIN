# 13. API Planning

## 13.1 Principles

- **REST `/v1` is the public contract** (OpenAPI 3.1 source of truth in `docs/api/`); GraphQL serves our own dashboards (persisted queries only in prod).
- Resource-oriented URLs, cursor pagination (`?cursor=&limit=`), RFC 9457 problem-details errors with a stable error-code catalog.
- **Idempotency-Key header required** on all POSTs that create state; async pattern (202 + job resource + webhook) for anything > 30 s.
- AuthN: user JWT (dashboards), scoped API keys / OAuth2 client-credentials (machine). Scopes: `issue:write`, `certs:read`, `revoke:write`, `verify:read`, `webhooks:manage`, `admin:*`.
- Rate limits per key + per IP with standard `RateLimit-*` headers; `Sunset` headers on deprecations (≥ 6 months notice).

## 13.2 Authentication APIs

| Method & Path | Purpose | Auth |
|---|---|---|
| POST `/v1/auth/register` | Create user account (email verify triggered) | Public (rate-limited) |
| POST `/v1/auth/login` | Password or OTP login → tokens | Public |
| POST `/v1/auth/otp/request` · `/otp/verify` | Passwordless holder login | Public |
| POST `/v1/auth/token/refresh` | Rotate refresh token | Refresh token |
| POST `/v1/auth/logout` · GET `/v1/auth/sessions` · DELETE `/v1/auth/sessions/{id}` | Session management | JWT |
| POST `/v1/auth/mfa/enroll` · `/mfa/verify` | TOTP MFA | JWT |
| POST `/v1/auth/password/forgot` · `/password/reset` | Reset flow | Public |
| GET `/v1/auth/oidc/{tenant}/authorize` (+callback) | Tenant SSO brokering | Public |
| GET/POST/DELETE `/v1/api-keys` · POST `/v1/api-keys/{id}/rotate` | Scoped key management | JWT (owner/admin) |
| POST `/v1/oauth/token` | Client-credentials for M2M | Client secret |

## 13.3 Institution (Issuer) APIs

| Method & Path | Purpose |
|---|---|
| POST `/v1/institutions` | Create tenant (starts KYB) |
| GET/PATCH `/v1/institutions/{id}` | Profile, branding, settings |
| POST `/v1/institutions/{id}/domain-verification` | Start/complete DNS TXT proof |
| GET/POST `/v1/institutions/{id}/members` · PATCH/DELETE `/members/{userId}` | Team & roles |
| GET/POST `/v1/institutions/{id}/departments` | Sub-organizations |
| POST `/v1/institutions/{id}/keys/rotate` | Issuer key rotation (on-chain registry update) |
| GET `/v1/institutions/{id}/export` | Full tenant data export (async job) |
| GET/POST `/v1/schemas` · GET/POST `/v1/templates` · POST `/v1/templates/{id}/publish` | Schemas & templates (versioned) |

## 13.4 Issuance & Certificate APIs

| Method & Path | Purpose |
|---|---|
| POST `/v1/certificates` | Issue single certificate (draft → pipeline) |
| POST `/v1/batches` | Create bulk batch (CSV upload URL or inline JSON ≤ 1k rows) |
| POST `/v1/batches/{id}/validate` | Dry-run validation → row-level report |
| POST `/v1/batches/{id}/submit` · `/approve` · `/reject` | Maker-checker transitions |
| GET `/v1/batches/{id}` · GET `/v1/batches/{id}/report` | Status (incl. anchor tx) + issuance report |
| GET `/v1/certificates/{id}` | Full record (tenant-scoped) |
| GET `/v1/certificates/{id}/proof-bundle` | VC JSON + Merkle proof + anchor refs (portable evidence) |
| GET `/v1/certificates/{id}/timeline` | Lifecycle events |
| POST `/v1/certificates/{id}/supersede` | Correction reissue |
| POST `/v1/certificates/{id}/revoke` | Start two-person revocation |
| POST `/v1/revocations/{id}/confirm` | Second-approver confirmation |
| GET `/v1/certificates?status=unclaimed` | Unclaimed list, re-notify action |

## 13.5 Verification APIs (public + keyed)

| Method & Path | Purpose | Auth |
|---|---|---|
| GET `/v1/verify/{certId}` | Full verdict object (all checks broken out) | Public, rate-limited |
| POST `/v1/verify/file` | Upload PDF/VC JSON → recompute hash → verdict | Public, rate-limited |
| POST `/v1/verify/batch` | Async bulk verification (N ≤ 10k) | API key `verify:read` |
| GET `/v1/verify/jobs/{jobId}` | Bulk job status/results | API key |
| GET `/v1/share/{shareToken}` | Share-link resolution (enforces expiry/PIN/views/field selection) | Public |
| POST `/v1/verify/{certId}/report` | Flag suspicious certificate | Public (captcha) |
| POST `/v1/watchlists` · DELETE `/v1/watchlists/{id}` | Subscribe to revocation alerts for verified certs | API key |
| GET `/v1/status-lists/{issuerId}/{listId}` | W3C Bitstring Status List credential | Public |
| GET `/.well-known/did.json` (per issuer domain) | did:web resolution | Public |

**Verdict object (shape):** `{ status: VALID|REVOKED|SUPERSEDED|EXPIRED|TAMPERED|UNKNOWN_ISSUER|SUSPENDED_ISSUER, checks: {integrity, merkleProof, anchor, issuerStatus, revocation, expiry, holderBinding}, issuer: {...}, anchoredAt, txRef, disclosedFields, supersededBy? }`

## 13.6 Student / Holder APIs

| Method & Path | Purpose |
|---|---|
| POST `/v1/claims` · POST `/v1/claims/{id}/verify-otp` | Claim certificate to wallet |
| GET `/v1/me/credentials` · GET `/v1/me/credentials/{id}` | Wallet listing/detail |
| GET `/v1/me/credentials/{id}/download?format=pdf|vc|ob3` | Artifact/credential export |
| POST `/v1/me/credentials/{id}/shares` | Create share (expiry, views, PIN, field selection) |
| GET/DELETE `/v1/me/shares/{id}` · GET `/v1/me/shares/{id}/activity` | Manage shares, view events |
| POST `/v1/me/credentials/{id}/disputes` | Correction/dispute case |
| GET/POST `/v1/me/consents` · DELETE `/v1/me/consents/{id}` | Consent records incl. revocation |
| POST `/v1/me/credentials/{id}/digilocker-push` | India bridge (consented) |
| GET `/v1/me/export` · DELETE `/v1/me` | Data portability & erasure (DSR) |

## 13.7 Employer APIs

| Method & Path | Purpose |
|---|---|
| POST `/v1/employers` · members CRUD | Employer org + team |
| GET `/v1/employers/{id}/verifications` | Org verification history with verdict snapshots |
| POST `/v1/credential-requests` | Consented request to a holder (type, fields, purpose, retention) |
| GET `/v1/credential-requests/{id}` | Request status / presentation retrieval |
| POST `/v1/verifications/{id}/attestation` | Signed verification attestation PDF |
| GET `/v1/employers/{id}/usage` | Metering dashboard data |

## 13.8 Admin APIs (separate gateway, IP-allowlisted, `admin:*` scopes)

| Method & Path | Purpose |
|---|---|
| GET `/admin/v1/kyb-queue` · POST `/admin/v1/kyb/{id}/approve|reject|request-info` | Tenant approval |
| POST `/admin/v1/tenants/{id}/suspend|restore|limit` | Tenant lifecycle |
| GET `/admin/v1/anchoring/queue` · POST `/admin/v1/anchoring/{jobId}/retry` | Ops dashboard + DLQ replay |
| GET `/admin/v1/wallets/balances` | Relayer gas monitoring |
| POST `/admin/v1/chain/pause` · `/unpause` | Emergency chain-write kill switch |
| GET/POST `/admin/v1/feature-flags` · `/rate-limits` | Rollout + quota config |
| GET `/admin/v1/cases` (fraud/disputes) · PATCH `/admin/v1/cases/{id}` | Case management |
| POST `/admin/v1/dsr/{requestId}/execute` | Erasure/access execution with evidence |
| GET `/admin/v1/audit-logs?actor=&action=&range=` | Cross-tenant audit search (privacy-scoped) |

## 13.9 Blockchain APIs (read-only public surface)

| Method & Path | Purpose |
|---|---|
| GET `/v1/chain/anchors/{root}` | Anchor record: tx hash, block, timestamp, batch linkage |
| GET `/v1/chain/issuers/{did}` | Issuer registry state + key history |
| GET `/v1/chain/contracts` | Deployed addresses, ABIs, verification links |
| GET `/v1/chain/health` | RPC/provider/indexer status (status-page feed) |
| — | **The Graph subgraph** (public GraphQL): anchors, issuer events, revocation roots — third-party independent verification (FR-BC-011) |

## 13.10 Webhooks (outbound)

Events: `certificate.issued` · `certificate.claimed` · `certificate.revoked` · `certificate.superseded` · `certificate.verified` · `batch.validated` · `batch.anchored` · `batch.failed` · `issuer.updated` · `dispute.opened` · `dispute.resolved` · `watchlist.revocation`

Delivery contract: JSON body + `X-TrustChain-Signature` (HMAC-SHA256 over timestamp+body), 10 s timeout, exponential retries ≤ 24 h, then DLQ (visible + replayable in dashboard). Consumers must be idempotent on `event.id`.

## 13.11 GraphQL (internal dashboards)

- Single endpoint `/graphql`, persisted queries only in production; depth/complexity limits.
- Schema domains: `viewer` (me/wallet), `tenant` (issuance funnel, unclaimed, analytics aggregates), `admin` (ops metrics). Mutations mirror REST semantics (same service layer) — no capability exists only in GraphQL, keeping REST the complete public contract.

## 13.12 Versioning & Lifecycle

- URI major versioning (`/v1`); additive changes are non-breaking (clients must tolerate unknown fields).
- Breaking change ⇒ `/v2` + ≥ 6-month dual-running with `Sunset`/`Deprecation` headers and migration guide.
- Contract tests (Schemathesis against OpenAPI) gate every deploy; SDKs regenerate from spec in CI.
