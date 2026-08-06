"""
Verification service — the 7-verdict engine (SRS §3.4) with BR-15 precedence:

    TAMPERED > UNKNOWN_ISSUER > SUSPENDED_ISSUER > REVOKED > SUPERSEDED > EXPIRED > VALID

Every verification writes a verdict SNAPSHOT (BR-19). Share links enforce
expiry / max-views / PIN before any data is rendered (BR-S1..S3), and QR
codes encode the public verification URL (FR-VER-002).
"""
from __future__ import annotations

import base64
import io

import bcrypt
from flask import current_app

from app.blockchain import merkle
from app.errors import AuthorizationError, NotFoundError
from app.extensions import db
from app.models import Certificate, Institution, ShareLink, VerificationLog
from app.services import audit_service

# Fields shown on the public page when the holder made no selection (BR-17).
DEFAULT_PUBLIC_FIELDS = ("holder_name", "program", "certificate_type", "issued_on")


def _chain():
    return current_app.services["chain"]


# ── Verdict engine ────────────────────────────────────────────────────────────

def verify_certificate(cert: Certificate, *, channel: str = "url",
                       share: ShareLink | None = None,
                       presented_payload: dict | None = None) -> dict:
    """
    Runs all checks, composes the verdict by precedence, logs the snapshot,
    and returns the public verdict object (identical across web/API — VER-008).
    `presented_payload` triggers TAMPERED detection for file-upload verification.
    """
    institution = db.session.get(Institution, cert.institution_id)
    checks: dict[str, dict] = {}

    # 1) Integrity — recompute the content hash when a payload is presented.
    if presented_payload is not None:
        presented_hash = merkle.content_hash(merkle.canonicalize(
            {"cert_uid": cert.cert_uid, "type": cert.certificate_type, **presented_payload}))
        checks["integrity"] = {"pass": presented_hash == cert.content_hash}
    else:
        checks["integrity"] = {"pass": True, "note": "stored-record verification"}

    # 2) Merkle proof + 3) on-chain anchor.
    root = cert.batch.merkle_root
    proof_ok = bool(cert.salt) and merkle.verify_proof(cert.leaf_hash, cert.merkle_proof or [], root or "0x")
    anchored = bool(root) and _chain().is_anchored(root)
    checks["merkle_proof"] = {"pass": proof_ok}
    checks["anchor"] = {"pass": anchored, "root": root,
                        "tx_hash": cert.batch.anchor_tx_hash, "block": cert.batch.anchor_block}

    # 4) Issuer registry status (fake-university defense, SRS §2.6).
    issuer_known = institution is not None and institution.chain_issuer_id is not None
    issuer_active = issuer_known and institution.status == "active" \
        and _chain().is_active_issuer(institution.chain_issuer_id)
    checks["issuer"] = {"pass": issuer_active, "known": issuer_known,
                        "status": institution.status if institution else None,
                        "name": institution.legal_name if institution else None}

    # 5) Revocation + 6) expiry (current state — verdicts are never stale-guessed).
    checks["revocation"] = {"pass": cert.status not in ("revoked", "suspended"), "status": cert.status}
    checks["expiry"] = {"pass": not cert.is_expired,
                        "expires_at": cert.expires_at.isoformat() if cert.expires_at else None}

    # ── Verdict precedence (BR-15) ───────────────────────────────────────────
    if not checks["integrity"]["pass"] or not proof_ok or not anchored:
        verdict = "TAMPERED"
    elif not issuer_known:
        verdict = "UNKNOWN_ISSUER"
    elif not issuer_active:
        verdict = "SUSPENDED_ISSUER"
    elif cert.status == "revoked":
        verdict = "REVOKED"
    elif cert.status == "superseded":
        verdict = "SUPERSEDED"
    elif cert.is_expired:
        verdict = "EXPIRED"
    else:
        verdict = "VALID"

    # ── Snapshot log (BR-19; no verifier PII by default) ─────────────────────
    db.session.add(VerificationLog(certificate_id=cert.id, channel=channel,
                                   share_link_id=share.id if share else None,
                                   verdict=verdict, checks=checks))
    db.session.commit()

    return {
        "verdict": verdict,
        "checks": checks,
        "certificate": {
            "cert_uid": cert.cert_uid,
            "disclosed_fields": _disclosed_fields(cert, share),
            "issuer": {"name": institution.legal_name if institution else None,
                       "status": institution.status if institution else None},
            "superseded_by": cert.superseded_by_id and _uid(cert.superseded_by_id),
        },
    }


def _disclosed_fields(cert: Certificate, share: ShareLink | None) -> dict:
    """Field visibility = public defaults ∩ holder selection (BR-17)."""
    data = cert.subject_data or {}
    if share and share.disclosed_fields:
        allowed = set(share.disclosed_fields)
    else:
        allowed = set(DEFAULT_PUBLIC_FIELDS)
    return {k: v for k, v in data.items() if k in allowed and k != "holder_email"}


def _uid(cert_id: str) -> str | None:
    successor = db.session.get(Certificate, cert_id)
    return successor.cert_uid if successor else None


# ── Public lookups ────────────────────────────────────────────────────────────

def get_by_uid(cert_uid: str) -> Certificate:
    """Neutral 404 for unknown UIDs (anti-enumeration, FR-VER-006)."""
    cert = Certificate.query.filter_by(cert_uid=cert_uid).first()
    if cert is None:
        raise NotFoundError("No certificate found for this ID.")
    return cert


def resolve_share(token: str, pin: str | None = None) -> tuple[Certificate, ShareLink]:
    """Share-link resolution enforcing expiry/views/PIN BEFORE any data (BR-S3)."""
    share = ShareLink.query.filter_by(token_hash=ShareLink.hash_token(token)).first()
    if share is None or not share.is_active:
        raise NotFoundError("This share link has expired. Ask the holder for a fresh link.")
    if share.pin_hash:
        if not pin or not bcrypt.checkpw(pin.encode(), share.pin_hash.encode()):
            raise AuthorizationError("This link is PIN-protected.")
    share.view_count += 1
    db.session.commit()
    return db.session.get(Certificate, share.certificate_id), share


# ── Share links (FR-STU-005/008) ─────────────────────────────────────────────

def create_share(cert: Certificate, user_id: str, *, disclosed_fields: list[str] | None = None,
                 expires_at=None, max_views: int | None = None, pin: str | None = None) -> dict:
    if cert.holder_user_id != user_id:
        raise AuthorizationError("Only the credential holder can share it.")
    token = ShareLink.new_token()
    share = ShareLink(
        certificate_id=cert.id, created_by=user_id, token_hash=ShareLink.hash_token(token),
        disclosed_fields=disclosed_fields or [], expires_at=expires_at, max_views=max_views,
        pin_hash=bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode() if pin else None,
    )
    db.session.add(share)
    audit_service.record("share.create", "certificate", cert.cert_uid,
                         after={"fields": disclosed_fields, "max_views": max_views})
    db.session.commit()
    url = f"{current_app.config['VERIFY_BASE_URL']}/share/{token}"
    return {"share_id": share.id, "url": url, "token": token}


def revoke_share(share_id: str, user_id: str) -> None:
    share = db.session.get(ShareLink, share_id)
    if share is None or share.created_by != user_id:
        raise NotFoundError("Share link not found.")
    from app.models import utcnow
    share.revoked_at = utcnow()
    audit_service.record("share.revoke", "share_link", share_id)
    db.session.commit()


# ── QR generation (PART 7) ───────────────────────────────────────────────────

def qr_png_data_uri(cert_uid: str) -> str:
    """QR encoding the public verification URL — printable ≥2×2 cm (TPL-009)."""
    import qrcode

    url = f"{current_app.config['VERIFY_BASE_URL']}/v/{cert_uid}"
    img = qrcode.make(url, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=4)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
