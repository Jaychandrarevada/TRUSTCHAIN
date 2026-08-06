/**
 * Soak test — 2-hour steady load to surface memory leaks, connection-pool
 * exhaustion, and latency drift (SRS reliability). Run in staging off-peak.
 */
import http from 'k6/http';
import { check } from 'k6';
import { BASE, pickCert, API_THRESHOLDS } from './lib.js';

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-arrival-rate',
      rate: 200,            // 200 RPS for 2h
      timeUnit: '1s',
      duration: '2h',
      preAllocatedVUs: 300,
      maxVUs: 500,
    },
  },
  thresholds: API_THRESHOLDS, // latency must not drift past SLO over 2h
};

export default function () {
  const res = http.get(`${BASE}/verify/${pickCert()}`);
  check(res, { 'ok or not-found': (r) => r.status === 200 || r.status === 404 });
}
