"""
Certificate pipeline tests — the golden path (UC-02..05) end-to-end over the
API with the mock chain: batch → validate → submit → approve (maker-checker)
→ anchor → verify → claim → share → revoke (two-person) → supersede.
"""
from __future__ import annotations

from tests.conftest import login, make_user

ROWS = [
    {"holder_name": "Student One", "holder_email": "s1@example.com", "program": "B.Tech CSE"},
    {"holder_name": "Student Two", "holder_email": "s2@example.com", "program": "B.Tech CSE"},
    {"holder_name": "Student Three", "holder_email": "s3@example.com", "program": "B.Tech ECE"},
]


def _issue_batch(client, ctx) -> dict:
    """Helper: full issuance through the API; returns the anchored batch JSON."""
    op = login(client, "operator@test.local")
    ap = login(client, "approver@test.local")
    batch = client.post("/api/v1/certificates/batches", headers=op,
                        json={"name": "Test 2026", "rows": ROWS}).get_json()
    assert batch["status"] == "validated"
    assert client.post(f"/api/v1/certificates/batches/{batch['id']}/submit", headers=op).status_code == 200
    res = client.post(f"/api/v1/certificates/batches/{batch['id']}/approve", headers=ap)
    assert res.status_code == 200, res.get_json()
    anchored = res.get_json()
    assert anchored["status"] == "anchored"
    assert anchored["merkle_root"] and anchored["anchor_tx_hash"]
    return anchored


def _first_uid(client) -> str:
    op = login(client, "operator@test.local")
    return client.get("/api/v1/certificates", headers=op).get_json()["data"][0]["cert_uid"]


def test_dry_run_reports_row_errors(client, approved_institution):
    op = login(client, "operator@test.local")
    bad_rows = [{"holder_name": "", "holder_email": "not-an-email-but-lenient", "program": ""}]
    batch = client.post("/api/v1/certificates/batches", headers=op,
                        json={"name": "Bad", "rows": bad_rows}).get_json()
    assert batch["status"] == "draft"  # blocked from progressing
    errors = batch["error_report"]["errors"]
    assert any(e["field"] == "holder_name" for e in errors)
    assert any(e["field"] == "program" for e in errors)


def test_duplicate_rows_flagged(client, approved_institution):
    op = login(client, "operator@test.local")
    rows = [ROWS[0], ROWS[0]]  # same holder + program
    batch = client.post("/api/v1/certificates/batches", headers=op,
                        json={"name": "Dup", "rows": rows}).get_json()
    assert batch["status"] == "draft"
    assert any("Duplicate" in e["message"] for e in batch["error_report"]["errors"])


def test_maker_cannot_approve_own_batch(client, approved_institution):
    """BR-21: the creator holding approver rights still cannot self-approve."""
    inst = approved_institution["institution"]
    make_user("both@test.local", "approver", inst.id)
    make_user("both@test.local", "operator", inst.id)
    both = login(client, "both@test.local")

    batch = client.post("/api/v1/certificates/batches", headers=both,
                        json={"name": "Self", "rows": ROWS}).get_json()
    client.post(f"/api/v1/certificates/batches/{batch['id']}/submit", headers=both)
    res = client.post(f"/api/v1/certificates/batches/{batch['id']}/approve", headers=both)
    assert res.status_code == 403
    assert res.get_json()["code"] == "SELF_APPROVAL_FORBIDDEN"


def test_golden_path_issue_and_verify_valid(client, approved_institution):
    _issue_batch(client, approved_institution)
    uid = _first_uid(client)

    # Public verification — no auth.
    verdict = client.get(f"/api/v1/verify/{uid}").get_json()
    assert verdict["verdict"] == "VALID"
    assert verdict["checks"]["anchor"]["pass"] is True
    assert verdict["checks"]["merkle_proof"]["pass"] is True
    # Disclosure: default public fields only — email never leaks (BR-17).
    assert "holder_email" not in verdict["certificate"]["disclosed_fields"]


def test_tampered_payload_detected(client, approved_institution):
    _issue_batch(client, approved_institution)
    op = login(client, "operator@test.local")
    certs = client.get("/api/v1/certificates", headers=op).get_json()["data"]
    uid = certs[0]["cert_uid"]
    detail = client.get(f"/api/v1/certificates/{uid}", headers=op).get_json()

    tampered = dict(detail["subject_data"])
    tampered["program"] = "PhD Quantum Everything"  # the forgery
    verdict = client.post("/api/v1/verify/file", json={"cert_uid": uid, "payload": tampered}).get_json()
    assert verdict["verdict"] == "TAMPERED"

    # The genuine payload passes.
    verdict = client.post("/api/v1/verify/file",
                          json={"cert_uid": uid, "payload": detail["subject_data"]}).get_json()
    assert verdict["verdict"] == "VALID"


def test_two_person_revocation(client, approved_institution):
    _issue_batch(client, approved_institution)
    uid = _first_uid(client)
    ap = login(client, "approver@test.local")

    # Initiate (person 1).
    res = client.post(f"/api/v1/certificates/{uid}/revoke", headers=ap,
                      json={"reason_code": "fraud"})
    assert res.status_code == 202
    # Same actor cannot confirm (BR-21).
    res = client.post(f"/api/v1/certificates/{uid}/revoke/confirm", headers=ap)
    assert res.status_code == 403
    assert res.get_json()["code"] == "SAME_ACTOR"
    # Still VALID until confirmed.
    assert client.get(f"/api/v1/verify/{uid}").get_json()["verdict"] == "VALID"

    # Second approver confirms → REVOKED + status root on (mock) chain.
    inst = approved_institution["institution"]
    make_user("approver2@test.local", "approver", inst.id)
    ap2 = login(client, "approver2@test.local")
    res = client.post(f"/api/v1/certificates/{uid}/revoke/confirm", headers=ap2)
    assert res.status_code == 200
    assert res.get_json()["status"] == "revoked"
    assert client.get(f"/api/v1/verify/{uid}").get_json()["verdict"] == "REVOKED"


def test_suspended_issuer_verdict(client, approved_institution):
    """BR-09/BR-15: suspension never blocks verification; verdict says SUSPENDED_ISSUER."""
    _issue_batch(client, approved_institution)
    uid = _first_uid(client)
    admin = login(client, "admin@test.local")
    inst = approved_institution["institution"]

    res = client.post(f"/api/v1/admin/tenants/{inst.id}/status", headers=admin,
                      json={"status": "suspended"})
    assert res.status_code == 200
    assert client.get(f"/api/v1/verify/{uid}").get_json()["verdict"] == "SUSPENDED_ISSUER"

    # And suspended issuers cannot create new batches (BR-08).
    op = login(client, "operator@test.local")
    res = client.post("/api/v1/certificates/batches", headers=op,
                      json={"name": "Blocked", "rows": ROWS})
    assert res.status_code == 422


def test_claim_share_and_selective_disclosure(client, approved_institution):
    _issue_batch(client, approved_institution)
    uid = _first_uid(client)
    make_user("s1@example.com", "student")
    holder = login(client, "s1@example.com")

    # Identity mismatch rejected (BR-05).
    res = client.post("/api/v1/wallet/claim", headers=holder,
                      json={"cert_uid": uid, "holder_email": "wrong@example.com"})
    assert res.status_code == 422

    # Correct identity claims.
    res = client.post("/api/v1/wallet/claim", headers=holder,
                      json={"cert_uid": uid, "holder_email": "s1@example.com"})
    assert res.status_code == 200
    assert len(client.get("/api/v1/wallet/credentials", headers=holder).get_json()["data"]) == 1

    # Share with field selection + max views.
    share = client.post("/api/v1/wallet/shares", headers=holder, json={
        "cert_uid": uid, "disclosed_fields": ["program"], "max_views": 1}).get_json()
    verdict = client.get(f"/api/v1/verify/share/{share['token']}").get_json()
    assert verdict["verdict"] == "VALID"
    assert list(verdict["certificate"]["disclosed_fields"].keys()) == ["program"]  # selective disclosure

    # View limit exhausted → neutral expiry (BR-S3).
    assert client.get(f"/api/v1/verify/share/{share['token']}").status_code == 404


def test_supersede_correction_chain(client, approved_institution):
    _issue_batch(client, approved_institution)
    uid = _first_uid(client)
    ap = login(client, "approver@test.local")

    corrected = {"holder_name": "Student One Corrected", "holder_email": "s1@example.com",
                 "program": "B.Tech CSE"}
    res = client.post(f"/api/v1/certificates/{uid}/supersede", headers=ap,
                      json={"corrected_row": corrected})
    assert res.status_code == 201
    successor_uid = res.get_json()["successor_uid"]

    assert client.get(f"/api/v1/verify/{uid}").get_json()["verdict"] == "SUPERSEDED"
    assert client.get(f"/api/v1/verify/{successor_uid}").get_json()["verdict"] == "VALID"


def test_cross_tenant_isolation(client, approved_institution):
    """Another institution's staff sees a neutral 404, never foreign data."""
    _issue_batch(client, approved_institution)
    uid = _first_uid(client)

    from app.extensions import db
    from app.models import Institution
    other = Institution(legal_name="Other College", slug="other-college")
    db.session.add(other)
    db.session.commit()
    make_user("outsider@other.local", "operator", other.id)
    outsider = login(client, "outsider@other.local")

    assert client.get(f"/api/v1/certificates/{uid}", headers=outsider).status_code == 404


def test_unknown_uid_is_neutral_404(client):
    res = client.get("/api/v1/verify/TC-0000-0000-0000")
    assert res.status_code == 404
    assert res.get_json()["code"] == "NOT_FOUND"
