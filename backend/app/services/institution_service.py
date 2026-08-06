"""
Institution service — KYB lifecycle (UC-01) and on-chain issuer registration.

FSM: pending_kyb → active (approve → chain registration) | pending_kyb (info
requested) ; active ⇄ suspended ; * → retired (terminal). Verification of
existing certificates is NEVER blocked by tenant state (BR-09) — the verdict
engine surfaces SUSPENDED_ISSUER instead.
"""
from __future__ import annotations

import hashlib

from flask import current_app

from app.errors import ConflictError, InvalidStateError, NotFoundError
from app.extensions import db
from app.models import Institution, Role, User, UserRole, utcnow
from app.services import audit_service


def create_institution(owner: User, legal_name: str, slug: str, institution_type: str,
                       accreditation_body: str | None, accreditation_ref: str | None) -> Institution:
    """Self-serve tenant creation; issuance stays locked until KYB approval."""
    if Institution.query.filter_by(slug=slug).first():
        raise ConflictError("An institution with this slug already exists.")
    institution = Institution(
        legal_name=legal_name, slug=slug, institution_type=institution_type,
        accreditation_body=accreditation_body, accreditation_ref=accreditation_ref,
    )
    db.session.add(institution)
    db.session.flush()

    owner_role = Role.query.filter_by(name="owner").first()
    db.session.add(UserRole(user_id=owner.id, role_id=owner_role.id, institution_id=institution.id))
    audit_service.record("institution.create", "institution", institution.id,
                         after={"legal_name": legal_name}, institution_id=institution.id)
    db.session.commit()
    return institution


def approve_kyb(institution: Institution, admin_id: str) -> Institution:
    """
    Platform-admin approval (FR-INST-002) → deterministic chain issuerId +
    on-chain registration (IssuerRegistry.registerIssuer). Human decision only
    — never automated (BR-I4).
    """
    if institution.status != "pending_kyb":
        raise InvalidStateError(f"Institution is not awaiting KYB (is '{institution.status}').")

    # Deterministic uint64 issuerId derived from the tenant UUID (collision-
    # checked); DID is did:web on the verified domain when present.
    issuer_id = int.from_bytes(hashlib.sha256(institution.id.encode()).digest()[:8], "big") >> 1
    if Institution.query.filter_by(chain_issuer_id=issuer_id).first():
        raise ConflictError("Issuer id collision — retry approval.")

    did = f"did:web:{institution.domain}" if institution.domain else f"did:trustchain:{institution.slug}"
    did_hash = "0x" + hashlib.sha256(did.encode()).hexdigest()
    key_hash = "0x" + hashlib.sha256(f"issuer-key:{institution.id}:v1".encode()).hexdigest()

    chain = current_app.services["chain"]
    tx = chain.register_issuer(issuer_id, did_hash, key_hash, f"trustchain:{institution.slug}")

    institution.status = "active"
    institution.chain_issuer_id = issuer_id
    institution.issuer_did = did
    institution.registration_tx_hash = tx.tx_hash
    institution.kyb_decided_by, institution.kyb_decided_at = admin_id, utcnow()

    audit_service.record("institution.kyb.approve", "institution", institution.id,
                         after={"issuer_id": issuer_id, "tx": tx.tx_hash},
                         institution_id=institution.id)
    db.session.commit()
    return institution


def reject_kyb(institution: Institution, admin_id: str, reason: str) -> Institution:
    if institution.status != "pending_kyb":
        raise InvalidStateError("Institution is not awaiting KYB.")
    institution.kyb_decided_by, institution.kyb_decided_at = admin_id, utcnow()
    institution.kyb_reason = reason
    audit_service.record("institution.kyb.reject", "institution", institution.id,
                         after={"reason": reason}, institution_id=institution.id)
    db.session.commit()
    return institution


def set_status(institution: Institution, new_status: str, admin_id: str) -> Institution:
    """suspend / restore / retire — mirrors the on-chain FSM (I3: retired terminal)."""
    allowed = {
        ("active", "suspended"), ("suspended", "active"),
        ("active", "retired"), ("suspended", "retired"),
    }
    if (institution.status, new_status) not in allowed:
        raise InvalidStateError(f"Cannot move institution from '{institution.status}' to '{new_status}'.")
    before = institution.status
    institution.status = new_status
    audit_service.record("institution.status", "institution", institution.id,
                         before={"status": before}, after={"status": new_status},
                         institution_id=institution.id)
    db.session.commit()
    return institution


def get_or_404(institution_id: str) -> Institution:
    institution = db.session.get(Institution, institution_id)
    if institution is None or institution.is_deleted:
        raise NotFoundError("Institution not found.")
    return institution


def add_member(institution: Institution, user: User, role_name: str) -> None:
    """Invites a member with an institution-scoped role (FR-INST-007)."""
    role = Role.query.filter_by(name=role_name).first()
    if role is None or role_name in ("student", "platform_admin", "employer"):
        raise InvalidStateError(f"'{role_name}' is not an institution role.")
    exists = UserRole.query.filter_by(user_id=user.id, role_id=role.id,
                                      institution_id=institution.id).first()
    if exists:
        raise ConflictError("User already holds this role here.")
    db.session.add(UserRole(user_id=user.id, role_id=role.id, institution_id=institution.id))
    audit_service.record("institution.member.add", "user", user.id,
                         after={"role": role_name}, institution_id=institution.id)
    db.session.commit()
