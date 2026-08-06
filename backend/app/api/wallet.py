"""
Holder wallet & employer API — /api/v1/{wallet,employers}/*

Wallet: the student's lifelong credential surface (claim, list, share,
share-revoke). Employer: organization bulk verification with history.
"""
from __future__ import annotations

from datetime import timedelta

from flask import g, request
from flask_restx import Namespace, Resource

from app.auth.rbac import require_permission
from app.errors import NotFoundError
from app.extensions import db
from app.models import Certificate, ShareLink, User, VerificationLog, utcnow
from app.schemas import ClaimSchema, ShareCreateSchema
from app.services import certificate_service, verification_service

ns = Namespace("wallet", description="Holder wallet: claim, hold, share")
ns_emp = Namespace("employers", description="Employer verification tools")


@ns.route("/credentials")
class MyCredentials(Resource):
    method_decorators = [require_permission("wallet:own")]

    @ns.doc(description="All credentials claimed by the authenticated holder (cross-institution).")
    def get(self):
        certs = Certificate.query.filter_by(holder_user_id=g.user_id).all()
        return {"data": [{
            "cert_uid": c.cert_uid, "status": c.status, "type": c.certificate_type,
            "subject_data": c.subject_data, "anchor_tx_hash": c.batch.anchor_tx_hash,
            "claimed_at": c.claimed_at.isoformat() if c.claimed_at else None,
        } for c in certs]}


@ns.route("/verifications")
class MyVerifications(Resource):
    method_decorators = [require_permission("wallet:own")]

    @ns.doc(description="Real verification history across every credential this holder owns — "
                        "the Identity Wallet's Verification History section (FR-STU / no PII exposed).")
    def get(self):
        rows = (
            db.session.query(VerificationLog, Certificate.cert_uid)
            .join(Certificate, Certificate.id == VerificationLog.certificate_id)
            .filter(Certificate.holder_user_id == g.user_id)
            .order_by(VerificationLog.created_at.desc())
            .limit(100)
            .all()
        )
        return {"data": [{
            "cert_uid": cert_uid, "verdict": log.verdict, "channel": log.channel,
            "at": log.created_at.isoformat(),
        } for log, cert_uid in rows]}


@ns.route("/claim")
class Claim(Resource):
    method_decorators = [require_permission("wallet:own")]

    @ns.doc(description="Claim a certificate: identity-field match binds it to this account (UC-03/BR-05).")
    @ns.response(422, "IDENTITY_MISMATCH → dispute path")
    def post(self):
        data = ClaimSchema().load(request.get_json(force=True))
        user = db.session.get(User, g.user_id)
        cert = certificate_service.claim_certificate(data["cert_uid"], user, data["holder_email"])
        return {"cert_uid": cert.cert_uid, "status": cert.status}, 200


@ns.route("/shares")
class Shares(Resource):
    method_decorators = [require_permission("wallet:own")]

    @ns.doc(description="Create a share link with expiry / max views / PIN / field selection (FR-STU-005).")
    def post(self):
        data = ShareCreateSchema().load(request.get_json(force=True))
        cert = verification_service.get_by_uid(data["cert_uid"])
        expires_at = (utcnow() + timedelta(days=data["expires_in_days"])) if data["expires_in_days"] else None
        return verification_service.create_share(
            cert, g.user_id, disclosed_fields=data["disclosed_fields"],
            expires_at=expires_at, max_views=data["max_views"], pin=data["pin"]), 201

    def get(self):
        shares = ShareLink.query.filter_by(created_by=g.user_id).all()
        return {"data": [{
            "id": s.id, "certificate_id": s.certificate_id, "active": s.is_active,
            "view_count": s.view_count, "max_views": s.max_views,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        } for s in shares]}


@ns.route("/shares/<string:share_id>")
class ShareDetail(Resource):
    method_decorators = [require_permission("wallet:own")]

    @ns.doc(description="Revoke a share link — dead within a minute (FR-STU-008).")
    @ns.response(204, "Revoked")
    def delete(self, share_id: str):
        verification_service.revoke_share(share_id, g.user_id)
        return "", 204


# ── Employer ──────────────────────────────────────────────────────────────────

@ns_emp.route("/verify/bulk")
class BulkVerify(Resource):
    method_decorators = [require_permission("verify:read")]

    @ns_emp.doc(description="Bulk verification: up to 1,000 certificate UIDs per call; per-item "
                            "verdicts, invalid items reported not dropped (UC-07).")
    def post(self):
        uids = (request.get_json(force=True) or {}).get("cert_uids", [])
        if not isinstance(uids, list) or not 1 <= len(uids) <= 1000:
            from app.errors import RequestValidationError
            raise RequestValidationError("Provide 1–1000 certificate UIDs.")
        results = []
        for uid in uids:
            try:
                cert = verification_service.get_by_uid(str(uid))
                verdict = verification_service.verify_certificate(cert, channel="bulk")
                results.append({"cert_uid": uid, "verdict": verdict["verdict"]})
            except NotFoundError:
                results.append({"cert_uid": uid, "verdict": "NOT_FOUND"})
        summary: dict[str, int] = {}
        for r in results:
            summary[r["verdict"]] = summary.get(r["verdict"], 0) + 1
        return {"summary": summary, "results": results}
