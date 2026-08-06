# TrustChain — Complete Project Context

> **Purpose of this file:** a single, self-contained brief so any AI (or engineer) can fully understand TrustChain and continue improving it without reading the whole repo first. Read this top-to-bottom, then dive into the linked docs/code only where needed.

---

## 0. TL;DR

**TrustChain** = a blockchain-based digital certificate verification platform. Institutions issue tamper-proof certificates; the platform seals a cryptographic fingerprint (Merkle root) on the **Polygon** blockchain; anyone can verify a certificate in <3 seconds, free, with no account. **Zero personal data ever goes on-chain.**

**State:** V1.0 complete and runnable end-to-end locally. **127 automated tests pass** (blockchain 54, backend 41+13 security, frontend 19). Frontend is a premium **Black & Gold** dark-first UI. Not yet deployed to mainnet (gated on external audits — see §12).

**Stack:** Solidity/Hardhat (Polygon) · Python/Flask backend · React 19 + Vite + TypeScript + Tailwind frontend.

**Runs with zero external services** (SQLite file + in-process mock blockchain). See §9.

---

## 1. The Problem & The Solution

**Problem:** certificate fraud is easy (Photoshop a PDF), verification is slow and expensive (email the registrar, wait days, pay background-check vendors), centralized repositories require trusting one operator, and first-gen blockchain systems (Blockcerts, Hyland) broke on revocation and vendor lock-in.

**Solution — 3 core ideas:**
1. **The chain stores trust, not data.** Each certificate's content is hashed (salted SHA-256), hashes are batched into a **Merkle tree**, and only the 32-byte **root** goes on-chain. PII stays off-chain, encrypted. Destroying a certificate's salt makes its on-chain leaf permanently unlinkable → GDPR/DPDP erasure without touching the immutable chain.
2. **Verify the math, not the operator.** An on-chain **issuer registry** (who may issue) + **revocation registry** (is it still valid) + the anchor (did it exist) let anyone verify independently. An **open-source verifier** can confirm a certificate using only public chain data — so credentials survive even if TrustChain the company disappears (**vendor-independence**).
3. **Crypto is invisible.** Users never touch wallets, gas, or seed phrases. A platform **relayer** signs and pays for all chain transactions. Verification is a QR scan → a plain-language verdict.

---

## 2. Core Domain Concepts (learn these first)

- **Certificate** — a credential (degree, diploma, marksheet) with a public non-guessable ID `TC-XXXX-XXXX-XXXX`. Has: subject data (off-chain, encrypted), content_hash, salt, leaf_hash, merkle_proof, status.
- **Batch** — the issuance unit. An institution uploads N recipients → one batch → one Merkle root → one on-chain anchor. FSM: `draft → validated → pending_approval → approved → anchoring → anchored` (also `failed`).
- **Institution (Issuer)** — a tenant. FSM: `pending_kyb → active → suspended/retired`. Gets an on-chain `issuer_id` at KYB approval.
- **The 7-Verdict Engine** — every verification returns exactly one: `VALID · REVOKED · SUPERSEDED · EXPIRED · TAMPERED · UNKNOWN_ISSUER · SUSPENDED_ISSUER`. Precedence (BR-15): TAMPERED > UNKNOWN_ISSUER > SUSPENDED_ISSUER > REVOKED > SUPERSEDED > EXPIRED > VALID.
- **Maker-checker** — the person who creates a batch cannot approve it (403 `SELF_APPROVAL_FORBIDDEN`).
- **Two-person revocation** — revocation needs a different second approver to confirm (403 `SAME_ACTOR`). Revocation is **irreversible**; corrections use **supersede-and-reissue** (old cert → SUPERSEDED, linked to new).
- **Claim** — a holder binds a certificate to their wallet/account via OTP + identity-field match.

---

## 3. The Invariants — WHAT MUST NEVER CHANGE

These are the platform's bedrock. Any change here breaks the trust promise. Referenced everywhere as `BR-xx` (business rules) in code comments.

1. **Zero PII on-chain, ever.** Only salted hashes, Merkle roots, issuer key hashes, status roots.
2. **Public verifiability** — anyone can verify with zero membership/account.
3. **Vendor-independence** — a certificate must remain verifiable via the open-source verifier + public chain even if the platform is gone.
4. **Revocation is irreversible** (BR-11); corrections only via supersede chain (BR-12).
5. **Maker ≠ checker** (BR-21) on batch approval AND revocation confirmation.
6. **Verdicts never guessed** (BR-20) — if chain state is unavailable, show UNAVAILABLE/cached-with-timestamp, never a fabricated verdict.
7. **Human-in-the-loop for AI** — AI never auto-revokes or auto-rejects (future rule, keep it).
8. **Verdicts never rely on color alone** — icon + label + color (accessibility).
9. **Merkle hashing byte-parity across 3 languages** — `blockchain/utils/merkle.ts` ≡ `backend/app/blockchain/merkle.py` ≡ `contracts/libraries/MerkleLib.sol`. If you change one, change all three; a parity test guards it.

Hashing scheme (fixed): `leaf = keccak256(0x00 ‖ salt ‖ sha256(canonical_json))`, `node = keccak256(0x01 ‖ sorted-pair)`, odd nodes promoted.

---

## 4. Architecture Overview

```
┌─────────────┐   REST /api/v1    ┌──────────────────┐   web3/mock    ┌──────────────────┐
│  Frontend   │ ────────────────► │   Backend (Flask)│ ─────────────► │  Polygon (3 SCs) │
│ React/Vite  │ ◄──────────────── │  services + RBAC │ ◄───────────── │ Registry/Anchor/ │
│ Black&Gold  │   verdict JSON    │  SQLite/Postgres │   anchor/read  │ Revocation       │
└─────────────┘                   └──────────────────┘                └──────────────────┘
     public verify (no auth)            relayer signs all tx           open-source verifier
```

- **Frontend calls backend** via `/api/v1` (Vite dev-proxies to :5000).
- **Backend is the only thing that touches the chain** (relayer model). It uses a **`BlockchainClient` port** with two implementations: `MockChainClient` (in-process, reproduces contract rules — used for tests + local demo) and `Web3ChainClient` (real Polygon via web3.py). Swap via `BLOCKCHAIN_MODE=mock|web3`.
- **Contracts** are the trust root; backend/frontend never bypass them for verification logic.

> **Stack deviation note:** the design docs (TDD) specified NestJS + Next.js; the built implementation is **Flask + Vite single-app** (mandated stacks). The *architecture patterns* (clean layering, DIP, service/repository) are preserved. Don't be confused by the doc/impl mismatch.

---

## 5. The Three Modules (real file map)

### 5.1 `blockchain/` — Solidity contracts (Hardhat, Polygon)
Three UUPS-upgradeable contracts on a shared `TrustChainBase` (AccessControl + Pausable + UUPS):
- `contracts/IssuerRegistry.sol` — institutions + signing-key history. ("who may issue")
- `contracts/CertificateAnchor.sol` — Merkle roots, append-only. ("did this exist") + `verifyCertificate` view.
- `contracts/RevocationRegistry.sol` — Bitstring status-list roots, monotonic versions. ("is it still valid")
- `contracts/libraries/MerkleLib.sol` — domain-separated proof verification.
- `utils/merkle.ts` — off-chain tree builder (parity-locked to backend).
- `test/` — 54 tests (unit + integration + security + upgrade). `scripts/` — deploy/verify/upgrade/seed.
- **Contract-name mapping:** requirement names InstitutionRegistry→IssuerRegistry, CertificateRegistry→CertificateAnchor, AuditContract→`AnchorType.AuditLog`. Documented.
- **Networks:** Polygon PoS (137), Amoy testnet (80002), Sepolia (11155111), local (31337).

### 5.2 `backend/` — Flask API (Python 3.12)
Clean layering: `api → services → models`. Key dirs under `backend/app/`:
- `models/` — 14 SQLAlchemy entities: User, Role, Permission, UserRole, Wallet, WalletChallenge, RefreshSession · Institution, Employer · Batch, Certificate, CertificateHistory · VerificationLog, ShareLink, Notification, ActivityLog(audit), SystemSetting. Uses `UTCDateTime` (tz-safe across SQLite/Postgres).
- `services/` — business logic: `auth_service`, `certificate_service` (issuance pipeline), `verification_service` (7-verdict engine + QR + shares), `revocation_service` (two-person), `institution_service` (KYB → on-chain register), `analytics_service`, `audit_service` (fail-closed).
- `auth/` — `rbac.py` (permission matrix + `require_permission` decorator), `security.py` (bcrypt, lockout, MetaMask EIP-191 signature verify).
- `blockchain/` — `merkle.py` (parity), `client.py` (Mock + Web3, DI factory).
- `schemas/` — Marshmallow validation (the request boundary).
- `api/` — Flask-RESTX namespaces (47 routes) → Swagger at `/api/v1/docs`. Files: `auth.py`, `certificates.py`, `verify.py` (public), `wallet.py`, `ops.py` (institutions/admin/me/health).
- `scripts/seed.py` — idempotent RBAC + demo data. `wsgi.py` — gunicorn entrypoint.
- `tests/` — 41 tests + `qa/security/` 13 executable OWASP tests. **89% coverage.**

**RBAC matrix (source of truth `backend/app/auth/rbac.py`, mirrored in frontend `constants`):**
| Role | key permissions |
|---|---|
| student | wallet:own, verify:read |
| employer | verify:read, analytics:read |
| operator | certificates:read/issue |
| approver | certificates:read/approve/revoke |
| issuer_admin / owner | all issuer perms + institution:manage + audit:read |
| platform_admin | institution:kyb, tenants:manage, settings:manage, blockchain:ops |

### 5.3 `frontend/` — React 19 + Vite + TypeScript
Premium **Black & Gold**, dark-first. Under `frontend/src/`:
- `pages/` — Landing, auth (Login/Register), verify (VerdictPage/SharePage/VerifyHub), student (WalletHome/WalletCertificate/ClaimPage), issuer (Dashboard/NewBatch/BatchDetail/Certificates/CertificateAdmin/AuditLogs), employer (EmployerVerify), admin (KybQueue/PlatformAnalytics), errors (NotFound/Forbidden).
- `components/ui/` — primitives (button, card [glass/hover/glow], field, dialog, toast [glass], misc). `components/domain/` — verdict.tsx (VerdictBadge/Panel/CheckList/AnchorProof), certificate.tsx (CertificateCard/Timeline/StatCard[animated]/QRDisplay). `components/motion/` — Reveal, Stagger, TiltCard, Magnetic, MeshBackground, AnimatedCounter. `components/CommandPalette.tsx` (⌘K).
- `services/` — `http.ts` (axios + auto token refresh + RFC 9457 errors), `api.ts` (typed per endpoint). `contexts/AuthContext.tsx` (session, `hasPermission`, 4-theme). `lib/web3/metamask.ts`. `routes/index.tsx` (lazy + role guards). `layouts/`, `constants/`, `types/`, `utils/`.
- Design tokens: `tailwind.config.ts` + `src/styles/globals.css`. Fonts self-hosted (`@fontsource` Sora/Inter/JetBrains). Themes: Light/Dark/OLED/High-contrast (top-right picker).
- `tests/` — 19 (verdict, utils, claim). Build: `npm run build` (tsc + vite).

---

## 6. Key User Flows (how it actually works)

1. **Issue:** operator creates batch (CSV) → dry-run validation catches bad rows → submit → **a different approver** approves → backend hashes+salts+Merkle-builds+signs → anchors root on-chain → certificates `anchored`.
2. **Claim:** holder gets link → OTP + identity match → certificate bound to their wallet.
3. **Verify (public, no auth):** scan QR / open `/v/<uid>` → backend recomputes hash, checks Merkle proof + anchor + issuer status + revocation + expiry → returns 1 of 7 verdicts with proof one tap below.
4. **Revoke:** approver initiates (typed REVOKE) → **different** approver confirms → status root anchored → verdict flips to REVOKED ≤5min → holder notified.
5. **Correct:** supersede-and-reissue → old = SUPERSEDED (points to new), new = VALID.
6. **KYB:** institution applies → platform admin approves → on-chain `registerIssuer` → issuance unlocks.

---

## 7. API Surface (47 routes, `/api/v1`)
Groups: `/auth/*` (register, login, refresh, wallet challenge/login/link, password reset) · `/institutions/*` · `/certificates/*` (batches, approve, revoke, supersede, qr) · `/verify/*` (public: by uid/share/file) · `/wallet/*` (claim, credentials, shares) · `/employers/verify/bulk` · `/admin/*` (kyb, tenants, settings) · `/me/notifications` · `/analytics/*` · `/audit-logs` · `/blockchain/info` · `/health/*`. Full contract: Swagger `/api/v1/docs`. Errors are RFC 9457 with stable codes (`SELF_APPROVAL_FORBIDDEN`, `SAME_ACTOR`, `ACCOUNT_LOCKED`, etc.).

---

## 8. Documentation Index (deep-dive when needed)
| Area | File |
|---|---|
| Planning (17 docs) | `docs/planning/00-README.md` |
| PRD + IEEE SRS | `docs/specs/TRUSTCHAIN-PRD-SRS.md` |
| Technical Design | `docs/architecture/TRUSTCHAIN-TDD.md` |
| UI/UX spec | `docs/design/TRUSTCHAIN-UIUX-SPEC.md` |
| Brand (Proof of Light) | `docs/brand/00-README.md` (+ DESIGN-LANGUAGE, DESIGN-TOKENS, MICROINTERACTIONS, CINEMATIC-LANDING, COMMAND-CENTERS) |
| QA + reports | `qa/README.md`, `qa/reports/*` |
| Production readiness | `docs/reviews/PRODUCTION-READINESS-REVIEW.md` |
| V2 strategy/roadmap | `docs/strategy/V2-PRODUCT-EVOLUTION.md` |
| Approve/revoke fix | `docs/fixes/APPROVE-REVOKE-FIX.md` |
| How to run | `RUN-LOCAL.md` |

---

## 9. How to Run Locally (zero external services)

No Docker, Postgres, Redis, or blockchain node needed. Uses SQLite + mock chain. Only **Python 3.12** + **Node 22**.

**Backend (terminal 1):**
```bash
cd backend
.venv/Scripts/activate                 # Windows; source .venv/bin/activate on Unix
pip install -r requirements-dev.txt    # first time
python -m scripts.seed                 # creates instance/trustchain_local.db + demo data (idempotent)
python wsgi.py                         # http://127.0.0.1:5000  (Swagger /api/v1/docs)
```
**Frontend (terminal 2):**
```bash
cd frontend
npm install                            # first time
npm run dev                            # http://127.0.0.1:5173
```
Open **http://localhost:5173**.

**Demo accounts** (password `ChangeMe-Demo-123!`):
| Email | Role |
|---|---|
| admin@trustchain.local | platform admin |
| operator@demo-university.local | issuer operator (creates batches) |
| registrar@demo-university.local | approver (approves) |
| approver2@demo-university.local | second approver (confirms revocation) |

Reset: delete `backend/instance/trustchain_local.db` + `backend/mock_chain_state.json`, re-run seed (prints fresh cert IDs).

**Config gotchas:** `.env` files exist per module (mock mode default). `MOCK_CHAIN_STATE_FILE` persists mock chain across seed+server processes (needed so certs read VALID) — must be UNSET in production. Prod entrypoint = `gunicorn -w 4 wsgi:app` (not the dev `python wsgi.py`).

---

## 10. Test & Build Commands
```bash
# Blockchain (54)
cd blockchain && npm test
# Backend (41) + coverage + security (13)
cd backend && pytest -q --cov=app && pytest ../qa/security/ -q
# Frontend (19) + build
cd frontend && npm test && npm run build
```
All green as of last run. **Total: 127 automated tests passing.**

---

## 11. Current State (V1.0)
- ✅ All three modules built, tested, runnable end-to-end.
- ✅ Premium Black & Gold UI, 4 themes, self-hosted fonts, ⌘K command bar, animated dashboards.
- ✅ Mock-chain mode (local demo) + real Web3 client (untested against a live node).
- ✅ Docs: planning → PRD/SRS → TDD → UI/UX → brand → QA → PRR → V2 strategy.
- ⚠️ Coverage: backend 89% (real-RPC Web3 path is the gap). Frontend build clean.
- ⛔ NOT deployed to mainnet.

---

## 12. What's Left / Known Gaps (from the PRR + V2 strategy)

**Blocking mainnet (external/process, not code defects):**
1. Two external smart-contract audits (hard gate).
2. Measured load test on staging (k6/Locust scripts exist in `qa/performance/`).
3. Distributed rate limiter (currently in-memory; point Flask-Limiter at Redis).
4. Key ceremony (Safe 3-of-5 + timelock).

**High-value V2 directions** (see `docs/strategy/V2-PRODUCT-EVOLUTION.md`): holder-owned DID as primary identity, selective disclosure (SD-JWT) then ZK proofs, native mobile wallet, institution trust graph, developer platform (API keys/SDKs), AI fraud intelligence (human-in-the-loop), EUDI/DigiLocker interop, event indexer + cursor pagination for scale, SSO/SCIM.

**Smaller polish backlog:** self-hosting fonts (done), cursor pagination (currently offset), FE idempotency-key header, the real Constellation/Seal motion (specced in brand docs, not yet built), execute axe/E2E/ZAP harnesses on staging.

---

## 13. How to Continue (guidance for the next AI/dev)

1. **Respect the invariants (§3).** Never put PII on-chain, never break Merkle parity, never bypass maker-checker/two-person, never auto-guess a verdict.
2. **Semantic tokens only in frontend** — no raw hex; the whole app reskins via `tailwind.config.ts` + `globals.css`. (That's how Black & Gold happened in one pass.)
3. **Backend business rules live in `services/`**, not in `api/` (thin controllers) or `models/`. Add a service method + a test.
4. **Chain changes touch 3 files** (Solidity + TS + Python merkle) — keep parity, run the parity test.
5. **Every change: keep the 127 tests green.** Add tests for new logic. Backend `pytest`, frontend `npm test`, contracts `npm test`.
6. **RBAC:** gate new UI actions with `hasPermission(...)` (frontend) AND `require_permission(...)` (backend). Server is authoritative; UI gating is cosmetic.
7. **Run it before claiming done** (§9) — verify a demo cert reads VALID end-to-end.
8. **For mainnet:** close the 4 gates in §12 first.

**One-line mental model:** *TrustChain makes trust a property of the certificate itself — provable by anyone, private by design, and surviving even the platform's death.* Keep that true and you can't go far wrong.
