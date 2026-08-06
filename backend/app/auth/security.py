"""
Credential security primitives: bcrypt password hashing, account lockout,
and MetaMask (EIP-191) signature verification for wallet login/linking.
"""
from __future__ import annotations

from datetime import timedelta

import bcrypt
from eth_account import Account
from eth_account.messages import encode_defunct
from flask import current_app

from app.errors import AccountLockedError, AuthenticationError
from app.extensions import db
from app.models import User, WalletChallenge, utcnow


# ── Passwords (FR-AUTH-002/009/010) ──────────────────────────────────────────

def hash_password(plain: str) -> str:
    """bcrypt with per-password salt; cost 12 ≈ 250 ms — brute-force resistant."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def check_password_policy(plain: str) -> None:
    """Minimum policy: length ≥ 12 (breach-corpus check is a prod integration)."""
    minimum = current_app.config["PASSWORD_MIN_LENGTH"]
    if len(plain) < minimum:
        raise AuthenticationError(f"Password must be at least {minimum} characters.")


def verify_password_with_lockout(user: User, plain: str) -> None:
    """
    Constant-shape login check with exponential-free simple lockout:
    5 failures → locked for LOCKOUT_MINUTES (FR-AUTH-009). Raises on failure;
    resets the counter on success.
    """
    now = utcnow()
    if user.locked_until and user.locked_until > now:
        raise AccountLockedError("Too many attempts. Try again later or use the unlock email.")

    ok = bool(user.password_hash) and bcrypt.checkpw(plain.encode(), user.password_hash.encode())
    if not ok:
        user.failed_attempts += 1
        if user.failed_attempts >= current_app.config["LOCKOUT_MAX_ATTEMPTS"]:
            user.locked_until = now + timedelta(minutes=current_app.config["LOCKOUT_MINUTES"])
            user.failed_attempts = 0
        db.session.commit()
        raise AuthenticationError("Email or password didn't match.")

    user.failed_attempts = 0
    user.locked_until = None
    db.session.commit()


# ── MetaMask signature auth (TDD §10.3) ──────────────────────────────────────
# Challenge → personal_sign → recover. The message states its purpose, is
# origin-bound, nonce-bound (single-use), and expires in 5 minutes.

CHALLENGE_TEMPLATE = (
    "TrustChain wallet authentication\n\n"
    "This signature proves you control wallet {address}.\n"
    "It does NOT authorize any transaction or payment.\n\n"
    "Origin: {origin}\nNonce: {nonce}\nIssued at: {issued_at}"
)


def create_wallet_challenge(address: str, origin: str) -> WalletChallenge:
    """Issues a single-use challenge nonce for `address` (5-min TTL)."""
    ttl = current_app.config["WALLET_CHALLENGE_TTL_SECONDS"]
    challenge = WalletChallenge(
        address=address, origin=origin, expires_at=utcnow() + timedelta(seconds=ttl)
    )
    db.session.add(challenge)
    db.session.commit()
    return challenge


def challenge_message(challenge: WalletChallenge) -> str:
    return CHALLENGE_TEMPLATE.format(
        address=challenge.address,
        origin=challenge.origin,
        nonce=challenge.nonce,
        issued_at=challenge.created_at.isoformat(),
    )


def verify_wallet_signature(nonce: str, signature: str) -> str:
    """
    Validates nonce (exists, unused, unexpired) + EIP-191 signature; returns the
    checksummed signer address. Marks the nonce used (replay tombstone).
    """
    challenge: WalletChallenge | None = WalletChallenge.query.filter_by(nonce=nonce).first()
    if challenge is None or challenge.used_at is not None or challenge.expires_at <= utcnow():
        raise AuthenticationError("Challenge expired or already used — request a new one.")

    message = encode_defunct(text=challenge_message(challenge))
    try:
        recovered = Account.recover_message(message, signature=signature)
    except Exception as exc:  # malformed signature bytes
        raise AuthenticationError("Signature could not be verified.") from exc

    if recovered.lower() != challenge.address.lower():
        raise AuthenticationError("Signature does not match the claimed wallet.")

    challenge.used_at = utcnow()
    db.session.commit()
    return recovered
