"""
Authentication service: registration, login, token issuance with rotating
refresh tokens (family revocation on reuse), password reset, email
verification (mock mail), and MetaMask wallet login/linking.
"""
from __future__ import annotations

import logging
import secrets
from datetime import timedelta

from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token

from app.auth.security import (
    check_password_policy,
    create_wallet_challenge,
    challenge_message,
    hash_password,
    verify_password_with_lockout,
    verify_wallet_signature,
)
from app.errors import AuthenticationError, ConflictError, NotFoundError
from app.extensions import db
from app.models import RefreshSession, Role, User, UserRole, Wallet, utcnow
from app.services import audit_service

log = logging.getLogger("trustchain.auth")

# In-memory single-use token stores for the MOCK mail flows (dev/tests).
# Production replaces these with signed, hashed, DB-backed tokens.
_email_tokens: dict[str, str] = {}
_reset_tokens: dict[str, str] = {}


# ── Registration & email verification ────────────────────────────────────────

def register_user(email: str, password: str, full_name: str, role_name: str = "student") -> User:
    """Creates a user with the given seeded role; sends (mock) verify email."""
    if User.query.filter_by(email=email.lower(), deleted_at=None).first():
        raise ConflictError("An account with this email already exists.")
    check_password_policy(password)

    role = Role.query.filter_by(name=role_name).first()
    if role is None:
        raise NotFoundError(f"Role '{role_name}' is not seeded.")

    user = User(email=email.lower(), password_hash=hash_password(password), full_name=full_name)
    db.session.add(user)
    db.session.flush()
    db.session.add(UserRole(user_id=user.id, role_id=role.id))

    token = secrets.token_urlsafe(24)
    _email_tokens[token] = user.id
    _send_mail(user.email, "Verify your TrustChain email",
               f"Verification token: {token} (valid 24h)")

    audit_service.record("user.register", "user", user.id, after={"email": user.email, "role": role_name})
    db.session.commit()
    return user


def verify_email(token: str) -> None:
    user_id = _email_tokens.pop(token, None)
    if user_id is None:
        raise AuthenticationError("Verification link is invalid or expired.")
    user = db.session.get(User, user_id)
    user.email_verified_at = utcnow()
    db.session.commit()


# ── Login & tokens ────────────────────────────────────────────────────────────

def login(email: str, password: str) -> dict:
    """Password login with lockout; returns access+refresh token pair."""
    user = User.query.filter_by(email=email.lower(), deleted_at=None).first()
    if user is None:
        # Same failure shape as wrong password (anti-enumeration).
        raise AuthenticationError("Email or password didn't match.")
    verify_password_with_lockout(user, password)
    if user.email_verified_at is None:
        raise AuthenticationError("Verify your email before signing in.")
    return issue_tokens(user, fresh=True)


def issue_tokens(user: User, *, fresh: bool = False, family_id: str | None = None) -> dict:
    """Issues an access token (role claims) + a registered rotating refresh token."""
    roles = sorted({ur.role.name for ur in user.roles})
    institution_id = next((ur.institution_id for ur in user.roles if ur.institution_id), None)
    employer_id = next((ur.employer_id for ur in user.roles if ur.employer_id), None)
    claims = {"roles": roles, "institution_id": institution_id, "employer_id": employer_id}

    access = create_access_token(identity=user.id, additional_claims=claims, fresh=fresh)
    refresh = create_refresh_token(identity=user.id)
    jti = decode_token(refresh)["jti"]

    session = RefreshSession(
        user_id=user.id, jti=jti, family_id=family_id or jti,
        expires_at=utcnow() + current_app.config["JWT_REFRESH_TOKEN_EXPIRES"],
    )
    db.session.add(session)
    db.session.commit()
    return {"access_token": access, "refresh_token": refresh,
            "token_type": "Bearer", "roles": roles}


def rotate_refresh(user_id: str, jti: str) -> dict:
    """
    Refresh rotation with REUSE DETECTION (SEC-JWT-2): presenting an already-
    rotated/revoked token revokes the entire family and fails the request.
    """
    session = RefreshSession.query.filter_by(jti=jti).first()
    if session is None or session.expires_at <= utcnow():
        raise AuthenticationError("Refresh session expired — sign in again.")
    if session.rotated_at is not None or session.revoked_at is not None:
        # Reuse detected → kill the whole family (possible token theft).
        RefreshSession.query.filter_by(family_id=session.family_id).update({"revoked_at": utcnow()})
        db.session.commit()
        log.warning("refresh_reuse_detected", extra={"user_id": user_id, "family": session.family_id})
        raise AuthenticationError("Session security event — sign in again.")

    session.rotated_at = utcnow()
    user = db.session.get(User, user_id)
    return issue_tokens(user, family_id=session.family_id)


def logout(jti: str) -> None:
    """Revokes the presented refresh session (access token expires naturally ≤15 min)."""
    RefreshSession.query.filter_by(jti=jti).update({"revoked_at": utcnow()})
    db.session.commit()


# ── Password reset ────────────────────────────────────────────────────────────

def request_password_reset(email: str) -> None:
    """Neutral response regardless of account existence (anti-enumeration)."""
    user = User.query.filter_by(email=email.lower(), deleted_at=None).first()
    if user:
        token = secrets.token_urlsafe(24)
        _reset_tokens[token] = user.id
        _send_mail(user.email, "Reset your TrustChain password",
                   f"Reset token: {token} (valid 1h, single use)")


def reset_password(token: str, new_password: str) -> None:
    user_id = _reset_tokens.pop(token, None)
    if user_id is None:
        raise AuthenticationError("Reset link is invalid or expired.")
    check_password_policy(new_password)
    user = db.session.get(User, user_id)
    user.password_hash = hash_password(new_password)
    user.failed_attempts, user.locked_until = 0, None
    # Revoke every session on reset (FR-AUTH-010).
    RefreshSession.query.filter_by(user_id=user.id).update({"revoked_at": utcnow()})
    audit_service.record("user.password_reset", "user", user.id)
    db.session.commit()


# ── MetaMask wallet auth (TDD §10.3) ─────────────────────────────────────────

def wallet_challenge(address: str, origin: str) -> dict:
    challenge = create_wallet_challenge(address, origin)
    return {"nonce": challenge.nonce, "message": challenge_message(challenge),
            "expires_at": challenge.expires_at.isoformat()}


def wallet_login(nonce: str, signature: str) -> dict:
    """Signature login: recovers the signer and authenticates the LINKED user.
    Unlinked wallets cannot log in (linking requires an authenticated session)."""
    address = verify_wallet_signature(nonce, signature)
    wallet = Wallet.query.filter_by(address=address).first()
    if wallet is None:
        raise AuthenticationError("This wallet is not linked to any account. Sign in and link it first.")
    return issue_tokens(wallet.user, fresh=True)


def link_wallet(user_id: str, nonce: str, signature: str, chain_id: int) -> Wallet:
    address = verify_wallet_signature(nonce, signature)
    if Wallet.query.filter_by(address=address).first():
        raise ConflictError("This wallet is already linked to an account.")
    wallet = Wallet(user_id=user_id, address=address, chain_id=chain_id)
    db.session.add(wallet)
    audit_service.record("wallet.linked", "wallet", address, after={"chain_id": chain_id})
    db.session.commit()
    return wallet


# ── Mail (mock) ───────────────────────────────────────────────────────────────

def _send_mail(to: str, subject: str, body: str) -> None:
    """Mock mailer: logs the message (MAIL_MODE=smtp swaps in a real sender)."""
    if current_app.config.get("MAIL_MODE") == "mock":
        log.info("mail_mock", extra={"to": to, "subject": subject, "body": body})


# Test-only hooks (used by the pytest suite to fetch mock tokens).
def _peek_email_token_for(user_id: str) -> str | None:
    return next((t for t, uid in _email_tokens.items() if uid == user_id), None)


def _peek_reset_token_for(user_id: str) -> str | None:
    return next((t for t, uid in _reset_tokens.items() if uid == user_id), None)
