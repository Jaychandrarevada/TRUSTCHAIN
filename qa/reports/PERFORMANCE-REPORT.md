# TrustChain — Performance & Load Report (PARTS 9–10)

| Field | Value |
|---|---|
| SLO source | SRS §6.1–6.2, TDD §15.5 |
| Harness | k6 (`qa/performance/k6`), Locust (`qa/performance/locust`) |
| Status | Harness verified; measured numbers pending a provisioned load environment (see §4) |

## 1. SLO targets (the pass/fail budgets)

| Path | Metric | Target |
|---|---|---|
| Public verification page | p50 / p95 / p99 | 1 s / 3 s / 5 s |
| Verification API | p95 / p99 | 500 ms / 1.5 s |
| Bulk validation (50k rows) | duration | < 5 min |
| Anchor latency (approval→confirmed) | p95 | < 15 min |
| Revocation propagation | worst case | ≤ 5 min |
| Sustained throughput | verification | 500 RPS |
| Burst throughput | verification | 5,000 RPS (degraded ok) |
| Dashboards | p95 TTI | < 2 s |

## 2. Micro-benchmarks (captured locally, mock chain)

These are measured from the existing suites and gas report — real numbers, single-node, no network:

| Operation | Observed | Note |
|---|---|---|
| Contract `anchorRoot` gas | 68,565 avg | gas reporter (blockchain) |
| Contract `anchorRoots` (100) | < 2.7M gas | within any block; DoS-bounded |
| Verdict composition (backend, mock chain) | sub-ms logic | verification is read-only; dominated by chain-state read (cached in prod) |
| Frontend verify route JS | ~93 KB gz initial + lazy | route-split; ethers/recharts load only where used |
| Frontend production build | 11 s | vite build, all chunks |

## 3. Load-test scenarios (scripted, ready to run)

| Scenario | Script | Profile | Gate |
|---|---|---|---|
| Sustained load | `k6/verify-load.js` | ramp → 500 RPS × 5 min | API p95 < 500 ms, err < 1% |
| Spike | `k6/spike.js` | 100 → 5,000 RPS in 10 s | no 5xx, p95 < 8 s |
| Soak | `k6/soak.js` | 200 RPS × 2 h | no latency drift past SLO |
| Issuance stress | `k6/issuance-stress.js` | ramp VUs, write path | staging only |
| Mixed (100/500/1000 users) | `locust/locustfile.py` | 8:2 verify:dashboard | confirmatory |

## 4. Execution status & environment note

This QA cycle **built and verified the harness** (scripts parse, thresholds encode the SLOs, seeded-UID injection works) and captured the micro-benchmarks above. Full load numbers require a provisioned load environment (staging on Amoy with CDN + read replicas per TDD §18) — running 5,000-RPS k6 against a single local dev process would measure the laptop, not the architecture, and would produce misleading figures.

**To produce the measured report:** deploy the release candidate to staging, seed certificates, run:
```bash
k6 run -e BASE_URL=https://api.sandbox.trustchain.io/v1 -e CERT_UIDS=... \
       --out json=qa/reports/perf/verify-load.json qa/performance/k6/verify-load.js
```
k6 exits non-zero on threshold breach, so the numbers self-grade against the SLOs.

## 5. Architectural expectation

The verification path is **read-only and CDN-cacheable** (verdict shell ISR + Redis hot cache + chain indexer), so it should scale near-linearly to the 500-RPS target and absorb the 5,000-RPS spike from cache. The write (issuance) path is **queue-buffered** — under stress it stretches anchoring latency rather than dropping work, which the soak/stress scripts are designed to observe. No synchronous chain call sits on any user-facing request (the relayer batches asynchronously), which is the key design decision that keeps p95 under budget.
