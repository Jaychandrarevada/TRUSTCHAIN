# TrustChain — Test Strategy & Master Test Plan

| Field | Value |
|---|---|
| Document | Master Test Plan v1.0 |
| Date | July 2026 |
| Scope | Blockchain, Backend, Frontend modules + cross-module flows |
| Source of truth | [Planning](../../docs/planning/00-README.md) · [SRS](../../docs/specs/TRUSTCHAIN-PRD-SRS.md) · [TDD](../../docs/architecture/TRUSTCHAIN-TDD.md) · [UI/UX](../../docs/design/TRUSTCHAIN-UIUX-SPEC.md) |
| Owner | Principal QA Architect |

## 1. Testing Pyramid

```
                 ▲  fewer, slower, highest-value
        ┌────────────────┐
        │   E2E (Playwright / Cypress) │   golden path + persona journeys
        ├────────────────────────────┤
        │   Integration              │   backend↔db↔chain, FE↔API, flows
        ├──────────────────────────────────┤
        │   API / Contract (Newman, Schemathesis) │
        ├────────────────────────────────────────────┤
        │   Component (RTL) · Service (pytest) · Contract (Foundry/Hardhat) │
        ├──────────────────────────────────────────────────────────────────┤
        │   Unit — pure functions, hashing parity, verdict logic, utils    │  many, fast
        └──────────────────────────────────────────────────────────────────┘
```

Distribution target (by test count): ~70% unit, ~20% integration/API, ~10% E2E. Rationale (TDD §19): the deep trust logic (Merkle parity, verdict precedence, FSMs, RBAC) is unit/service-testable and cheap; reserve slow E2E for the irreplaceable cross-module golden path.

## 2. Testing Scope

### In scope
- **Blockchain:** 3 contracts + base + MerkleLib — unit, fuzz-style edge, security (replay/access/DoS), upgrade safety, gas.
- **Backend:** models, services (issuance/verification/revocation/institution/analytics/auth/audit), APIs (47 routes), Merkle parity, RBAC matrix.
- **Frontend:** verdict system, utils, forms/flows (claim), routing guards, a11y of the flagship verdict path.
- **Cross-module:** issuance→anchor→verify→revoke, KYB→on-chain register, claim→share→verify.
- **Non-functional:** performance/latency, load/stress/spike/soak, security (OWASP), accessibility (WCAG 2.2 AA), compatibility.

### Out of scope (this cycle)
- Production KMS/HSM signing paths (mocked; validated at staging with real keys).
- Real mainnet transactions (testnet + mock chain only).
- Third-party integrations not yet built (DigiLocker, ATS connectors, SMS DLT delivery).
- External contract audit (this plan is the *internal* gate; two external audits remain a mainnet prerequisite).

## 3. Test Environment

| Env | Purpose | Chain | Data |
|---|---|---|---|
| Local/CI | Unit, integration, API, contract | Anvil / mock client | Seeded fixtures, deterministic |
| Staging | E2E, load, DAST, a11y | Polygon Amoy | Anonymized prod-shaped volume |
| Pre-prod | Smoke + go/no-go verification | Amoy | Release-candidate build |

Backend tests use in-memory SQLite + `MockChainClient` (contract semantics reproduced); frontend tests use jsdom + mocked services; contracts use Hardhat's ephemeral chain via `loadFixture`.

## 4. Test Data Strategy

- **Deterministic fixtures:** seeded RBAC matrix, `approved_institution` (KYB-approved + mock-chain registered), operator/approver/admin actors mirroring production roles.
- **Golden path data:** 3-row and 200-row batches; parity vectors pinning Merkle hashing across TS/Python/Solidity.
- **Negative/boundary data:** malformed CSV, duplicate rows, tampered payloads, wrong-signer wallet challenges, oversized batches (>MAX_ROOTS_PER_TX).
- **PII policy:** synthetic only; no real personal data in any test tier. Erasure/salt-destruction property explicitly tested.

## 5. Entry Criteria

1. All three modules build and their existing suites pass (blockchain 54, backend 41, frontend 19).
2. Contracts compile clean (solc 0.8.24) with the internal security review documented.
3. Staging deployable via IaC; seed script idempotent.
4. Test data and fixtures available; secrets provisioned via env (never committed).

## 6. Exit Criteria

| Gate | Threshold |
|---|---|
| Unit/service coverage | Backend ≥ 85% (currently 89%), domain/verdict logic ≥ 95%, contracts ≥ 90% branch |
| Critical/high defects | 0 open |
| Security | 0 unresolved critical/high (OWASP + contract review); dev-tooling advisories triaged |
| Performance | Verify p95 < 3 s, API verify p95 < 500 ms met under nominal load |
| Load | 500 RPS sustained verification without SLO breach (target env) |
| Accessibility | 0 axe critical/serious on verify page + wallet; keyboard path complete |
| Regression | Full regression suite green on the release candidate |

## 7. Risk-Based Testing Strategy

Priority = Likelihood × Impact. Highest-risk areas get the deepest coverage.

| Risk area | L×I | Test emphasis |
|---|---|---|
| **Forgery passes as valid** (verdict engine / Merkle) | High | Parity vectors (3 languages), tamper tests, 7-verdict precedence, on/off-chain agreement |
| **Cross-tenant data leak** (RBAC/isolation) | High | Negative RBAC matrix, cross-tenant 404 probes, scope enforcement |
| **Revocation bypass / self-approval** (two-person rules) | High | SAME_ACTOR, SELF_APPROVAL_FORBIDDEN, monotonic status versions |
| **Contract exploit** (replay/access/DoS/upgrade) | High | Security suite, upgrade-preservation, duplicate-root idempotency, gas bounds |
| **Auth compromise** (JWT/lockout/refresh reuse) | High | Lockout, refresh rotation+reuse family revocation, wrong-signer wallet |
| **Chain unavailability → wrong verdict** | Medium | Degraded-state handling, never-guess-a-verdict (BR-20) |
| **Verification surge** (convocation day) | Medium | Load/spike tests at 500–1000 users |
| **Accessibility failure** (verifier can't read verdict) | Medium | WCAG AA audit, color-blind sim, screen-reader path |

Lower-risk areas (marketing copy, non-critical dashboards) get smoke coverage only.
