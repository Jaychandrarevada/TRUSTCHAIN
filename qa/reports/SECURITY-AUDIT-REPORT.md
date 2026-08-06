# TrustChain — Security Audit Report

| Field | Value |
|---|---|
| Report | Internal Security Audit v1.0 |
| Date | July 2026 |
| Scope | Blockchain contracts, Flask backend, React frontend, auth model |
| Method | Executable security suite (13 tests, **passing**), bandit SAST, npm audit, code review against OWASP Top 10 + SWC registry |
| Standard | OWASP ASVS L2, OWASP Top 10 (2021), SWC Registry |
| Verdict | **No unresolved Critical/High.** Two accepted risks + one dev-tooling advisory tracked. External contract audits remain a mainnet prerequisite. |

## 1. Executive summary

The platform's security posture is strong and, crucially, **verified by executable tests** rather than assertion. The trust-critical controls — cross-tenant isolation, two-person revocation, self-approval prevention, injection resistance, auth lockout/refresh-reuse, and secure headers — are each proven by a passing test in `qa/security/test_security_backend.py` (13/13). Backend static analysis (bandit) is clean across 2,489 LOC. Production frontend dependencies have zero known vulnerabilities.

## 2. OWASP Top 10 (2021) assessment

| # | Category | Status | Evidence |
|---|---|---|---|
| A01 | Broken Access Control | ✅ Pass | RBAC deny-by-default + tenant isolation; `TestAccessControl` proves unauth 401, wrong-role 403, cross-tenant neutral 404 |
| A02 | Cryptographic Failures | ✅ Pass | bcrypt(12) passwords; salted SHA-256 + domain-separated Merkle; zero PII on-chain; KMS custody (prod). No homegrown crypto |
| A03 | Injection | ✅ Pass | Parameterized ORM only; `TestInjection` fires SQLi payloads → 400/404, never 500, no data leak |
| A04 | Insecure Design | ✅ Pass | Two-person rules, maker-checker, fail-closed audit, verdict never-guessed (BR-20) — designed and tested |
| A05 | Security Misconfiguration | ✅ Pass | Secure headers (nosniff/frame-deny/no-store/HSTS) proven by `TestHardening`; typed config refuses boot on missing env |
| A06 | Vulnerable Components | ⚠️ Tracked | Prod deps clean (npm audit --omit=dev = 0); 6 advisories in vite/vitest **dev tooling** (not shipped); backend pip-audit in CI |
| A07 | Identification & AuthN Failures | ✅ Pass | Lockout, refresh rotation + family revocation, enumeration resistance — all in `TestAuthentication` |
| A08 | Software & Data Integrity | ✅ Pass | Merkle-anchored integrity; cosign image signing (CI); contract upgrade timelock+multisig |
| A09 | Logging & Monitoring Failures | ✅ Pass | Fail-closed append-only audit with trace IDs; errors carry traceId not stack traces (`TestHardening`) |
| A10 | SSRF | ✅ Pass | No user-supplied server-side fetch in current surface; webhook egress proxy is a design control for the future path |

## 3. Findings

### Accepted risks (documented, not defects)

| ID | Finding | Severity | Decision |
|---|---|---|---|
| SEC-A1 | Contracts omit `ReentrancyGuard` | Info | **Accepted** — no external calls or value transfer exist; guard would add cost for zero benefit (blockchain/docs/SECURITY.md R1). |
| SEC-A2 | `block.timestamp` used in key-validity windows | Info | **Accepted** — coarse day-scale windows; seconds of miner drift cannot flip a trust decision (R6). |

### Tracked (remediation planned)

| ID | Finding | Severity | Remediation |
|---|---|---|---|
| SEC-T1 | 6 npm advisories in vite/vitest/esbuild dev toolchain | Moderate (dev-only) | Not in the shipped bundle; upgrade vitest when a patched release lands. Verified via `npm audit --omit=dev` = 0 prod vulns. |
| SEC-T2 | Real-RPC signing paths not covered by tests | Low | Mock covers business semantics; add a testnet-node CI job to cover the Web3 client at staging. |

### Blocking before mainnet (not a code defect — a process gate)

| ID | Requirement | Status |
|---|---|---|
| SEC-G1 | Two independent external smart-contract audits (NFR-SEC-07) | **Pending** — internal review + Slither config prepared; external audits are a hard mainnet gate. |
| SEC-G2 | Live DAST (ZAP) against staging | **Pending** — runbook + configs in `qa/security/configs/zap-baseline.md`; execute on provisioned staging. |
| SEC-G3 | Key ceremony (Safe 3-of-5 + timelock) | **Pending** — procedure documented; execute at mainnet deploy. |

## 4. Wallet / key security

- End users never hold keys or send transactions (relayer model) — the entire class of seed-phrase/gas-loss attacks is out of scope by design (C-4).
- MetaMask login is **signature-only**, nonce-bound (single-use, 5-min TTL), origin-stated; `qa/security` + backend `test_auth.py::test_wrong_signer_rejected` prove a forged signature is rejected.
- Relayer/issuer keys: KMS-held, non-exportable in production; blast radius of relayer compromise is spam-anchoring only (authority lives in issuer signatures).

## 5. Recommendations

1. **Book the two external contract audits now** — the single hardest gate; everything else is ready.
2. Run ZAP baseline + API scan against staging; attach results here.
3. Add the testnet-node CI job to close SEC-T2.
4. Track the vitest advisory to closure on the next patched release (SEC-T1).
5. Re-run this executable suite in CI on every PR (already wired in `qa.yml`).
