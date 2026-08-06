# Regression Suite (PART 13)

The regression pack is the union of automated suites that MUST be green on every
release candidate. It maps critical workflows → the exact tests that guard them,
so a red test names the broken workflow directly.

## Critical-workflow → guarding tests

| Workflow | Module | Guarding tests |
|---|---|---|
| **Authentication** | Backend | `backend/tests/test_auth.py` (register/verify/login, lockout, refresh reuse, reset, wallet login/wrong-signer, RBAC deny) · `qa/security/test_security_backend.py::TestAuthentication` |
| **Authentication (UI)** | Frontend | `frontend/src/tests/claim.test.tsx`, `qa/e2e/auth-and-issuance.spec.ts` |
| **Verification (7 verdicts)** | Backend | `backend/tests/test_certificates.py` (golden path, tampered, suspended-issuer, supersede) |
| **Verification (UI + a11y)** | Frontend | `frontend/src/tests/verdict.test.tsx`, `qa/e2e/verification.spec.ts`, `qa/accessibility/axe-audit.mjs` |
| **Certificate issuance** | Backend | `test_certificates.py` (dry-run errors, duplicates, maker-checker, anchor) |
| **Merkle/hash parity** | All 3 | `blockchain` CertificateAnchor+Merkle tests · `backend/tests/test_merkle.py` · frontend consumes same verdict |
| **Blockchain transactions** | Blockchain | `blockchain/test/**` (54 tests: anchor idempotency, status monotonicity, upgrade preservation, security suite) |
| **Two-person controls** | Backend | `test_certificates.py::test_two_person_revocation`, `qa/security/...::TestBusinessRuleSecurity` |
| **Admin actions (KYB)** | Backend | `backend/tests/test_platform.py` (KYB approve → on-chain register, tenant status) |
| **Analytics/reports** | Backend | `test_platform.py::test_analytics_reconcile_with_events` |
| **Access control / isolation** | Backend | `qa/security/...::TestAccessControl` (cross-tenant 404, RBAC) |

## Running the full regression pack

```bash
# Blockchain (54)
cd blockchain && npm test
# Backend (41) + security (13)
cd backend && pytest -q && pytest ../qa/security/ -q
# Frontend (19)
cd frontend && npm test
# E2E (needs seeded stack) + a11y + API
npx playwright test --config qa/e2e/playwright.config.ts
node qa/accessibility/axe-audit.mjs
qa/postman/newman-run.sh
```

## Regression tracking

- **Gate:** any red = no merge to `main`, no release promotion.
- **New bug → new test:** every fixed defect lands with a regression test named for the defect (see [bug-tracking](../bug-tracking/GUIDELINES.md)).
- **Flake budget:** < 1%; flaky tests quarantined within 24 h, fixed within a sprint.
- **Coverage floor:** regression run must not drop coverage below the exit-criteria thresholds ([TEST-STRATEGY §6](TEST-STRATEGY.md)).

## Current status (this cycle)

| Suite | Result |
|---|---|
| Blockchain | 54/54 ✅ |
| Backend | 41/41 ✅ |
| Backend security | 13/13 ✅ |
| Frontend | 19/19 ✅ |
| **Total automated** | **127/127 ✅** |
| E2E / a11y / Newman | Scaffolded — execute against seeded staging (harness verified) |
