"""
Request middleware: trace IDs, structured request logging, security headers.

- Trace ID: every request gets `g.trace_id` (honors inbound X-Request-Id from
  the load balancer); echoed in responses and every log line (NFR-AUD-03).
- Request log: one structured line per request (method, path, status, ms).
- Security headers: OWASP secure-header baseline; HTTPS enforcement via HSTS
  (TLS itself terminates at the edge — TDD §18.2).
"""
from __future__ import annotations

import logging
import time
import uuid

from flask import Flask, g, request

log = logging.getLogger("trustchain.request")


def register_request_context(app: Flask) -> None:
    @app.before_request
    def _begin():
        g.trace_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
        g._started = time.perf_counter()

    @app.after_request
    def _finish(response):
        # ── Structured request log (skip noisy health probes) ────────────────
        if not request.path.startswith("/api/v1/health"):
            elapsed_ms = round((time.perf_counter() - getattr(g, "_started", time.perf_counter())) * 1000, 1)
            log.info(
                "request",
                extra={
                    "trace_id": g.get("trace_id", "-") if hasattr(g, "get") else getattr(g, "trace_id", "-"),
                    "method": request.method,
                    "path": request.path,
                    "status": response.status_code,
                    "duration_ms": elapsed_ms,
                    "ip": request.headers.get("X-Forwarded-For", request.remote_addr),
                },
            )

        # ── Trace echo + secure headers (OWASP) ──────────────────────────────
        response.headers["X-Request-Id"] = getattr(g, "trace_id", "-")
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Cache-Control", "no-store")  # API responses are not cacheable by default
        if not app.debug and not app.testing:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"
            )
            # Defense-in-depth CSP for the swagger UI page (the only HTML we serve).
            response.headers.setdefault("Content-Security-Policy", "default-src 'self' 'unsafe-inline'")
        return response
