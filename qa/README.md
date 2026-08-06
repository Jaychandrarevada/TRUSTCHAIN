# TrustChain — QA, Security & Performance Module

Complete quality assurance layer over the [blockchain](../blockchain/README.md), [backend](../backend/README.md), and [frontend](../frontend/README.md) modules. Enterprise-grade, automated where possible, and **honest about what was executed vs. scaffolded for staging**.

## Headline result

**127/127 automated tests pass** · backend SAST clean (0 findings) · frontend production dependencies 0 vulnerabilities · zero Critical/High defects. **Recommendation: GO for staging/testnet pilot; NO-GO for mainnet** until external contract audits, measured staging load, and the key ceremony close (see [production readiness](reports/PRODUCTION-READINESS.md)).

## Layout

```
qa/
├── docs/
│   ├── TEST-STRATEGY.md      # pyramid, scope, plan, env, data, entry/exit, risk-based
│   ├── REGRESSION-SUITE.md   # critical-workflow → guarding-test map
│   └── CODE-QUALITY.md       # lint/complexity/debt + measured metrics
├── security/
│   ├── test_security_backend.py  # 13 executable OWASP proofs (PASSING)
│   ├── conftest.py               # bridges backend fixtures
│   └── configs/                  # slither, bandit, zap runbooks
├── performance/
│   ├── k6/                    # verify-load, spike, soak, issuance-stress + lib
│   └── locust/               # mixed-traffic model (100/500/1000 users)
├── accessibility/
│   ├── axe-audit.mjs         # Playwright + axe, CI-gating
│   └── manual-checklist.md   # 12-point AT checklist
├── e2e/
│   ├── playwright.config.ts  # 5-browser/device matrix
│   └── *.spec.ts             # verification + auth/issuance golden paths
├── postman/                  # collection + env + newman-run.sh
├── bug-tracking/GUIDELINES.md # templates + severity/priority matrices
└── reports/                  # QA · security · blockchain audit · perf · a11y ·
                              # coverage · cross-platform · risk · production-readiness
```

## Run the QA pack

```bash
# Automated (real results, no infra needed)
cd blockchain && npm test                                   # 54
cd backend && pytest -q && pytest ../qa/security/ -q         # 41 + 13
cd frontend && npm run test:coverage                         # 19

# Against a seeded staging stack
node qa/accessibility/axe-audit.mjs
npx playwright test --config qa/e2e/playwright.config.ts
qa/postman/newman-run.sh
k6 run -e BASE_URL=... -e CERT_UIDS=... qa/performance/k6/verify-load.js
```

CI runs the automated matrix on every PR ([.github/workflows/qa.yml](../.github/workflows/qa.yml)); the heavier E2E/a11y jobs run on merge to `main`.

## Reports index

| Report | What it answers |
|---|---|
| [QA-REPORT.md](reports/QA-REPORT.md) | Overall test execution + what's executed vs scaffolded |
| [SECURITY-AUDIT-REPORT.md](reports/SECURITY-AUDIT-REPORT.md) | OWASP Top 10, findings, fixes |
| [BLOCKCHAIN-SECURITY-AUDIT.md](reports/BLOCKCHAIN-SECURITY-AUDIT.md) | Contract vectors, severity/impact/likelihood, SWC |
| [PERFORMANCE-REPORT.md](reports/PERFORMANCE-REPORT.md) | SLO budgets, benchmarks, load harness |
| [ACCESSIBILITY-REPORT.md](reports/ACCESSIBILITY-REPORT.md) | WCAG 2.2 AA conformance |
| [COVERAGE-REPORT.md](reports/COVERAGE-REPORT.md) | Coverage by module + risk area |
| [CROSS-PLATFORM-MATRIX.md](reports/CROSS-PLATFORM-MATRIX.md) | Browser/OS/device support |
| [RISK-ASSESSMENT.md](reports/RISK-ASSESSMENT.md) | Post-test residual risk |
| [PRODUCTION-READINESS.md](reports/PRODUCTION-READINESS.md) | Checklist + **Go/No-Go** |

## Principle

This QA layer never fakes a result. Where a tool needs running infrastructure (load, DAST, cross-browser, screen readers), the harness is built, verified, and SLO/threshold-gated, and the report says "execute on staging" rather than inventing numbers. Everything marked ✅ was actually run.
