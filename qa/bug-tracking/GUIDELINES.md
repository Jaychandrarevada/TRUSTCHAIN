# Bug Tracking Guidelines (PART 15)

## Bug report template

```markdown
### Summary
<one sentence: what's broken>

### Module
Blockchain | Backend | Frontend | Cross-module | Infra

### Severity / Priority
S? / P?   (see matrices below)

### Environment
Local | CI | Staging (Amoy) | Pre-prod · build/commit SHA

### Steps to reproduce
1.
2.
3.

### Expected vs actual
- Expected:
- Actual:  (attach traceId from the error envelope if API; tx hash if chain)

### Evidence
Logs / screenshot / failing test name / request-response

### Suspected area
File:line or requirement ID (FR-/BR-/SEC-)

### Regression test
Link to the test added that now guards this (required before close).
```

## Severity matrix (impact on the system)

| Severity | Definition | Examples |
|---|---|---|
| **S1 Critical** | Data integrity / security breach / verification wrong | Forged cert reads VALID; cross-tenant leak; revocation bypass; contract exploit |
| **S2 High** | Core workflow broken, no workaround | Issuance fails to anchor; login broken; verdict page 500s |
| **S3 Medium** | Workflow degraded, workaround exists | Dashboard chart wrong; slow query; non-blocking a11y issue |
| **S4 Low** | Cosmetic / minor | Copy typo, spacing, non-critical console warning |

## Priority matrix (urgency to fix)

| Priority | SLA | Trigger |
|---|---|---|
| **P0** | Immediate, blocks release | Any S1; any S2 on the verification/issuance/auth path |
| **P1** | This sprint | S2 elsewhere; S3 on a critical workflow |
| **P2** | Backlog, planned | S3 general |
| **P3** | Opportunistic | S4 |

Severity × Priority: an S1 is always P0. An S4 can be P1 if it's on the flagship verify page (reputation surface). Record the decision, don't infer it.

## Issue lifecycle

`New → Triaged (sev/pri assigned) → In progress → Fix + regression test → In review → Verified (QA) → Closed`

- **No close without a regression test** (except S4 cosmetic with a documented waiver).
- **Reopen** if the regression test wasn't added or the fix regresses elsewhere.
- **Security bugs (S1/S2 security)** follow the private disclosure path, not public issues, until patched.

## Regression tracking

Every closed defect's regression test joins the [regression suite](../docs/REGRESSION-SUITE.md). Monthly review confirms the suite still runs green and coverage hasn't dropped below exit thresholds.
