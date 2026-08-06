"""
AI assistant API — /api/v1/ai/*

Advisory only (app/services/ai_service.py carries the hard rule). Every
explain endpoint recomputes the REAL verdict/checks/anchor data server-side
before handing anything to the model — it never trusts a client-supplied
verdict or hash, so a caller can't get the assistant to narrate a fabricated
result. Gated to authenticated users and rate-limited: unlike verification
itself (free and login-free forever, BR-16), the assistant makes a real,
billed external API call per request.
"""
from __future__ import annotations

from flask import current_app, request
from flask_restx import Namespace, Resource

from app.auth.rbac import require_permission
from app.errors import RequestValidationError
from app.extensions import limiter
from app.services import ai_service, verification_service

ns = Namespace("ai", description="AI assistant — advisory only, never a source of truth")


@ns.route("/status")
class Status(Resource):
    @ns.doc(description="Whether the AI assistant is configured on this deployment.")
    def get(self):
        return {"enabled": bool(current_app.config.get("ANTHROPIC_API_KEY"))}


@ns.route("/explain/certificate/<string:cert_uid>")
class ExplainCertificate(Resource):
    method_decorators = [require_permission("notifications:own")]  # any authenticated user
    decorators = [limiter.limit("20 per hour")]

    @ns.doc(description="Plain-language explanation of a certificate's verdict. The verdict and "
                        "checks are recomputed by the real pipeline server-side, never taken "
                        "from the request — the assistant can only narrate real data.")
    def get(self, cert_uid: str):
        cert = verification_service.get_by_uid(cert_uid)
        verdict_data = verification_service.verify_certificate(cert, channel="url")
        text = ai_service.explain_certificate(
            verdict_data["verdict"], verdict_data["checks"],
            verdict_data["certificate"].get("disclosed_fields", {}),
            verdict_data["certificate"]["issuer"].get("name"),
        )
        return {"cert_uid": cert_uid, "verdict": verdict_data["verdict"],
                "explanation": text, "ai_generated": True}


@ns.route("/explain/transaction/<string:cert_uid>")
class ExplainTransaction(Resource):
    method_decorators = [require_permission("notifications:own")]
    decorators = [limiter.limit("20 per hour")]

    @ns.doc(description="Plain-language explanation of the real on-chain anchor for this "
                        "certificate's batch — root/tx/block are read server-side, never "
                        "accepted from the client.")
    def get(self, cert_uid: str):
        cert = verification_service.get_by_uid(cert_uid)
        text = ai_service.explain_transaction(
            cert.batch.merkle_root, cert.batch.anchor_tx_hash, cert.batch.anchor_block,
        )
        return {"cert_uid": cert_uid, "explanation": text, "ai_generated": True}


@ns.route("/chat")
class Chat(Resource):
    method_decorators = [require_permission("notifications:own")]
    decorators = [limiter.limit("30 per hour")]

    @ns.doc(description="General assistant — first-time-user guidance, issuance help, concept "
                        "explanations. Never determines or claims to verify a certificate "
                        "itself; always defers to the real Verify page for that.")
    def post(self):
        data = request.get_json(force=True) or {}
        message = str(data.get("message", "")).strip()
        if not message:
            raise RequestValidationError("Message is required.")
        context = data.get("context") if isinstance(data.get("context"), dict) else {}
        history = data.get("history") if isinstance(data.get("history"), list) else []
        text = ai_service.chat(message, context, history[-10:])
        return {"reply": text, "ai_generated": True}


@ns.route("/detect-suspicious")
class DetectSuspicious(Resource):
    method_decorators = [require_permission("notifications:own")]
    decorators = [limiter.limit("20 per hour")]

    @ns.doc(description="Advisory pre-screen for suspicious document patterns, run BEFORE the "
                        "real blockchain verification call. Never gates or replaces it — the "
                        "caller must still invoke the real /verify/file endpoint regardless of "
                        "this result.")
    def post(self):
        data = request.get_json(force=True) or {}
        payload = data.get("payload")
        if not isinstance(payload, dict):
            raise RequestValidationError("payload must be an object.")
        result = ai_service.detect_suspicious_patterns(payload)
        result["ai_generated"] = True
        result["advisory_only"] = True
        return result
