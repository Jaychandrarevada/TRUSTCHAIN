# Backend Troubleshooting

| Symptom | Cause → Fix |
|---|---|
| `pip install` fails building `lru-dict` on Windows | Old web3 6.x pin. This repo uses web3 7.x (no lru-dict). If you changed pins back, install VS Build Tools or restore `web3==7.x` |
| `TypeError: can't compare offset-naive and offset-aware datetimes` | A new datetime column bypassed `UTCDateTime` — always use `UTCDateTime()` from `app/models/base.py`, never raw `db.DateTime` |
| 404 on `/api/v1/health/live` after adding a namespace | RESTX namespaces mounted at `path=""` register nothing — use `path="/"` or a named segment |
| 403 `SELF_APPROVAL_FORBIDDEN` in scripts | The same user created and is approving a batch — use two identities (the seed script uses admin as approver) |
| 403 `SAME_ACTOR` on revoke confirm | Second confirmation must come from a *different* approver (BR-21) — by design, not a bug |
| 401 on refresh after refresh | Token rotation: each refresh token is single-use; reusing an old one revokes the whole family (SEC-JWT-2) — sign in again |
| 423 `ACCOUNT_LOCKED` | 5 failed logins → 15-min lockout; wait or reset the password |
| `CHAIN_ERROR: RootAlreadyAnchored` in web3 mode | Usually a benign retry of a landed tx — the batch is anchored; check `batches.anchor_tx_hash` |
| `WRONG_CHAIN` at boot | `CHAIN_ID` doesn't match the RPC node (e.g., Amoy config against a Sepolia URL) — align `.env` with `blockchain/deployments/<network>.json` |
| Verdict shows TAMPERED for a “good” file | Payload isn't the canonical original: key order/whitespace don't matter (canonicalized), but any value change does. Compare against `GET /certificates/{uid}` `subject_data` |
| Swagger shows but calls 401 | Click Authorize and paste `Bearer <access_token>` (including the word Bearer) |
| Tests can't find `app` | Run pytest from `backend/` (conftest adds the package via rootdir) with the venv active |
