# Fix: Batch Approve & Certificate Revoke "not working"

**Date:** July 2026 · **Area:** frontend RBAC gating + demo seed · **Severity:** High (UX), not a security defect.

## Symptom

- Clicking **Approve batch** → toast `Missing permission(s): certificates:approve`.
- **Revoke certificate** could not complete.

## Root cause

The backend RBAC was working **correctly** — the failures were real permission denials the UI never should have offered:

1. **Buttons were not gated by permission.** Approve / Revoke / Correct-&-reissue buttons rendered for **every** issuer role. The signed-in user was an **operator** (`operator@demo-university.local`), whose role grants `certificates:issue` only — **not** `certificates:approve` or `certificates:revoke`. Backend returned `403 Missing permission(s)`, surfaced as a toast.

   Backend matrix (`app/auth/rbac.py`, unchanged):
   | Role | issue | approve | revoke |
   |---|---|---|---|
   | operator | ✅ | ❌ | ❌ |
   | approver | — | ✅ | ✅ |
   | owner / issuer_admin | ✅ | ✅ | ✅ |

2. **Revoke needs two *different* approvers** (two-person rule, BR-21: initiate by one approver, confirm by another). The seed created only **one** approver (`registrar`), so the confirm step hit `403 SAME_ACTOR`. No second approver account existed to complete it.

## Fix (no architecture, API, or contract change)

### Frontend — gate actions by permission
- Added `ROLE_PERMISSIONS` map in `frontend/src/constants/index.ts` (mirrors the backend matrix; cosmetic gating only — server stays authoritative).
- Added `hasPermission(permission)` to `AuthContext`.
- `BatchDetail.tsx`: **Approve** shows only with `certificates:approve`; otherwise a hint: *"Sign in as an approver."* Also warns if you're the batch creator (self-approval forbidden).
- `CertificateAdmin.tsx`: **Revoke / Confirm / Correct-&-reissue** gated by `certificates:revoke` / `certificates:approve`; hint shown otherwise. Copy now states revocation needs **two different approvers**.

### Backend — enable two-person revoke in the demo
- `scripts/seed.py` now seeds a **second approver**: `approver2@demo-university.local` (role `approver`). Idempotent; backfills existing databases on re-run.

## Verify the fix

```bash
cd backend && .venv/Scripts/python -m scripts.seed   # adds approver2 (safe to re-run)
```
Roles after seed:
```
registrar@demo-university.local   [owner, approver]
approver2@demo-university.local   [approver]
operator@demo-university.local    [operator]
```

## How to run the flows now

Password for all demo users: `ChangeMe-Demo-123!`

**Approve a batch**
1. Sign in as `operator@demo-university.local` → create batch → **Submit for approval**.
2. Sign out. Sign in as `registrar@demo-university.local` (approver, different person) → open the batch → **Approve batch** → sealed on chain. ✅

**Revoke a certificate (two-person)**
1. Sign in as `registrar@demo-university.local` → open a certificate → **Revoke certificate…** → type `REVOKE` → confirm. Status: *awaiting a second approver*.
2. Sign out. Sign in as `approver2@demo-university.local` → same certificate → **Confirm revocation (second approver)** → certificate is REVOKED. ✅

> An operator will no longer see Approve/Revoke buttons — instead a hint to sign in as an approver. That is the maker-checker design working as intended.

## Validation
- `tsc` clean · `vite build` green · **19/19 frontend tests pass**.
- Backend RBAC and 41 tests unchanged (no backend logic touched, only seed data).

## Files changed
- `frontend/src/constants/index.ts` — `ROLE_PERMISSIONS`
- `frontend/src/contexts/AuthContext.tsx` — `hasPermission`
- `frontend/src/pages/issuer/BatchDetail.tsx` — gate Approve
- `frontend/src/pages/issuer/CertificateAdmin.tsx` — gate Revoke / Supersede
- `backend/scripts/seed.py` — second approver
