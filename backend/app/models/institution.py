"""
Tenant models: Institution (issuer) and Employer (verifier organization).

Institution mirrors the on-chain IssuerRegistry lifecycle (TDD §7):
pending_kyb → active → suspended/retired; `chain_issuer_id` links the DB row
to the uint64 issuerId used by the contracts.
"""
from __future__ import annotations

from app.extensions import db
from app.models.base import BaseModel, SoftDeleteMixin, UTCDateTime


class Institution(BaseModel, SoftDeleteMixin):
    __tablename__ = "institutions"

    legal_name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(60), nullable=False, unique=True)
    institution_type = db.Column(db.String(30), nullable=False, default="university")
    status = db.Column(db.String(20), nullable=False, default="pending_kyb")
    # pending_kyb | active | suspended | retired  (BR-08/09; FSM enforced in service)

    accreditation_body = db.Column(db.String(120), nullable=True)
    accreditation_ref = db.Column(db.String(120), nullable=True)
    domain = db.Column(db.String(255), nullable=True)
    domain_verified_at = db.Column(UTCDateTime(), nullable=True)

    # On-chain identity (populated at KYB approval, UC-01 step 5)
    chain_issuer_id = db.Column(db.BigInteger, nullable=True, unique=True)
    issuer_did = db.Column(db.String(255), nullable=True, unique=True)
    registration_tx_hash = db.Column(db.String(66), nullable=True)

    kyb_decided_by = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    kyb_decided_at = db.Column(UTCDateTime(), nullable=True)
    kyb_reason = db.Column(db.Text, nullable=True)

    batches = db.relationship("Batch", back_populates="institution", lazy="dynamic")

    __table_args__ = (db.Index("ix_institutions_status", "status"),)

    @property
    def can_issue(self) -> bool:
        """Issuance gate: KYB-approved + on-chain registered (BR-08)."""
        return self.status == "active" and self.chain_issuer_id is not None


class Employer(BaseModel, SoftDeleteMixin):
    """Verifier organization: shared history, watch lists, API quotas."""

    __tablename__ = "employers"
    name = db.Column(db.String(200), nullable=False)
    website = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(16), nullable=False, default="active")  # active|suspended
