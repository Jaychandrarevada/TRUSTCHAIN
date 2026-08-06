"""
AI assistant tests — honest degradation when unconfigured, auth gating, the
advisory-only contract on the suspicious-pattern pre-screen, and (mocked,
no real network call) the happy path plumbing.

TestingConfig carries no ANTHROPIC_API_KEY, so most of these exercise the
real "unavailable" path with zero mocking — that path IS the honesty
contract this feature is built around.
"""
from __future__ import annotations

from types import SimpleNamespace

from tests.conftest import login, make_user


def test_status_reports_disabled_without_key(client):
    res = client.get("/api/v1/ai/status")
    assert res.status_code == 200
    assert res.get_json() == {"enabled": False}


def test_explain_certificate_degrades_honestly_without_key(client, approved_institution):
    from tests.test_certificates import _issue_batch, _first_uid
    _issue_batch(client, approved_institution)
    uid = _first_uid(client)

    make_user("student1@test.local", "student")
    headers = login(client, "student1@test.local")
    res = client.get(f"/api/v1/ai/explain/certificate/{uid}", headers=headers)

    assert res.status_code == 503
    assert res.get_json()["code"] == "AI_UNAVAILABLE"
    # The real verification pipeline still ran underneath — unaffected by AI being off.
    verdict = client.get(f"/api/v1/verify/{uid}").get_json()
    assert verdict["verdict"] == "VALID"


def test_chat_requires_authentication(client):
    res = client.post("/api/v1/ai/chat", json={"message": "hello"})
    assert res.status_code == 401


def test_chat_rejects_empty_message(client):
    make_user("chatter@test.local", "student")
    headers = login(client, "chatter@test.local")
    res = client.post("/api/v1/ai/chat", headers=headers, json={"message": "  "})
    assert res.status_code == 400  # validated before the AI call, regardless of key state
    assert res.get_json()["code"] == "VALIDATION_ERROR"


def test_detect_suspicious_rejects_non_object_payload(client):
    make_user("screener@test.local", "student")
    headers = login(client, "screener@test.local")
    res = client.post("/api/v1/ai/detect-suspicious", headers=headers, json={"payload": "not-an-object"})
    assert res.status_code == 400


def test_chat_mocked_happy_path_marks_ai_generated(client, app, monkeypatch):
    """No real network call — proves the route plumbing without spending real
    API credits. The one thing this test protects: every AI response the
    frontend renders must carry `ai_generated: true` so the UI can label it."""
    make_user("chatter2@test.local", "student")
    headers = login(client, "chatter2@test.local")

    app.config["ANTHROPIC_API_KEY"] = "test-key-not-real"

    fake_response = SimpleNamespace(
        stop_reason="end_turn",
        content=[SimpleNamespace(type="text", text="Here is how to claim a certificate.")],
    )

    class FakeMessages:
        def create(self, **kwargs):
            return fake_response

    class FakeClient:
        def __init__(self, api_key):
            self.messages = FakeMessages()

    import app.services.ai_service as ai_service
    monkeypatch.setattr(ai_service, "_client", None)
    monkeypatch.setattr("anthropic.Anthropic", FakeClient)

    res = client.post("/api/v1/ai/chat", headers=headers,
                      json={"message": "How do I claim a certificate?"})
    assert res.status_code == 200
    body = res.get_json()
    assert body["ai_generated"] is True
    assert "claim" in body["reply"].lower()


def test_detect_suspicious_advisory_only_never_blocks_real_verify(client, app, monkeypatch, approved_institution):
    """Even if the AI flags something as suspicious, the real verify endpoint
    is a completely separate call the frontend must still make — this test
    documents that the two are decoupled at the API level (no shared gate)."""
    from tests.test_certificates import _issue_batch, _first_uid
    _issue_batch(client, approved_institution)
    uid = _first_uid(client)

    make_user("screener2@test.local", "student")
    headers = login(client, "screener2@test.local")
    app.config["ANTHROPIC_API_KEY"] = "test-key-not-real"

    fake_response = SimpleNamespace(
        stop_reason="end_turn",
        content=[SimpleNamespace(type="text", text='{"suspicious": true, "reasons": ["placeholder name"]}')],
    )

    class FakeMessages:
        def create(self, **kwargs):
            return fake_response

    class FakeClient:
        def __init__(self, api_key):
            self.messages = FakeMessages()

    import app.services.ai_service as ai_service
    monkeypatch.setattr(ai_service, "_client", None)
    monkeypatch.setattr("anthropic.Anthropic", FakeClient)

    flag = client.post("/api/v1/ai/detect-suspicious", headers=headers,
                       json={"payload": {"holder_name": "Test Testerson"}})
    assert flag.status_code == 200
    assert flag.get_json()["suspicious"] is True
    assert flag.get_json()["advisory_only"] is True

    # The real verdict is unaffected — computed independently, still VALID.
    verdict = client.get(f"/api/v1/verify/{uid}").get_json()
    assert verdict["verdict"] == "VALID"
