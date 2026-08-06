"""
Certificate domain: Batch (issuance unit + FSM), Certificate (credential
record + cryptographic evidence), CertificateHistory (append-only lifecycle).

Key invariants enforced here or in services (SRS BR-01..BR-15):
- cert_uid unique & non-guessable; certificates never hard-deleted.
- Batch maker ≠ checker (service + CHECK-style validation).
- Revocation irreversible; corrections via supersede chain (self-FK).
- History rows are append-only (no update path exists in the codebase).
"""
from __future__ import annotations

import secrets

from app.extensions import db
from app.models.base import BaseModel, UTCDateTime, utcnow

# Batch FSM (TDD §6.4). Transitions validated in CertificateService.
BATCH_STATES = ("draft", "validated", "pending_approval", "approved", "anchoring", "anchored", "failed")

CERT_STATES = ("issued", "claimed", "revoked", "superseded", "suspended", "expired")


def new_cert_uid() -> str:
    """Public, non-guessable certificate UID: TC-XXXX-XXXX-XXXX (FR-ISS-008)."""
    raw = secrets.token_hex(6).upper()
    return f"TC-{raw[0:4]}-{raw[4:8]}-{raw[8:12]}"


class Batch(BaseModel):
    __tablename__ = "batches"

    institution_id = db.Column(db.String(36), db.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="draft")
    row_count = db.Column(db.Integer, nullable=False, default=0)
    error_report = db.Column(db.JSON, nullable=True)        # dry-run row errors (FR-ISS-003)

    # Maker-checker (BR-21)
    created_by = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    approved_by = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    approved_at = db.Column(UTCDateTime(), nullable=True)

    # Anchoring evidence (TDD §6.5)
    merkle_root = db.Column(db.String(66), nullable=True, unique=True)
    anchor_tx_hash = db.Column(db.String(66), nullable=True)
    anchor_block = db.Column(db.BigInteger, nullable=True)
    anchored_at = db.Column(UTCDateTime(), nullable=True)
    manifest_uri = db.Column(db.String(255), nullable=True)  # IPFS batch manifest

    institution = db.relationship("Institution", back_populates="batches")
    certificates = db.relationship("Certificate", back_populates="batch", lazy="dynamic")

    __table_args__ = (
        db.Index("ix_batches_institution_status", "institution_id", "status"),
        db.CheckConstraint(f"status IN {BATCH_STATES}", name="ck_batch_status"),
    )


class Certificate(BaseModel):
    __tablename__ = "certificates"

    cert_uid = db.Column(db.String(20), nullable=False, unique=True, default=new_cert_uid)
    institution_id = db.Column(db.String(36), db.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False)
    batch_id = db.Column(db.String(36), db.ForeignKey("batches.id", ondelete="RESTRICT"), nullable=False)

    # Subject payload. NOTE (SRS AUD-008): production PostgreSQL encrypts this
    # column via pgcrypto/KMS envelope; erasure nulls it AND destroys the salt
    # (BR-26) which permanently unlinks the on-chain leaf.
    subject_data = db.Column(db.JSON, nullable=True)
    certificate_type = db.Column(db.String(60), nullable=False, default="degree")

    # Cryptographic evidence (must stay byte-compatible with blockchain/utils/merkle.ts)
    content_hash = db.Column(db.String(66), nullable=False)   # 0x + sha256 of canonical JSON
    salt = db.Column(db.String(66), nullable=True)            # nulled on erasure
    leaf_hash = db.Column(db.String(66), nullable=False)
    leaf_index = db.Column(db.Integer, nullable=False, default=0)
    merkle_proof = db.Column(db.JSON, nullable=False, default=list)

    status = db.Column(db.String(16), nullable=False, default="issued")
    status_list_index = db.Column(db.Integer, nullable=True)  # bit position in the issuer bitstring
    expires_at = db.Column(UTCDateTime(), nullable=True)
    legacy_attested = db.Column(db.Boolean, nullable=False, default=False)

    # Holder binding (claim, UC-03) + supersede chain (BR-12)
    holder_user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    claimed_at = db.Column(UTCDateTime(), nullable=True)
    supersedes_id = db.Column(db.String(36), db.ForeignKey("certificates.id", ondelete="RESTRICT"), nullable=True)
    superseded_by_id = db.Column(db.String(36), db.ForeignKey("certificates.id", ondelete="RESTRICT"), nullable=True)

    batch = db.relationship("Batch", back_populates="certificates", foreign_keys=[batch_id])
    history = db.relationship("CertificateHistory", back_populates="certificate",
                              lazy="dynamic", order_by="CertificateHistory.created_at")

    __table_args__ = (
        db.Index("ix_certificates_institution_status", "institution_id", "status"),
        db.Index("ix_certificates_holder", "holder_user_id"),
        db.CheckConstraint(f"status IN {CERT_STATES}", name="ck_cert_status"),
        db.CheckConstraint("supersedes_id IS NULL OR supersedes_id <> id", name="ck_no_self_supersede"),
    )

    @property
    def is_expired(self) -> bool:
        return self.expires_at is not None and self.expires_at <= utcnow()


class CertificateHistory(BaseModel):
    """Append-only lifecycle event log (the 'history table', TDD §6.6).
    Two-person events carry both actors with actor1 ≠ actor2 (BR-21)."""

    __tablename__ = "certificate_history"

    certificate_id = db.Column(db.String(36), db.ForeignKey("certificates.id", ondelete="RESTRICT"), nullable=False)
    event = db.Column(db.String(30), nullable=False)
    # issued|claimed|share_created|revocation_initiated|revoked|superseded|expired|corrected|erased
    reason_code = db.Column(db.String(40), nullable=True)
    reason_visibility = db.Column(db.String(10), nullable=False, default="public")  # public|verifier|private
    actor_user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    actor2_user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    chain_tx_hash = db.Column(db.String(66), nullable=True)
    detail = db.Column(db.JSON, nullable=True)

    certificate = db.relationship("Certificate", back_populates="history")

    __table_args__ = (
        db.Index("ix_cert_history_cert", "certificate_id", "created_at"),
        db.CheckConstraint(
            "actor2_user_id IS NULL OR actor2_user_id <> actor_user_id", name="ck_two_person_rule"
        ),
    )
