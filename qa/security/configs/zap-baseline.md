# OWASP ZAP — DAST baseline scan

Dynamic scan of the running stack (frontend + backend API). Run against
**staging**, never production.

## Baseline (passive) scan

```bash
docker run -t --rm -v $(pwd)/qa/reports/security:/zap/wrk:rw \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://app.sandbox.trustchain.io \
  -r zap-baseline.html -J zap-baseline.json
```

## Authenticated API scan (active — staging only)

```bash
docker run -t --rm -v $(pwd)/qa/reports/security:/zap/wrk:rw \
  ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py \
  -t https://api.sandbox.trustchain.io/api/v1/swagger.json -f openapi \
  -r zap-api.html -J zap-api.json
```

## Expected findings triage

| ZAP alert | Expectation | Rationale |
|---|---|---|
| CSP header | Present on HTML; API is JSON-only | `middleware/request_context.py` sets CSP + nosniff + frame-deny |
| Anti-CSRF tokens | N/A on Bearer API | Token auth, no cookies → no CSRF surface (documented) |
| Cache-control | `no-store` on API responses | Set in middleware |
| Info disclosure | No stack traces | Centralized error envelope returns opaque 500s |
| HSTS | Present in prod (not debug) | Enabled when not app.debug/testing |

Any **High** alert is a release blocker; **Medium** requires a triage decision recorded in the [security report](../reports/SECURITY-AUDIT-REPORT.md).
