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


@ns.route("/demo-certs")
class VerifyDemoCerts(Resource):
    decorators = [limiter.limit("60 per minute")]

    @ns.doc(description="Returns pre-seeded demo certificates (e.g. Osmania University) for panel demonstration.")
    def get(self):
        from app.models import Certificate, Institution
        from app.extensions import db
        certs = (Certificate.query
                 .filter(Certificate.status == "issued")
                 .order_by(Certificate.created_at.desc())
                 .limit(10).all())
        results = []
        for c in certs:
            inst = db.session.get(Institution, c.institution_id)
            results.append({
                "cert_uid": c.cert_uid,
                "institution_name": inst.legal_name if inst else "University",
                "institution_slug": inst.slug if inst else "university",
                "student_name": (c.subject_data or {}).get("holder_name", "Student"),
                "program": (c.subject_data or {}).get("program", "Degree Program"),
                "cgpa": (c.subject_data or {}).get("cgpa", "8.85"),
                "hall_ticket_no": (c.subject_data or {}).get("hall_ticket_no", "1005-21-733-042"),
                "content_hash": c.content_hash,
                "batch_id": c.batch_id,
                "merkle_root": c.batch.merkle_root if c.batch else "",
                "tx_hash": c.batch.anchor_tx_hash if c.batch else "",
                "pdf_url": f"/api/v1/verify/{c.cert_uid}/pdf",
                "pdf_tampered_url": f"/api/v1/verify/{c.cert_uid}/pdf-tampered",
                "verify_url": f"/v/{c.cert_uid}",
            })
        return {"demo_certificates": results}


@ns.route("/<string:cert_uid>/pdf")
class CertificatePdfDownload(Resource):
    decorators = [limiter.limit("60 per minute")]

    @ns.doc(description="Download the high-fidelity authentic University Degree PDF certificate.")
    def get(self, cert_uid: str):
        from flask import Response, current_app
        from app.services.pdf_service import generate_certificate_pdf
        from app.models import Institution
        from app.extensions import db
        cert = verification_service.get_by_uid(cert_uid)
        inst = db.session.get(Institution, cert.institution_id)
        inst_name = inst.legal_name if inst else "University"
        base_url = current_app.config.get("VERIFY_BASE_URL", "http://localhost:3000")
        v_url = f"{base_url}/v/{cert.cert_uid}"
        pdf_bytes = generate_certificate_pdf(
            cert_uid=cert.cert_uid,
            institution_name=inst_name,
            student_name=(cert.subject_data or {}).get("holder_name", "Student"),
            program=(cert.subject_data or {}).get("program", "Degree"),
            subject_data=cert.subject_data or {},
            content_hash=cert.content_hash,
            verify_url=v_url,
            tampered=False,
        )
        safe_name = cert.cert_uid.replace("-", "_")
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Degree_Original_{safe_name}.pdf"',
                "X-Certificate-Status": "ORIGINAL",
            },
        )


@ns.route("/<string:cert_uid>/pdf-tampered")
class CertificateTamperedPdfDownload(Resource):
    decorators = [limiter.limit("60 per minute")]

    @ns.doc(description="Download a tampered version of the certificate (e.g. modified CGPA/forged mark) to demo tamper detection.")
    def get(self, cert_uid: str):
        from flask import Response, current_app
        from app.services.pdf_service import generate_certificate_pdf
        from app.models import Institution
        from app.extensions import db
        cert = verification_service.get_by_uid(cert_uid)
        inst = db.session.get(Institution, cert.institution_id)
        inst_name = inst.legal_name if inst else "University"
        base_url = current_app.config.get("VERIFY_BASE_URL", "http://localhost:3000")
        v_url = f"{base_url}/v/{cert.cert_uid}"
        # For demonstration: alter CGPA from 8.85 to 9.95, and append distinction
        pdf_bytes = generate_certificate_pdf(
            cert_uid=cert.cert_uid,
            institution_name=inst_name,
            student_name=(cert.subject_data or {}).get("holder_name", "Student"),
            program=(cert.subject_data or {}).get("program", "Degree"),
            subject_data=cert.subject_data or {},
            content_hash=cert.content_hash,
            verify_url=v_url,
            tampered=True,
            tamper_modifications={
                "cgpa": "9.95",
                "division": "First Class with Distinction (FORGED)",
                "hall_ticket_no": (cert.subject_data or {}).get("hall_ticket_no", "1005-21-733-042") + " [FORGED]",
            },
        )
        safe_name = cert.cert_uid.replace("-", "_")
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Degree_TAMPERED_{safe_name}.pdf"',
                "X-Certificate-Status": "TAMPERED",
            },
        )


@ns.route("/upload-pdf")
class VerifyPdfUpload(Resource):
    decorators = [limiter.limit("30 per minute")]

    @ns.doc(description="Upload an official certificate PDF. The system extracts the machine-readable "
                        "blockchain seal and subject fields, re-calculates the cryptographic SHA-256 hash, "
                        "and compares it against the immutable on-chain record.")
    def post(self):
        from app.services.pdf_service import extract_certificate_from_pdf
        from app.errors import ApiError

        file = request.files.get("file")
        if not file:
            # Check raw data
            pdf_bytes = request.get_data()
            if not pdf_bytes or not pdf_bytes.startswith(b"%PDF"):
                raise ApiError("Please upload a valid PDF certificate file.")
        else:
            pdf_bytes = file.read()

        cert_uid, payload, debug_meta = extract_certificate_from_pdf(pdf_bytes)
        if not cert_uid:
            raise ApiError("Could not detect a valid TrustChain Certificate ID (TC-XXXX-XXXX-XXXX) in the uploaded PDF.")

        cert = verification_service.get_by_uid(cert_uid)

        # Run verification against the presented payload extracted from the PDF
        verdict_result = verification_service.verify_certificate(
            cert,
            channel="pdf_upload",
            presented_payload=payload or {},
        )

        # Enrich verdict response with extracted details and PDF debug metadata
        verdict_result["upload_analysis"] = {
            "detected_cert_uid": cert_uid,
            "extracted_payload": payload,
            "filename": getattr(file, "filename", "uploaded_certificate.pdf") if file else "uploaded.pdf",
            "pdf_pages": debug_meta.get("pages", 1),
            "tamper_detected": verdict_result["verdict"] == "TAMPERED",
        }

        # If tampered, calculate specific field differences
        if verdict_result["verdict"] == "TAMPERED":
            diff = {}
            original = cert.subject_data or {}
            presented = payload or {}
            for k in set(original.keys()) | set(presented.keys()):
                orig_val = original.get(k)
                pres_val = presented.get(k)
                if orig_val != pres_val:
                    diff[k] = {"original_on_chain": orig_val, "modified_in_file": pres_val}
            verdict_result["upload_analysis"]["field_discrepancies"] = diff

        return verdict_result

