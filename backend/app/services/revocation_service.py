"""
Revocation service — two-person revocation (BR-11/BR-21, UC-05) publishing
monotonic status roots to the RevocationRegistry.

Rules enforced here:
- initiate + confirm must be DIFFERENT users (SameActorError otherwise)
- revocation is irreversible (no un-revoke path exists; corrections use
  supersede_certificate) — suspension is the only reversible negative state
- each state change publishes a new status root with version+1 (invariant S1)
"""
from __future__ import annotations

import hashlib

from flask import current_app

from app.errors import InvalidStateError, NotFoundError, SameActorError
from app.extensions import db
from app.models import Certificate, CertificateHistory, Institution, utcnow
from app.services import audit_service

REASONS = ("fraud", "error", "misconduct", "superseded", "holder_request")

# In-flight two-person confirmations: history row 'revocation_initiated' acts
# as the pending record; confirm looks it up (no extra table needed).


def initiate_revocation(cert: Certificate, actor_id: str, reason_code: str,
                        visibility: str = "public") -> CertificateHistory:
    if cert.status in ("revoked", "superseded"):
        raise InvalidStateError(f"Certificate is already {cert.status}.")
    if reason_code not in REASONS:
        raise InvalidStateError(f"Unsupported reason code '{reason_code}'.")

    pending = _pending_initiation(cert)
    if pending is not None:
        raise InvalidStateError("A revocation is already awaiting confirmation.")

    entry = CertificateHistory(certificate_id=cert.id, event="revocation_initiated",
                               actor_user_id=actor_id, reason_code=reason_code,
                               reason_visibility=visibility)
    db.session.add(entry)
    audit_service.record("certificate.revoke.initiate", "certificate", cert.cert_uid,
                         after={"reason": reason_code}, institution_id=cert.institution_id)
    db.session.commit()
    return entry


def confirm_revocation(cert: Certificate, confirmer_id: str) -> dict:
    """Second-person confirmation → status flip → on-chain status root."""
    pending = _pending_initiation(cert)
    if pending is None:
        raise NotFoundError("No pending revocation for this certificate.")
    if pending.actor_user_id == confirmer_id:
        raise SameActorError()  # BR-21: revoker-1 ≠ revoker-2

    cert.status = "revoked"
    tx = _publish_status_root(cert)

    db.session.add(CertificateHistory(
        certificate_id=cert.id, event="revoked",
        actor_user_id=pending.actor_user_id, actor2_user_id=confirmer_id,
        reason_code=pending.reason_code, reason_visibility=pending.reason_visibility,
        chain_tx_hash=tx["tx_hash"],
    ))
    if cert.holder_user_id:
        audit_service.notify(cert.holder_user_id, "lifecycle", "Your certificate was revoked",
                             f"Certificate {cert.cert_uid} was revoked. You can appeal via a dispute.")
    audit_service.record("certificate.revoke.confirm", "certificate", cert.cert_uid,
                         after={"tx": tx["tx_hash"]}, institution_id=cert.institution_id)
    db.session.commit()
    return {"status": "revoked", **tx}


def _pending_initiation(cert: Certificate) -> CertificateHistory | None:
    """Latest un-consumed initiation (no 'revoked' event after it)."""
    events = cert.history.all()
    pending = None
    for event in events:  # chronological order
        if event.event == "revocation_initiated":
            pending = event
        elif event.event == "revoked":
            pending = None
    return pending


def _publish_status_root(cert: Certificate) -> dict:
    """
    Rebuilds the issuer's status bitstring and anchors its root with version+1.
    The bitstring itself is served at the list URI (W3C Bitstring Status List);
    on-chain we commit only the integrity root (TDD §7.1).
    """
    institution = db.session.get(Institution, cert.institution_id)
    revoked_indices = sorted(
        c.status_list_index for c in Certificate.query.filter_by(
            institution_id=institution.id, status="revoked").all()
        if c.status_list_index is not None
    )
    # Deterministic bitstring digest (compact stand-in for the full bitstring blob).
    digest = hashlib.sha256(("statuslist:" + ",".join(map(str, revoked_indices))).encode()).hexdigest()
    root = "0x" + digest
    list_id = "0x" + hashlib.sha256(f"list:{institution.id}".encode()).hexdigest()

    chain = current_app.services["chain"]
    version = (getattr(institution, "_status_version", None) or _next_version(institution))
    tx = chain.update_status_root(institution.chain_issuer_id, list_id, root, version,
                                  f"{current_app.config['API_BASE_URL']}/api/v1/status-lists/{institution.id}")
    _bump_version(institution, version)
    return {"tx_hash": tx.tx_hash, "status_root": root, "version": version}


# Version counter persisted in SystemSetting (simple, transactional).
def _next_version(institution: Institution) -> int:
    from app.models import SystemSetting

    key = f"status_version:{institution.id}"
    setting = SystemSetting.query.filter_by(key=key).first()
    return (setting.value["v"] if setting else 0) + 1


def _bump_version(institution: Institution, version: int) -> None:
    from app.models import SystemSetting

    key = f"status_version:{institution.id}"
    setting = SystemSetting.query.filter_by(key=key).first()
    if setting is None:
        setting = SystemSetting(key=key, value={"v": version}, description="Status list version counter")
        db.session.add(setting)
    else:
        setting.value = {"v": version}
