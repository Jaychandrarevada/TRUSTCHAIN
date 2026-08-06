"""
Locust load model — an alternative/confirmatory harness to k6 (PART 10).
Models the realistic traffic mix: verification dominates (public, unauthenticated),
with a smaller authenticated dashboard/read load.

Run: locust -f qa/performance/locust/locustfile.py --host https://api.sandbox.trustchain.io
Then drive 100 / 500 / 1000 users from the web UI or headless:
  locust -f ... --headless -u 500 -r 50 -t 5m --host ...
"""
from __future__ import annotations

import os
import random

from locust import HttpUser, between, task

CERT_UIDS = os.environ.get("CERT_UIDS", "TC-0000-0000-0000").split(",")


class Verifier(HttpUser):
    """Anonymous verifier — the dominant traffic class (weight 8)."""

    weight = 8
    wait_time = between(1, 5)  # humans scanning QRs

    @task(5)
    def verify_by_uid(self):
        uid = random.choice(CERT_UIDS)
        with self.client.get(f"/api/v1/verify/{uid}", name="/verify/:uid",
                             catch_response=True) as res:
            # 200 (valid) and 404 (unknown) are both correct fast responses.
            if res.status_code in (200, 404):
                res.success()
            else:
                res.failure(f"unexpected {res.status_code}")

    @task(1)
    def health(self):
        self.client.get("/api/v1/health/ready", name="/health/ready")


class DashboardUser(HttpUser):
    """Authenticated read load (issuer/employer dashboards) — weight 2.
    Provides AUTH_TOKEN via env to exercise the authenticated path."""

    weight = 2
    wait_time = between(2, 8)

    def on_start(self):
        self.token = os.environ.get("AUTH_TOKEN")

    @task
    def analytics(self):
        if not self.token:
            return
        self.client.get("/api/v1/analytics/issuer", name="/analytics/issuer",
                        headers={"Authorization": f"Bearer {self.token}"})
