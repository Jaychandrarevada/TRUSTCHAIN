"""
Authentication tests: registration → email verification → login, lockout,
refresh rotation + reuse detection, password reset, MetaMask signature login,
and RBAC enforcement on protected routes.
"""
from __future__ import annotations

from eth_account import Account
from eth_account.messages import encode_defunct

from app.services import auth_service
from tests.conftest import PASSWORD, login, make_user


def test_register_verify_login_flow(client, app):
    res = client.post("/api/v1/auth/register", json={
        "email": "arjun@example.com", "password": PASSWORD, "full_name": "Arjun S"})
    assert res.status_code == 201
    user_id = res.get_json()["id"]

    # Unverified login blocked (FR-AUTH-001).
    res = client.post("/api/v1/auth/login", json={"email": "arjun@example.com", "password": PASSWORD})
    assert res.status_code == 401

    token = auth_service._peek_email_token_for(user_id)  # mock-mail hook
    assert client.post("/api/v1/auth/verify-email", json={"token": token}).status_code == 204
    res = client.post("/api/v1/auth/login", json={"email": "arjun@example.com", "password": PASSWORD})
    assert res.status_code == 200
    assert res.get_json()["roles"] == ["student"]


def test_weak_password_rejected(client):
    res = client.post("/api/v1/auth/register", json={
        "email": "weak@example.com", "password": "short", "full_name": "W"})
    assert res.status_code == 400  # marshmallow length rule


def test_account_lockout_after_five_failures(client, app):
    make_user("locked@test.local", "student")
    for _ in range(5):
        res = client.post("/api/v1/auth/login", json={"email": "locked@test.local", "password": "Wrong-password-123"})
        assert res.status_code == 401
    res = client.post("/api/v1/auth/login", json={"email": "locked@test.local", "password": PASSWORD})
    assert res.status_code == 423  # ACCOUNT_LOCKED (FR-AUTH-009)
    assert res.get_json()["code"] == "ACCOUNT_LOCKED"


def test_refresh_rotation_and_reuse_detection(client, app):
    make_user("rotate@test.local", "student")
    tokens = client.post("/api/v1/auth/login", json={
        "email": "rotate@test.local", "password": PASSWORD}).get_json()
    refresh_headers = {"Authorization": f"Bearer {tokens['refresh_token']}"}

    first = client.post("/api/v1/auth/token/refresh", headers=refresh_headers)
    assert first.status_code == 200

    # Reusing the ALREADY-ROTATED token → family revoked (SEC-JWT-2).
    reuse = client.post("/api/v1/auth/token/refresh", headers=refresh_headers)
    assert reuse.status_code == 401

    # The rotated-out child is also dead (family revocation).
    child = {"Authorization": f"Bearer {first.get_json()['refresh_token']}"}
    assert client.post("/api/v1/auth/token/refresh", headers=child).status_code == 401


def test_password_reset_revokes_sessions(client, app):
    user = make_user("reset@test.local", "student")
    tokens = client.post("/api/v1/auth/login", json={
        "email": "reset@test.local", "password": PASSWORD}).get_json()

    assert client.post("/api/v1/auth/password/forgot",
                       json={"email": "reset@test.local"}).status_code == 202
    token = auth_service._peek_reset_token_for(user.id)
    new_password = "Another-Str0ng-Passw0rd!"
    assert client.post("/api/v1/auth/password/reset",
                       json={"token": token, "password": new_password}).status_code == 204

    # Old refresh session revoked (FR-AUTH-010).
    res = client.post("/api/v1/auth/token/refresh",
                      headers={"Authorization": f"Bearer {tokens['refresh_token']}"})
    assert res.status_code == 401
    # New password works.
    assert client.post("/api/v1/auth/login", json={
        "email": "reset@test.local", "password": new_password}).status_code == 200


def test_metamask_challenge_link_and_login(client, app):
    """Full wallet flow: challenge → sign (eth_account) → link → wallet login."""
    make_user("wallet@test.local", "student")
    headers = login(client, "wallet@test.local")
    acct = Account.create()

    # 1) Challenge for linking.
    res = client.post("/api/v1/auth/wallet/challenge", json={"address": acct.address})
    challenge = res.get_json()
    signature = acct.sign_message(encode_defunct(text=challenge["message"])).signature.hex()
    res = client.post("/api/v1/auth/wallet/link", headers=headers,
                      json={"nonce": challenge["nonce"], "signature": signature})
    assert res.status_code == 201

    # 2) Nonce single-use: replaying the same nonce fails (SEC-REPLAY).
    res = client.post("/api/v1/auth/wallet/login",
                      json={"nonce": challenge["nonce"], "signature": signature})
    assert res.status_code == 401

    # 3) Fresh challenge → signature login for the linked wallet.
    challenge2 = client.post("/api/v1/auth/wallet/challenge",
                             json={"address": acct.address}).get_json()
    sig2 = acct.sign_message(encode_defunct(text=challenge2["message"])).signature.hex()
    res = client.post("/api/v1/auth/wallet/login",
                      json={"nonce": challenge2["nonce"], "signature": sig2})
    assert res.status_code == 200
    assert "access_token" in res.get_json()


def test_wrong_signer_rejected(client, app):
    make_user("victim@test.local", "student")
    victim_wallet = Account.create()
    attacker = Account.create()
    challenge = client.post("/api/v1/auth/wallet/challenge",
                            json={"address": victim_wallet.address}).get_json()
    # Attacker signs the victim's challenge with their own key.
    forged = attacker.sign_message(encode_defunct(text=challenge["message"])).signature.hex()
    res = client.post("/api/v1/auth/wallet/login",
                      json={"nonce": challenge["nonce"], "signature": forged})
    assert res.status_code == 401


def test_rbac_denies_missing_permission(client, app):
    make_user("student2@test.local", "student")
    headers = login(client, "student2@test.local")
    # Students cannot create batches (deny-by-default matrix).
    res = client.post("/api/v1/certificates/batches", headers=headers,
                      json={"name": "x", "rows": [{}]})
    assert res.status_code == 403
    assert res.get_json()["code"] == "FORBIDDEN"


def test_protected_route_requires_token(client):
    assert client.get("/api/v1/wallet/credentials").status_code == 401
