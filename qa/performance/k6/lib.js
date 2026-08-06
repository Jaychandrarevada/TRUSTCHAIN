// Shared k6 helpers: base URL, thresholds, seeded certificate pool.
// Set BASE_URL (default local) and CERT_UIDS (comma-separated seeded IDs) via env.
export const BASE = __ENV.BASE_URL || 'http://localhost:5000/api/v1';

// Seeded verification targets — the perf harness reads these from the backend
// seed output. Falls back to a single placeholder that yields a 404 (still a
// valid latency measurement of the verification path).
export const CERT_UIDS = (__ENV.CERT_UIDS || 'TC-0000-0000-0000').split(',');

export function pickCert() {
  return CERT_UIDS[Math.floor(Math.random() * CERT_UIDS.length)];
}

// SLO thresholds from SRS §6.1 — a run FAILS the pipeline if these breach.
export const VERIFY_THRESHOLDS = {
  http_req_duration: ['p(95)<3000', 'p(99)<5000'], // verdict page SLO
  http_req_failed: ['rate<0.01'],
};

export const API_THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1500'], // verification API SLO
  http_req_failed: ['rate<0.01'],
};
