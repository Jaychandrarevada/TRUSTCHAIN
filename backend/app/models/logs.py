"""
Operational models: VerificationLog, Notification, ActivityLog (audit),
SystemSetting, ShareLink.

- VerificationLog rows are verdict SNAPSHOTS (BR-19) — what the verifier saw,
  never retro-edited.
- ActivityLog is the audit table: append-only, fail-closed at the service
  layer (an audited action that cannot write its log must not proceed).
- ShareLink implements holder-controlled sharing with expiry/views/PIN
  (FR-STU-005, VER-012) and backs the QR "secure verification link" feature.
"""
from __future__ import annotations

import hashlib
import secrets

from app.extensions import db
from app.models.base import BaseModel, UTCDateTime, utcnow

VERDICTS = ("VALID", "REVOKED", "SUPERSEDED", "EXPIRED", "TAMPERED", "UNKNOWN_ISSUER", "SUSPENDED_ISSUER")


class VerificationLog(BaseModel):
    __tablename__ = "verification_logs"

    certificate_id = db.Column(db.String(36), db.ForeignKey("certificates.id", ondelete="RESTRICT"), nullable=False)
    share_link_id = db.Column(db.String(36), db.ForeignKey("share_links.id", ondelete="RESTRICT"), nullable=True)
    employer_id = db.Column(db.String(36), db.ForeignKey("employers.id", ondelete="RESTRICT"), nullable=True)
    channel = db.Column(db.String(10), nullable=False, default="url")  # qr|url|file|api|bulk
    verdict = db.Column(db.String(20), nullable=False)
    checks = db.Column(db.JSON, nullable=False, default=dict)  # per-check breakdown snapshot
    verifier_meta = db.Column(db.JSON, nullable=True)          # volunteered only — never PII by default
    geo_coarse = db.Column(db.String(60), nullable=True)

    __table_args__ = (
        db.Index("ix_verifications_cert_time", "certificate_id", "created_at"),
        db.CheckConstraint(f"verdict IN {VERDICTS}", name="ck_verdict"),
    )


class ShareLink(BaseModel):
    """Holder share: hashed token, expiry, max views, optional PIN, field
    selection. Token itself is never stored (SEC-REPLAY-1)."""

    __tablename__ = "share_links"

    certificate_id = db.Column(db.String(36), db.ForeignKey("certificates.id", ondelete="RESTRICT"), nullable=False)
    created_by = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    token_hash = db.Column(db.String(64), nullable=False, unique=True)
    disclosed_fields = db.Column(db.JSON, nullable=False, default=list)  # [] = all public fields
    expires_at = db.Column(UTCDateTime(), nullable=True)
    max_views = db.Column(db.Integer, nullable=True)
    view_count = db.Column(db.Integer, nullable=False, default=0)
    pin_hash = db.Column(db.String(128), nullable=True)
    revoked_at = db.Column(UTCDateTime(), nullable=True)

    __table_args__ = (db.Index("ix_share_links_cert", "certificate_id"),)

    @staticmethod
    def hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def new_token() -> str:
        return secrets.token_urlsafe(24)

    @property
    def is_active(self) -> bool:
        if self.revoked_at is not None:
            return False
        if self.expires_at is not None and self.expires_at <= utcnow():
            return False
        if self.max_views is not None and self.view_count >= self.max_views:
            return False
        return True


class Notification(BaseModel):
    """In-app + email notification record (email delivery is mocked in dev)."""

    __tablename__ = "notifications"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    category = db.Column(db.String(30), nullable=False)  # lifecycle|security|batch|system
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False, default="")
    payload = db.Column(db.JSON, nullable=True)
    read_at = db.Column(UTCDateTime(), nullable=True)

    __table_args__ = (db.Index("ix_notifications_user_time", "user_id", "created_at"),)


class ActivityLog(BaseModel):
    """Audit log (append-only). Daily hash-chaining + on-chain anchoring of the
    day root is performed by the audit job (FR-AUD-002); rows are never
    updated or deleted — no code path exists to do so."""

    __tablename__ = "activity_logs"

    actor_type = db.Column(db.String(10), nullable=False, default="user")  # user|api_key|system
    actor_id = db.Column(db.String(36), nullable=True)
    institution_id = db.Column(db.String(36), nullable=True, index=True)
    action = db.Column(db.String(60), nullable=False)          # e.g. 'certificate.revoke.confirm'
    resource_type = db.Column(db.String(40), nullable=False)
    resource_id = db.Column(db.String(64), nullable=True)
    before = db.Column(db.JSON, nullable=True)
    after = db.Column(db.JSON, nullable=True)
    ip = db.Column(db.String(64), nullable=True)
    trace_id = db.Column(db.String(64), nullable=True)

    __table_args__ = (db.Index("ix_activity_actor_time", "actor_id", "created_at"),)


class SystemSetting(BaseModel):
    """Key-value platform settings (feature flags, thresholds) — admin-managed."""

    __tablename__ = "system_settings"
    key = db.Column(db.String(80), nullable=False, unique=True)
    value = db.Column(db.JSON, nullable=False)
    description = db.Column(db.String(255), nullable=False, default="")
