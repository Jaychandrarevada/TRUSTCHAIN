"""
Certificate issuance service — the batch pipeline (UC-02 / TDD §2.8):

  create batch (draft) → validate rows (dry-run) → submit → approve
  (maker ≠ checker, BR-21) → hash+salt+Merkle → anchor on-chain → notify.

Also: single issuance (batch-of-1), claim binding (UC-03), and the
supersede-and-reissue correction chain (BR-12).
"""
from __future__ import annotations

from flask import current_app, g

from app.blockchain import merkle
from app.errors import InvalidStateError, NotFoundError, SelfApprovalError
from app.extensions import db
from app.models import Batch, Certificate, CertificateHistory, Institution, User, utcnow
from app.services import audit_service

# Minimal issuance schema (production loads CredentialSchema definitions).
REQUIRED_FIELDS = ("holder_name", "holder_email", "program")
MAX_BATCH_ROWS = 50_000


def _chain():
    """Blockchain client from the DI container (swappable in tests)."""
    return current_app.services["chain"]


# ── Batch lifecycle ───────────────────────────────────────────────────────────

def create_batch(institution: Institution, name: str, rows: list[dict], created_by: str) -> Batch:
    """Creates a draft batch and runs row-level dry-run validation (FR-ISS-003)."""
    if not institution.can_issue:
        raise InvalidStateError("Institution is not approved for issuance (KYB pending or suspended).")
    if not rows:
        raise InvalidStateError("Batch contains no rows.")
    if len(rows) > MAX_BATCH_ROWS:
        raise InvalidStateError(f"Batch exceeds the {MAX_BATCH_ROWS}-row limit.")

    errors = _validate_rows(rows)
    batch = Batch(
        institution_id=institution.id, name=name, row_count=len(rows),
        created_by=created_by, status="validated" if not errors else "draft",
        error_report={"errors": errors} if errors else None,
    )
    db.session.add(batch)
    db.session.flush()

    if not errors:
        # Stage certificate drafts now; cryptographic evidence lands at approval.
        for i, row in enumerate(rows):
            cert = Certificate(
                institution_id=institution.id, batch_id=batch.id,
                subject_data=row, certificate_type=row.get("certificate_type", "degree"),
                content_hash="0x" + "0" * 64, leaf_hash="0x" + "0" * 64, leaf_index=i,
            )
            db.session.add(cert)

    audit_service.record("batch.create", "batch", batch.id,
                         after={"rows": len(rows), "errors": len(errors)},
                         institution_id=institution.id)
    db.session.commit()
    return batch


def _validate_rows(rows: list[dict]) -> list[dict]:
    """Row-level dry-run report: every failing row with a reason (FR-ISS-003/004)."""
    errors: list[dict] = []
    seen: set[tuple] = set()
    for i, row in enumerate(rows):
        for field in REQUIRED_FIELDS:
            if not str(row.get(field, "")).strip():
                errors.append({"row": i, "field": field, "message": f"'{field}' is required."})
        # In-batch duplicate detection (holder + program), BR-04.
        key = (str(row.get("holder_email", "")).lower(), row.get("program"))
        if key in seen:
            errors.append({"row": i, "field": "holder_email",
                           "message": "Duplicate of an earlier row (same holder + program)."})
        seen.add(key)
    return errors


def submit_batch(batch: Batch) -> Batch:
    if batch.status != "validated":
        raise InvalidStateError(f"Batch must be 'validated' to submit (is '{batch.status}').")
    batch.status = "pending_approval"
    audit_service.record("batch.submit", "batch", batch.id, institution_id=batch.institution_id)
    db.session.commit()
    return batch


def approve_batch(batch: Batch, approver_id: str) -> Batch:
    """
    Maker-checker approval (BR-21) → cryptographic pipeline → on-chain anchor.
    The anchor call is idempotent at the contract (duplicate-root rejection).
    """
    if batch.status != "pending_approval":
        raise InvalidStateError(f"Batch is not awaiting approval (is '{batch.status}').")
    if approver_id == batch.created_by:
        raise SelfApprovalError()

    certs = batch.certificates.order_by(Certificate.leaf_index).all()
    payloads = [
        {"cert_uid": c.cert_uid, "type": c.certificate_type, **(c.subject_data or {})}
        for c in certs
    ]
    built = merkle.build_batch(payloads)

    for i, cert in enumerate(certs):
        cert.salt = built["salts"][i]
        cert.content_hash = built["content_hashes"][i]
        cert.leaf_hash = built["leaves"][i]
        cert.merkle_proof = built["proofs"][i]
        cert.status_list_index = i

    batch.status = "anchoring"
    batch.approved_by, batch.approved_at = approver_id, utcnow()
    batch.merkle_root = built["tree"].root
    db.session.flush()

    # Anchor on-chain (AnchorType.Issuance = 0). batch_ref = batch UUID as bytes32 hex.
    batch_ref = "0x" + batch.id.replace("-", "").ljust(64, "0")
    institution = db.session.get(Institution, batch.institution_id)
    tx = _chain().anchor_root(built["tree"].root, institution.chain_issuer_id, batch_ref, 0, batch.manifest_uri or "")

    batch.status = "anchored"
    batch.anchor_tx_hash, batch.anchor_block, batch.anchored_at = tx.tx_hash, tx.block_number, utcnow()

    for cert in certs:
        db.session.add(CertificateHistory(certificate_id=cert.id, event="issued",
                                          actor_user_id=batch.created_by,
                                          actor2_user_id=approver_id,
                                          chain_tx_hash=tx.tx_hash))
        # Claim invitations go out via the (mock) mailer to holder_email; an
        # in-app notification is only possible after the holder claims.

    audit_service.record("batch.approve", "batch", batch.id,
                         after={"root": batch.merkle_root, "tx": tx.tx_hash},
                         institution_id=batch.institution_id)
    db.session.commit()
    return batch


def issue_single(institution: Institution, row: dict, created_by: str, approver_id: str) -> Certificate:
    """Single certificate = batch of one, same pipeline & controls (FR-ISS-001)."""
    batch = create_batch(institution, f"single-{utcnow().date()}", [row], created_by)
    if batch.status != "validated":
        raise InvalidStateError("Row failed validation.", )
    submit_batch(batch)
    approve_batch(batch, approver_id)
    return batch.certificates.first()


# ── Claim (UC-03) ─────────────────────────────────────────────────────────────

def claim_certificate(cert_uid: str, user: User, identity_email: str) -> Certificate:
    """Binds a certificate to the holder after identity-field match (BR-05).
    OTP possession is proven by the authenticated session (holder OTP login)."""
    cert = Certificate.query.filter_by(cert_uid=cert_uid).first()
    if cert is None:
        raise NotFoundError("Certificate not found.")
    if cert.holder_user_id is not None:
        raise InvalidStateError("This certificate has already been claimed.")
    registered = str((cert.subject_data or {}).get("holder_email", "")).lower()
    if registered != identity_email.lower():
        raise InvalidStateError("Identity details don't match this certificate — contact the issuer.")

    cert.holder_user_id, cert.claimed_at = user.id, utcnow()
    if cert.status == "issued":
        cert.status = "claimed"
    db.session.add(CertificateHistory(certificate_id=cert.id, event="claimed", actor_user_id=user.id))
    audit_service.record("certificate.claim", "certificate", cert.cert_uid, institution_id=cert.institution_id)
    db.session.commit()
    return cert


# ── Supersede-and-reissue (BR-12, UC-06) ─────────────────────────────────────

def supersede_certificate(cert: Certificate, corrected_row: dict, created_by: str, approver_id: str) -> Certificate:
    """Issues a corrected successor; the old certificate becomes SUPERSEDED."""
    if cert.status in ("revoked", "superseded"):
        raise InvalidStateError(f"Cannot supersede a {cert.status} certificate.")
    institution = db.session.get(Institution, cert.institution_id)
    successor = issue_single(institution, corrected_row, created_by, approver_id)

    cert.status = "superseded"
    cert.superseded_by_id = successor.id
    successor.supersedes_id = cert.id
    db.session.add(CertificateHistory(certificate_id=cert.id, event="superseded",
                                      actor_user_id=created_by, actor2_user_id=approver_id,
                                      detail={"successor": successor.cert_uid}))
    audit_service.record("certificate.supersede", "certificate", cert.cert_uid,
                         after={"successor": successor.cert_uid}, institution_id=cert.institution_id)
    db.session.commit()
    return successor
