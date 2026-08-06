# Performance & Load Testing

Scripts benchmark the SLOs in [SRS §6.1–6.2](../../docs/specs/TRUSTCHAIN-PRD-SRS.md) and TDD §15.5.

## Scenarios

| Script | Type | Models | SLO gate |
|---|---|---|---|
| `k6/verify-load.js` | Load | 500 RPS sustained verification (NFR-SCA-02) | API p95 < 500 ms, err < 1% |
| `k6/spike.js` | Spike | 5,000 RPS convocation burst | no 5xx, p95 < 8 s (degraded ok) |
| `k6/soak.js` | Soak | 200 RPS for 2 h | latency must not drift past SLO |
| `k6/issuance-stress.js` | Stress | Concurrent bulk issuance (write path) | staging only, never prod keys |
| `locust/locustfile.py` | Load (mix) | 8:2 verify:dashboard traffic at 100/500/1000 users | confirmatory to k6 |

## Running

```bash
# 1. Seed the backend and grab real cert UIDs from the seed output.
cd backend && python -m scripts.seed   # prints TC-... UIDs
# 2. Point k6 at the target and pass the UID pool.
k6 run -e BASE_URL=http://localhost:5000/api/v1 -e CERT_UIDS=TC-...,TC-... qa/performance/k6/verify-load.js
# 3. Locust (headless, 500 users):
locust -f qa/performance/locust/locustfile.py --headless -u 500 -r 50 -t 5m \
       --host http://localhost:5000 --csv qa/reports/perf/locust-500
```

## Interpreting results

- k6 exits non-zero if any `threshold` breaches → CI can gate on it.
- Export k6 JSON (`--out json=qa/reports/perf/run.json`) and Locust CSV for the [performance report](../reports/PERFORMANCE-REPORT.md).
- The verification path is CDN-cacheable and read-only; expect it to scale near-linearly. The write (issuance) path is queue-buffered — stress it for backlog behavior, not raw RPS.

> **Environment note.** These are executed against **staging (Amoy)** or a locally seeded stack. This QA cycle documents the harness and expected budgets; the [performance report](../reports/PERFORMANCE-REPORT.md) records measured numbers per environment and flags which were captured vs. pending a provisioned load environment.
