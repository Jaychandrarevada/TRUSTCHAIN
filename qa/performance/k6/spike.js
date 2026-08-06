/**
 * Spike test — convocation/result-day surge (SRS NFR-SCA-02: 5,000 RPS burst).
 * Validates CDN/cache + graceful degradation, not steady-state throughput.
 */
import http from 'k6/http';
import { check } from 'k6';
import { BASE, pickCert } from './lib.js';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 3000,
      stages: [
        { target: 100, duration: '30s' },   // baseline
        { target: 5000, duration: '10s' },   // sudden spike
        { target: 5000, duration: '1m' },    // hold the burst
        { target: 100, duration: '30s' },    // recover
      ],
    },
  },
  thresholds: {
    // Under spike we accept degraded latency but NOT errors (cache must hold).
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<8000'],
  },
};

export default function () {
  const res = http.get(`${BASE}/verify/${pickCert()}`);
  check(res, { 'not a 5xx': (r) => r.status < 500 });
}
