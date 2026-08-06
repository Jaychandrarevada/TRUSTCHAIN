# TrustChain — Backend

Production Flask backend for the TrustChain certificate-verification platform: secure REST APIs (Swagger), PostgreSQL, JWT + MetaMask authentication, data-driven RBAC, and blockchain integration with the deployed [TrustChain contracts](../blockchain/README.md).

**Status:** ✅ 41/41 tests passing · 89% coverage · mock-chain mode runs with zero external dependencies · Docker/CI included.

> **Architecture note.** The TDD specified a NestJS backend; this module implements the *same approved architecture* — batch FSM with maker-checker, the 7-verdict engine with BR-15 precedence, two-person revocation, Merkle pipeline byte-compatible with `MerkleLib.sol`, the SRS §10.4 RBAC matrix — in the Python/Flask stack mandated for this build. Business rules (BR-x), requirement IDs (FR-x), and use cases (UC-x) referenced in code comments map to the [SRS](../docs/specs/TRUSTCHAIN-PRD-SRS.md).

## Quick start (no chain, no Postgres needed)

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate     # Windows (source .venv/bin/activate on Unix)
pip install -r requirements-dev.txt
pytest -q                                          # 41 tests, in-memory SQLite + mock chain
python -m scripts.seed                             # RBAC matrix + demo tenant + anchored batch
python wsgi.py                                     # → http://localhost:5000/api/v1/docs (Swagger)
```

Docker instead: `docker compose up -d` (API + Postgres 16 + Redis), then `docker compose exec api python -m scripts.seed`.

## Layout

```
backend/
├── app/
│   ├── __init__.py          # app factory: config → extensions → DI container → API
│   ├── config/settings.py   # 12-factor env config (dev/test/prod)
│   ├── extensions.py        # db, jwt, migrate, limiter, cors singletons
│   ├── errors.py            # RFC 9457-style envelope + stable error codes
│   ├── middleware/          # trace IDs, request logs, OWASP secure headers
│   ├── models/              # 14 entities: User/Role/Permission/Wallet, Institution/
│   │                        # Employer, Batch/Certificate/CertificateHistory,
│   │                        # VerificationLog/ShareLink/Notification/ActivityLog/SystemSetting
│   ├── schemas/             # Marshmallow validation (email, wallet, cert-UID, payloads)
│   ├── auth/                # RBAC matrix + decorators; bcrypt; EIP-191 signature auth
│   ├── blockchain/          # merkle.py (Solidity-parity) + client.py (Web3 | mock, DIP)
│   ├── services/            # auth, certificate, verification, revocation,
│   │                        # institution, analytics, audit (fail-closed)
│   └── api/                 # RESTX namespaces: auth, institutions, certificates,
│                            # verify (public), wallet, employers, admin, me, ops
├── tests/                   # pytest: merkle parity, auth, pipeline golden path, platform
├── scripts/seed.py          # idempotent RBAC + demo data
├── Dockerfile · docker-compose.yml · .github/workflows/backend-ci.yml
└── docs/                    # architecture notes, troubleshooting
```

## Key flows (all covered by tests)

| Flow | Endpoints | Rules enforced |
|---|---|---|
| Issuance | `POST /certificates/batches` → `/submit` → `/approve` | dry-run row errors, duplicate detection, **maker ≠ checker (403 SELF_APPROVAL_FORBIDDEN)**, Merkle build, anchor on-chain |
| Verification (public, no auth) | `GET /verify/{uid}`, `GET /verify/share/{token}`, `POST /verify/file` | 7 verdicts by BR-15 precedence; TAMPERED on any byte change; selective disclosure; share expiry/views/PIN; neutral 404s |
| Revocation | `POST /certificates/{uid}/revoke` → `/revoke/confirm` | **two different approvers (403 SAME_ACTOR)**, irreversible, monotonic status roots, holder notified |
| Claim & share | `POST /wallet/claim`, `POST /wallet/shares` | identity-field match (BR-05), field selection, instant share revoke |
| KYB | `POST /institutions` → `POST /admin/kyb/{id}/approve` | human decision → on-chain `registerIssuer`; suspended tenants can't issue but certificates still verify (SUSPENDED_ISSUER) |
| Auth | `/auth/*` | lockout after 5 failures, refresh rotation + family revocation on reuse, password reset revokes sessions, **MetaMask challenge login** (nonce single-use, 5-min TTL, EIP-191 recover) |

## Configuration

Copy `.env.example` → `.env`. Highlights:

| Variable | Meaning |
|---|---|
| `BLOCKCHAIN_MODE` | `mock` (default — full functionality, no node) or `web3` |
| `RPC_URL`, `CHAIN_ID`, `*_ADDRESS` | Point at the deployed contracts (`blockchain/deployments/<network>.json`) |
| `RELAYER_PRIVATE_KEY` | Dev/testnet only — production signs via KMS (SEC-KEY-2) |
| `DATABASE_URL` | PostgreSQL DSN; tests auto-use in-memory SQLite |
| `JWT_*`, `SECRET_KEY` | Token lifetimes and signing secrets (Secrets Manager in prod) |

## Database migrations

Dev/tests use `db.create_all()` for speed. For real environments (Alembic via Flask-Migrate):

```bash
flask --app wsgi:app db init      # once
flask --app wsgi:app db migrate -m "initial schema"
flask --app wsgi:app db upgrade
```

Migration policy follows the TDD (§5.6): expand → migrate → contract, backward-compatible per release.

## Security posture (PART 9 mapping)

HTTPS/HSTS + secure headers (`middleware/request_context.py`) · JWT: 15-min access, rotating refresh with reuse detection · rate limits per endpoint class (Redis-backed in prod) · CORS allowlist; Bearer-token auth means no cookies → no CSRF surface (documented) · SQL injection: SQLAlchemy parameterization only · XSS: JSON API + `nosniff`; certificate data never rendered as HTML by this service · input validation: Marshmallow at every boundary, unknown-field rejection on privileged routes · secrets from env/Secrets Manager, never committed · fail-closed audit logging on every privileged action with trace IDs.

## Tests & coverage

```bash
pytest -q                         # 41 tests
pytest --cov=app --cov-report=html    # 89% total; uncovered = real-RPC Web3 paths + 500 safety nets
```

The Merkle parity test pins the hash pipeline to `blockchain/utils/merkle.ts` / `MerkleLib.sol` — if it fails, on- and off-chain hashing diverged; fix both together, never one.

## Docs

- Swagger/OpenAPI: `GET /api/v1/docs` (live), spec at `GET /api/v1/swagger.json`
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layering, DI, verdict engine, chain integration
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- Upstream: [SRS](../docs/specs/TRUSTCHAIN-PRD-SRS.md) · [TDD](../docs/architecture/TRUSTCHAIN-TDD.md) · [blockchain layer](../blockchain/README.md)
