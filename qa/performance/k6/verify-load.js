/**
 * Verification load test — the highest-traffic path (SRS NFR-SCA-02:
 * 500 RPS sustained). Ramps to a steady arrival rate and asserts the
 * verify-API SLO (p95 < 500 ms, error rate < 1%).
 *
 * Run: k6 run -e BASE_URL=https://api.sandbox.trustchain.io/v1 \
 *              -e CERT_UIDS=TC-...,TC-... qa/performance/k6/verify-load.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { BASE, pickCert, API_THRESHOLDS } from './lib.js';

export const options = {
  scenarios: {
    sustained: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 800,
      stages: [
        { target: 100, duration: '1m' },  // warm up
        { target: 500, duration: '2m' },  // ramp to SLO target
        { target: 500, duration: '5m' },  // sustained 500 RPS
        { target: 0, duration: '1m' },    // ramp down
      ],
    },
  },
  thresholds: API_THRESHOLDS,
};

export default function () {
  const res = http.get(`${BASE}/verify/${pickCert()}`);
  // A 404 (unknown UID) is a valid, fast response — we measure latency, not verdict.
  check(res, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'has verdict envelope': (r) => r.status !== 200 || r.json('verdict') !== undefined,
  });
}
