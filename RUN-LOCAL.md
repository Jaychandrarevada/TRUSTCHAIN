# Running TrustChain Locally (no Docker)

Zero external services needed — SQLite (file), mock blockchain (in-process, state persisted to a file), mock email (logs to console), in-memory rate limiting. Only **Python 3.12** and **Node 22** required.

## First-time setup (already done once)

```bash
# Backend deps (one time)
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows;  source .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt

# Frontend deps (one time)
cd ../frontend
npm install
```

`.env` files already exist in `backend/` and `frontend/` configured for local mock mode.

## Run it — three commands, two terminals

**Terminal 1 — backend (seed once, then serve):**
```bash
cd backend
.venv/Scripts/activate
python -m scripts.seed        # creates instance/trustchain_local.db + demo data (idempotent)
python wsgi.py                # serves http://127.0.0.1:5000  (Swagger at /api/v1/docs)
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev                   # serves http://127.0.0.1:5173
```

Open **http://localhost:5173**.

> Re-seeding: to start clean, delete `backend/instance/trustchain_local.db` and `backend/mock_chain_state.json`, then run the seed again. The seed prints fresh certificate IDs each time.

## Demo accounts (password: `ChangeMe-Demo-123!`)

| Email | Role | Lands in |
|---|---|---|
| `admin@trustchain.local` | Platform admin | KYB queue + platform analytics |
| `operator@demo-university.local` | Issuer operator | Institution console (create batches) |
| `registrar@demo-university.local` | Approver | Institution console (approve/revoke) |

To see the **student wallet**, register a new account at `/register` as a Student, then claim a certificate using its ID + the email `student1@example.com` (the seed's holder email for Demo Student 1).

## What to try (5-minute walkthrough)

1. **Public verification (no login)** — the flagship. Go to `/verify`, paste a seeded certificate ID (the seed prints them, e.g. from Terminal 1), or open `/v/<ID>` directly. You'll see the **VALID** verdict, issuer identity, disclosed fields, the 7-check breakdown, and expandable blockchain proof.
2. **Tamper detection** — on `/verify`, use "Verify a document you received": paste a cert ID and its JSON but change a value → **TAMPERED**.
3. **Issue certificates** — log in as `operator@...`, go to New batch, paste CSV (use "Insert template"), Run validation → Submit for approval. Then log in as `registrar@...` (a *different* person — maker-checker) to approve; it anchors on the mock chain.
4. **Two-person revocation** — as `registrar@...`, open a certificate → Danger zone → Revoke (type REVOKE). A second approver must confirm. Re-verify the cert → **REVOKED**.
5. **Admin** — log in as `admin@...` to see the KYB queue and platform analytics.
6. **Swagger** — full API at http://localhost:5000/api/v1/docs.

## Switching to a real blockchain later (optional)

The mock chain reproduces the contracts' exact rules, so the UX is identical. To run against the real local chain instead:
```bash
cd blockchain && npm run node:local      # terminal 3: Hardhat node
npm run deploy:local && npm run seed:local
```
Then in `backend/.env` set `BLOCKCHAIN_MODE=web3`, `CHAIN_ID=31337`, `RPC_URL=http://127.0.0.1:8545`, and the three contract addresses from `blockchain/deployments/localhost.json` + the relayer key. Restart the backend.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Verify shows TAMPERED for a seeded cert | Mock chain state out of sync — delete `backend/mock_chain_state.json` **and** `backend/instance/trustchain_local.db`, re-seed (they must be created together) |
| `EACCES ::1:3000` on frontend | Windows reserves that port; we use 5173 (already configured) |
| Port 5000 in use | Another Flask instance is running — stop it, or change the port in `wsgi.py` |
| Login says "verify your email" | Seed accounts are pre-verified; for self-registered accounts the verification token prints in the backend console (mock mail) |
