"""
Platform tests: KYB workflow, mock-chain invariants, analytics reconciliation,
audit trail, notifications, health, error envelope shape, and QR generation.
"""
from __future__ import annotations

import pytest

from app.blockchain.client import MockChainClient
from app.errors import BlockchainError
from tests.conftest import login, make_user


def test_kyb_approve_registers_on_chain(client, app):
    admin = make_user("admin2@test.local", "platform_admin")
    applicant = make_user("owner@apply.local", "student")
    headers = login(client, "owner@apply.local")

    res = client.post("/api/v1/institutions", headers=headers, json={
        "legal_name": "Applying College", "slug": "applying-college"})
    assert res.status_code == 201
    inst_id = res.get_json()["id"]

    admin_headers = login(client, "admin2@test.local")
    queue = client.get("/api/v1/admin/kyb", headers=admin_headers).get_json()["data"]
    assert any(i["id"] == inst_id for i in queue)

    res = client.post(f"/api/v1/admin/kyb/{inst_id}/approve", headers=admin_headers)
    assert res.status_code == 200
    body = res.get_json()
    assert body["status"] == "active" and body["chain_issuer_id"] and body["tx_hash"]

    # Approved tenant no longer in the queue; chain registry agrees.
    queue = client.get("/api/v1/admin/kyb", headers=admin_headers).get_json()["data"]
    assert not any(i["id"] == inst_id for i in queue)
    assert app.services["chain"].is_active_issuer(body["chain_issuer_id"])


def test_mock_chain_reproduces_contract_invariants():
    chain = MockChainClient()
    chain.register_issuer(1, "0x" + "aa" * 32, "0x" + "bb" * 32)

    root = "0x" + "cc" * 32
    chain.anchor_root(root, 1, "0x" + "01" * 32)
    with pytest.raises(BlockchainError):  # A1 duplicate root
        chain.anchor_root(root, 1, "0x" + "02" * 32)
    with pytest.raises(BlockchainError):  # A3 unknown issuer
        chain.anchor_root("0x" + "dd" * 32, 99, "0x" + "03" * 32)

    chain.update_status_root(1, "0xlist", "0x" + "ee" * 32, 5)
    with pytest.raises(BlockchainError):  # S1 monotonic versions
        chain.update_status_root(1, "0xlist", "0x" + "ff" * 32, 5)


def test_analytics_reconcile_with_events(client, approved_institution):
    from tests.test_certificates import _issue_batch, _first_uid
    _issue_batch(client, approved_institution)
    uid = _first_uid(client)
    client.get(f"/api/v1/verify/{uid}")  # two verification events
    client.get(f"/api/v1/verify/{uid}")

    op = login(client, "operator@test.local")
    stats = client.get("/api/v1/analytics/issuer", headers=op).get_json()
    assert stats["certificates_issued"] == 3
    assert stats["verifications_total"] == 2  # exact reconciliation (BR-AN1)
    assert stats["verifications_by_verdict"]["VALID"] == 2


def test_audit_trail_captures_privileged_actions(client, approved_institution):
    from tests.test_certificates import _issue_batch
    _issue_batch(client, approved_institution)
    admin = login(client, "admin@test.local")
    rows = client.get("/api/v1/audit-logs?action=batch", headers=admin).get_json()["data"]
    actions = {r["action"] for r in rows}
    assert {"batch.create", "batch.submit", "batch.approve"} <= actions
    assert all(r["trace_id"] for r in rows)  # every entry traceable (NFR-AUD-01)


def test_revocation_notifies_holder(client, approved_institution):
    from tests.test_certificates import _issue_batch, _first_uid
    _issue_batch(client, approved_institution)
    uid = _first_uid(client)

    make_user("s1@example.com", "student")
    holder = login(client, "s1@example.com")
    client.post("/api/v1/wallet/claim", headers=holder,
                json={"cert_uid": uid, "holder_email": "s1@example.com"})

    inst = approved_institution["institution"]
    make_user("approver2@test.local", "approver", inst.id)
    ap = login(client, "approver@test.local")
    ap2 = login(client, "approver2@test.local")
    client.post(f"/api/v1/certificates/{uid}/revoke", headers=ap, json={"reason_code": "error"})
    client.post(f"/api/v1/certificates/{uid}/revoke/confirm", headers=ap2)

    notes = client.get("/api/v1/me/notifications", headers=holder).get_json()["data"]
    assert any("revoked" in n["title"].lower() for n in notes)  # FR-REV-005


def test_qr_generation(client, approved_institution):
    from tests.test_certificates import _issue_batch, _first_uid
    _issue_batch(client, approved_institution)
    uid = _first_uid(client)
    op = login(client, "operator@test.local")
    res = client.get(f"/api/v1/certificates/{uid}/qr", headers=op)
    assert res.status_code == 200
    assert res.get_json()["qr"].startswith("data:image/png;base64,")


def test_health_and_error_envelope(client):
    assert client.get("/api/v1/health/live").get_json()["status"] == "ok"
    assert client.get("/api/v1/health/ready").get_json()["status"] == "ready"

    # Uniform problem envelope with traceId on any error (RFC 9457 style).
    res = client.get("/api/v1/verify/TC-0000-0000-0000")
    body = res.get_json()
    assert {"status", "code", "title", "detail", "traceId"} <= set(body.keys())
    # Trace id echoes into headers too.
    assert res.headers.get("X-Request-Id")


def test_security_headers_present(client):
    res = client.get("/api/v1/health/live")
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"
