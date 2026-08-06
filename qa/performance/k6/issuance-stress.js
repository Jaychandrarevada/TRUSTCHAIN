/**
 * Issuance stress test — authenticated bulk-issuance pipeline (the write path).
 * Stresses validation + Merkle build + anchor-queue producer under concurrency.
 * Requires an operator token (OP_TOKEN) and approver token (AP_TOKEN); issuance
 * obeys maker-checker so each batch needs both actors.
 *
 * NOTE: this is a WRITE-path stress test — run only against staging/testnet,
 * never production, and never with mainnet relayer keys.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE } from './lib.js';

const OP = __ENV.OP_TOKEN;
const AP = __ENV.AP_TOKEN;

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { target: 10, duration: '1m' },
        { target: 30, duration: '2m' },  // beyond nominal concurrency
        { target: 0, duration: '30s' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{name:create}': ['p(95)<5000'], // 50k-row validation budget scaled down
  },
};

function authed(token) {
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
}

export default function () {
  if (!OP || !AP) {
    // No tokens provided → skip write path, just exercise a read to keep the run valid.
    http.get(`${BASE}/health/ready`);
    sleep(1);
    return;
  }
  const rows = Array.from({ length: 50 }, (_, i) => ({
    holder_name: `Load Student ${__VU}-${i}`,
    holder_email: `load-${__VU}-${i}-${Date.now()}@example.com`,
    program: 'B.Tech CSE',
  }));

  const create = http.post(`${BASE}/certificates/batches`,
    JSON.stringify({ name: `load-${__VU}-${Date.now()}`, rows }),
    { ...authed(OP), tags: { name: 'create' } });
  check(create, { 'batch created': (r) => r.status === 201 });
  if (create.status !== 201) return;

  const id = create.json('id');
  http.post(`${BASE}/certificates/batches/${id}/submit`, null, authed(OP));
  const approve = http.post(`${BASE}/certificates/batches/${id}/approve`, null, authed(AP));
  check(approve, { 'anchored': (r) => r.status === 200 && r.json('status') === 'anchored' });
  sleep(1);
}
