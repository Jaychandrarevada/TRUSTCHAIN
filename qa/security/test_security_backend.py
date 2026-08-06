"""
Executable security test suite (PART 7) — runs against the Flask app's test
client, exercising the OWASP-relevant surfaces with real attack payloads. These
are the automated proof for the findings in the security audit report.

Run from backend/:  pytest ../qa/security/test_security_backend.py
(imports the backend app + fixtures; SQLite + MockChainClient, no external deps).
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Make the backend package importable when run from the qa/ tree.
BACKEND = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(BACKEND))

from tests.conftest import PASSWORD, login, make_user  # noqa: E402  (backend fixtures)

pytestmark = pytest.mark.usefixtures("app")


# ── A01 Broken Access Control ─────────────────────────────────────────────────
class TestAccessControl:
    def test_unauthenticated_cannot_reach_protected_routes(self, client):
        for path in ["/api/v1/wallet/credentials", "/api/v1/certificates",
                     "/api/v1/admin/kyb", "/api/v1/analytics/issuer"]:
            assert client.get(path).status_code == 401, path

    def test_student_cannot_issue_or_admin(self, client, app):
        make_user("attacker@test.local", "student")
        headers = login(client, "attacker@test.local")
        assert client.post("/api/v1/certificates/batches", headers=headers,
                           json={"name": "x", "rows": [{}]}).status_code == 403
        assert client.get("/api/v1/admin/kyb", headers=headers).status_code == 403

    def test_cross_tenant_probe_returns_neutral_404(self, client, approved_institution):
        # Issue in tenant A, probe from tenant B → 404, never 403-with-data-leak.
        from tests.test_certificates import _issue_batch, _first_uid
        _issue_batch(client, approved_institution)
        uid = _first_uid(client)

        from app.extensions import db
        from app.models import Institution
        other = Institution(legal_name="Evil College", slug="evil-college")
        db.session.add(other)
        db.session.commit()
        make_user("spy@evil.local", "operator", other.id)
        spy = login(client, "spy@evil.local")
        assert client.get(f"/api/v1/certificates/{uid}", headers=spy).status_code == 404


# ── A03 Injection (SQLi / payload) ────────────────────────────────────────────
class TestInjection:
    @pytest.mark.parametrize("payload", [
        "TC-1234-5678-9ABC' OR '1'='1",
        "'; DROP TABLE certificates;--",
        "TC-0000-0000-0000 UNION SELECT * FROM users",
    ])
    def test_sql_injection_in_verify_is_neutralized(self, client, payload):
        # Parameterized ORM queries → injection strings are treated as data.
        res = client.get(f"/api/v1/verify/{payload}")
        assert res.status_code in (400, 404)  # never 500 / never data leak
        assert "users" not in res.get_data(as_text=True).lower() or res.status_code == 404

    def test_malformed_json_is_rejected_cleanly(self, client):
        make_user("u@test.local", "student")
        headers = login(client, "u@test.local")
        res = client.post("/api/v1/wallet/claim", headers=headers,
                          data="{not json", content_type="application/json")
        assert res.status_code in (400, 422)


# ── A07 Auth failures ─────────────────────────────────────────────────────────
class TestAuthentication:
    def test_account_lockout(self, client, app):
        make_user("lock@test.local", "student")
        for _ in range(5):
            client.post("/api/v1/auth/login", json={"email": "lock@test.local", "password": "wrong"})
        res = client.post("/api/v1/auth/login", json={"email": "lock@test.local", "password": PASSWORD})
        assert res.status_code == 423

    def test_refresh_reuse_revokes_family(self, client, app):
        make_user("rot@test.local", "student")
        tokens = client.post("/api/v1/auth/login",
                             json={"email": "rot@test.local", "password": PASSWORD}).get_json()
        rh = {"Authorization": f"Bearer {tokens['refresh_token']}"}
        assert client.post("/api/v1/auth/token/refresh", headers=rh).status_code == 200
        # Reuse of the now-rotated token must fail (theft detection).
        assert client.post("/api/v1/auth/token/refresh", headers=rh).status_code == 401

    def test_enumeration_resistance(self, client):
        # Unknown vs known email must be indistinguishable on login + reset.
        r1 = client.post("/api/v1/auth/login", json={"email": "nobody@x.com", "password": "x"})
        r2 = client.post("/api/v1/auth/password/forgot", json={"email": "nobody@x.com"})
        assert r1.status_code == 401
        assert r2.status_code == 202  # always 202 regardless of existence


# ── Business-rule security (two-person, self-approval) ────────────────────────
class TestBusinessRuleSecurity:
    def test_self_approval_forbidden(self, client, approved_institution):
        inst = approved_institution["institution"]
        make_user("solo@test.local", "operator", inst.id)
        make_user("solo@test.local", "approver", inst.id)
        solo = login(client, "solo@test.local")
        batch = client.post("/api/v1/certificates/batches", headers=solo, json={
            "name": "b", "rows": [{"holder_name": "A", "holder_email": "a@x.com", "program": "P"}]}).get_json()
        client.post(f"/api/v1/certificates/batches/{batch['id']}/submit", headers=solo)
        res = client.post(f"/api/v1/certificates/batches/{batch['id']}/approve", headers=solo)
        assert res.status_code == 403 and res.get_json()["code"] == "SELF_APPROVAL_FORBIDDEN"


# ── Secure headers + error hygiene ────────────────────────────────────────────
class TestHardening:
    def test_security_headers(self, client):
        res = client.get("/api/v1/health/live")
        assert res.headers["X-Content-Type-Options"] == "nosniff"
        assert res.headers["X-Frame-Options"] == "DENY"
        assert res.headers.get("Cache-Control") == "no-store"

    def test_errors_carry_traceid_not_stack_traces(self, client):
        res = client.get("/api/v1/verify/TC-0000-0000-0000")
        body = res.get_json()
        assert "traceId" in body
        assert "Traceback" not in res.get_data(as_text=True)
