"""
Certificates & batches API — /api/v1/{institutions,batches,certificates}/*

Institution-scoped issuance pipeline (maker-checker), revocation (two-person),
supersede correction, QR generation. Tenant scoping: handlers resolve the
caller's institution from JWT claims and never accept a foreign tenant id
(deny-by-default; neutral 404 for cross-tenant probes).
"""
from __future__ import annotations

from flask import g, request
from flask_restx import Namespace, Resource

from app.auth.rbac import require_permission
from app.errors import NotFoundError
from app.extensions import db
from app.models import Batch, Certificate
from app.schemas import BatchCreateSchema, RevokeInitiateSchema, SupersedeSchema
from app.services import analytics_service, certificate_service, institution_service, revocation_service, verification_service

ns = Namespace("certificates", description="Issuance pipeline, lifecycle, and QR")


def _my_institution():
    if not g.institution_id:
        raise NotFoundError("No institution context on this account.")
    return institution_service.get_or_404(g.institution_id)


def _my_batch(batch_id: str) -> Batch:
    batch = db.session.get(Batch, batch_id)
    if batch is None or batch.institution_id != g.institution_id:
        raise NotFoundError("Batch not found.")  # neutral cross-tenant 404
    return batch


def _my_cert(cert_uid: str) -> Certificate:
    cert = Certificate.query.filter_by(cert_uid=cert_uid).first()
    if cert is None or cert.institution_id != g.institution_id:
        raise NotFoundError("Certificate not found.")
    return cert


def _batch_json(b: Batch, include_certs: bool = False) -> dict:
    data = {
        "id": b.id, "name": b.name, "status": b.status, "row_count": b.row_count,
        "error_report": b.error_report, "merkle_root": b.merkle_root,
        "anchor_tx_hash": b.anchor_tx_hash, "anchor_block": b.anchor_block,
        "created_by": b.created_by, "approved_by": b.approved_by,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }
    if include_certs:
        certs = b.certificates.order_by(Certificate.leaf_index).limit(100).all()
        data["certificates"] = [
            {
                "cert_uid": c.cert_uid,
                "status": c.status,
                "type": c.certificate_type,
                "subject_data": c.subject_data or {},
            }
            for c in certs
        ]
    return data


@ns.route("/batches")
class Batches(Resource):
    @require_permission("certificates:read")
    @ns.doc(params={"status": "Filter by batch status (e.g. pending_approval, anchored, draft)"})
    def get(self):
        query = Batch.query.filter_by(institution_id=g.institution_id)
        if status := request.args.get("status"):
            query = query.filter_by(status=status)
        rows = query.order_by(Batch.created_at.desc()).all()
        return {"data": [_batch_json(b) for b in rows]}

    @require_permission("certificates:issue")
    @ns.doc(description="Create a batch with dry-run validation (FR-ISS-002/003). "
                        "Returns 'validated' or 'draft' + row-level error report.")
    @ns.response(201, "Batch created")
    def post(self):
        data = BatchCreateSchema().load(request.get_json(force=True))
        batch = certificate_service.create_batch(_my_institution(), data["name"], data["rows"], g.user_id)
        return _batch_json(batch), 201


@ns.route("/batches/<string:batch_id>")
class BatchDetail(Resource):
    method_decorators = [require_permission("certificates:read")]

    def get(self, batch_id: str):
        return _batch_json(_my_batch(batch_id), include_certs=True)


@ns.route("/batches/<string:batch_id>/submit")
class BatchSubmit(Resource):
    method_decorators = [require_permission("certificates:issue")]

    @ns.response(200, "Pending approval")
    @ns.response(422, "INVALID_STATE")
    def post(self, batch_id: str):
        return _batch_json(certificate_service.submit_batch(_my_batch(batch_id)))


@ns.route("/batches/<string:batch_id>/approve")
class BatchApprove(Resource):
    method_decorators = [require_permission("certificates:approve")]

    @ns.doc(description="Maker-checker approval → Merkle build → on-chain anchor (UC-02). "
                        "The batch creator can never approve their own batch.")
    @ns.response(403, "SELF_APPROVAL_FORBIDDEN")
    def post(self, batch_id: str):
        return _batch_json(certificate_service.approve_batch(_my_batch(batch_id), g.user_id))


@ns.route("")
class CertificateList(Resource):
    method_decorators = [require_permission("certificates:read")]

    @ns.doc(params={"status": "Filter by status", "limit": "Page size (≤100)", "offset": "Offset"})
    def get(self):
        query = Certificate.query.filter_by(institution_id=g.institution_id)
        if status := request.args.get("status"):
            query = query.filter_by(status=status)
        limit = min(int(request.args.get("limit", 25)), 100)
        offset = int(request.args.get("offset", 0))
        rows = query.order_by(Certificate.created_at.desc()).limit(limit).offset(offset).all()
        return {"data": [{"cert_uid": c.cert_uid, "status": c.status,
                          "type": c.certificate_type, "batch_id": c.batch_id,
                          "claimed": c.holder_user_id is not None} for c in rows],
                "limit": limit, "offset": offset}


@ns.route("/<string:cert_uid>")
class CertificateDetail(Resource):
    method_decorators = [require_permission("certificates:read")]

    def get(self, cert_uid: str):
        cert = _my_cert(cert_uid)
        return {
            "cert_uid": cert.cert_uid, "status": cert.status, "type": cert.certificate_type,
            "subject_data": cert.subject_data, "content_hash": cert.content_hash,
            "leaf_index": cert.leaf_index, "merkle_root": cert.batch.merkle_root,
            "anchor_tx_hash": cert.batch.anchor_tx_hash,
            "supersedes": cert.supersedes_id, "superseded_by": cert.superseded_by_id,
            "timeline": analytics_service.certificate_timeline(cert),
        }


@ns.route("/<string:cert_uid>/qr")
class CertificateQr(Resource):
    method_decorators = [require_permission("certificates:read")]

    @ns.doc(description="QR PNG (data URI) encoding the public verification URL (FR-VER-002).")
    def get(self, cert_uid: str):
        _my_cert(cert_uid)  # tenant scope check
        return {"qr": verification_service.qr_png_data_uri(cert_uid)}


@ns.route("/<string:cert_uid>/revoke")
class RevokeInitiate(Resource):
    method_decorators = [require_permission("certificates:revoke")]

    @ns.doc(description="Initiate revocation (person 1 of 2). Irreversible once confirmed (BR-11).")
    @ns.response(202, "Awaiting second approver")
    def post(self, cert_uid: str):
        data = RevokeInitiateSchema().load(request.get_json(force=True))
        revocation_service.initiate_revocation(_my_cert(cert_uid), g.user_id,
                                               data["reason_code"], data["visibility"])
        return {"detail": "Revocation recorded — awaiting a second approver."}, 202


@ns.route("/<string:cert_uid>/revoke/confirm")
class RevokeConfirm(Resource):
    method_decorators = [require_permission("certificates:revoke")]

    @ns.doc(description="Second-person confirmation → status root anchored on-chain (UC-05).")
    @ns.response(403, "SAME_ACTOR")
    def post(self, cert_uid: str):
        return revocation_service.confirm_revocation(_my_cert(cert_uid), g.user_id)


@ns.route("/<string:cert_uid>/supersede")
class Supersede(Resource):
    method_decorators = [require_permission("certificates:approve")]

    @ns.doc(description="Correct & reissue: new certificate linked both ways; old shows SUPERSEDED (BR-12).")
    def post(self, cert_uid: str):
        data = SupersedeSchema().load(request.get_json(force=True))
        cert = _my_cert(cert_uid)
        # Maker-checker holds for corrections too (BR-21): the original batch
        # creator is the maker of record; the caller approves the correction.
        successor = certificate_service.supersede_certificate(
            cert, data["corrected_row"], cert.batch.created_by, g.user_id)
        return {"successor_uid": successor.cert_uid}, 201
