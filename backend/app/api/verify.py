"""
Public verification API — /api/v1/verify/*

NO authentication (BR-16: verification is free and login-free forever), but
rate-limited and anti-enumeration-shaped (neutral 404s, FR-VER-014/006).
Verdicts are identical to authenticated channels (VER-008).
"""
from __future__ import annotations

from flask import request
from flask_restx import Namespace, Resource

from app.extensions import limiter
from app.schemas import FileVerifySchema
from app.services import verification_service

ns = Namespace("verify", description="Public certificate verification (no login)")


@ns.route("/<string:cert_uid>")
class VerifyByUid(Resource):
    decorators = [limiter.limit("60 per minute")]

    @ns.doc(description="Full verdict for a certificate UID (7 states, BR-15 precedence). "
                        "QR codes resolve here (FR-VER-001/002).")
    @ns.response(200, "Verdict (VALID/REVOKED/SUPERSEDED/EXPIRED/TAMPERED/UNKNOWN_ISSUER/SUSPENDED_ISSUER)")
    @ns.response(404, "Neutral not-found (anti-enumeration)")
    def get(self, cert_uid: str):
        cert = verification_service.get_by_uid(cert_uid)
        return verification_service.verify_certificate(cert, channel="qr" if request.args.get("qr") else "url")


@ns.route("/share/<string:token>")
class VerifyShare(Resource):
    decorators = [limiter.limit("60 per minute")]

    @ns.doc(description="Verdict via a holder share link — only disclosed fields are returned. "
                        "PIN goes in the X-Share-Pin header when the link is protected.",
            params={"token": "Share token from the holder's link"})
    @ns.response(401, "PIN_REQUIRED")
    @ns.response(404, "SHARE_EXPIRED (expired/revoked/over view limit)")
    def get(self, token: str):
        pin = request.headers.get("X-Share-Pin")
        cert, share = verification_service.resolve_share(token, pin)
        return verification_service.verify_certificate(cert, channel="url", share=share)


@ns.route("/file")
class VerifyFile(Resource):
    decorators = [limiter.limit("20 per minute")]

    @ns.doc(description="Verify a presented payload against the sealed record: the content is "
                        "re-hashed and compared — any alteration yields TAMPERED (FR-VER-005).")
    def post(self):
        data = FileVerifySchema().load(request.get_json(force=True))
        cert = verification_service.get_by_uid(data["cert_uid"])
        return verification_service.verify_certificate(cert, channel="file",
                                                       presented_payload=data["payload"])
