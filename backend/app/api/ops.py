"""
Institution, admin & platform-ops API — /api/v1/{institutions,admin,...}/*

Groups: institution self-service, platform-admin KYB/tenant controls,
notifications, audit logs, analytics, settings, blockchain info, health.
"""
from __future__ import annotations

from flask import current_app, g, request
from flask_restx import Namespace, Resource

from app.auth.rbac import require_permission
from app.errors import NotFoundError
from app.extensions import db
from app.models import (
    ActivityLog,
    Batch,
    Certificate,
    Institution,
    Notification,
    SystemSetting,
    User,
    VerificationLog,
    utcnow,
)
from app.schemas import (
    InstitutionCreateSchema,
    KybDecisionSchema,
    MemberAddSchema,
    SettingSchema,
    TenantStatusSchema,
)
from app.services import analytics_service, institution_service
from sqlalchemy import func

ns_inst = Namespace("institutions", description="Institution self-service")
ns_admin = Namespace("admin", description="Platform administration (KYB, tenants, settings)")
ns_misc = Namespace("me", description="Notifications & profile utilities")
ns_ops = Namespace("ops", description="Audit, analytics, blockchain info, health")


# ── Institutions (self-service) ──────────────────────────────────────────────

@ns_inst.route("")
class Institutions(Resource):
    method_decorators = [require_permission("notifications:own")]  # any authenticated user may apply

    @ns_inst.doc(description="Create an institution (tenant). Issuance unlocks only after KYB approval (UC-01).")
    def post(self):
        data = InstitutionCreateSchema().load(request.get_json(force=True))
        user = db.session.get(User, g.user_id)
        institution = institution_service.create_institution(
            user, data["legal_name"], data["slug"], data["institution_type"],
            data["accreditation_body"], data["accreditation_ref"])
        return {"id": institution.id, "slug": institution.slug, "status": institution.status}, 201


@ns_inst.route("/me")
class MyInstitution(Resource):
    method_decorators = [require_permission("certificates:read")]

    def get(self):
        institution = institution_service.get_or_404(g.institution_id)
        return {"id": institution.id, "legal_name": institution.legal_name,
                "status": institution.status, "chain_issuer_id": institution.chain_issuer_id,
                "issuer_did": institution.issuer_did, "can_issue": institution.can_issue}


@ns_inst.route("/me/members")
class Members(Resource):
    method_decorators = [require_permission("institution:manage")]

    @ns_inst.doc(description="Add a member with an institution-scoped role (FR-INST-007).")
    def post(self):
        data = MemberAddSchema().load(request.get_json(force=True))
        institution = institution_service.get_or_404(g.institution_id)
        user = User.query.filter_by(email=data["email"].lower(), deleted_at=None).first()
        if user is None:
            raise NotFoundError("No account with this email — the user must register first.")
        institution_service.add_member(institution, user, data["role"])
        return {"detail": f"{data['email']} added as {data['role']}."}, 201


# ── Platform admin ────────────────────────────────────────────────────────────

@ns_admin.route("/kyb")
class KybQueue(Resource):
    method_decorators = [require_permission("institution:kyb")]

    @ns_admin.doc(description="Pending KYB applications, oldest first (FR-ADM-002).")
    def get(self):
        rows = Institution.query.filter_by(status="pending_kyb").order_by(Institution.created_at).all()
        return {"data": [{"id": i.id, "legal_name": i.legal_name, "slug": i.slug,
                          "accreditation_body": i.accreditation_body,
                          "applied_at": i.created_at.isoformat()} for i in rows]}


@ns_admin.route("/kyb/<string:institution_id>/approve")
class KybApprove(Resource):
    method_decorators = [require_permission("institution:kyb")]

    @ns_admin.doc(description="Approve KYB → on-chain issuer registration (human decision, BR-I4).")
    def post(self, institution_id: str):
        institution = institution_service.get_or_404(institution_id)
        institution = institution_service.approve_kyb(institution, g.user_id)
        return {"status": institution.status, "chain_issuer_id": institution.chain_issuer_id,
                "tx_hash": institution.registration_tx_hash}


@ns_admin.route("/kyb/<string:institution_id>/reject")
class KybReject(Resource):
    method_decorators = [require_permission("institution:kyb")]

    def post(self, institution_id: str):
        data = KybDecisionSchema().load(request.get_json(force=True))
        institution_service.reject_kyb(institution_service.get_or_404(institution_id),
                                       g.user_id, data["reason"])
        return {"detail": "Application rejected with reason."}


@ns_admin.route("/tenants/<string:institution_id>/status")
class TenantStatus(Resource):
    method_decorators = [require_permission("tenants:manage")]

    @ns_admin.doc(description="Suspend / restore / retire a tenant. Verification of existing "
                              "certificates is never blocked (BR-09).")
    def post(self, institution_id: str):
        data = TenantStatusSchema().load(request.get_json(force=True))
        institution = institution_service.set_status(
            institution_service.get_or_404(institution_id), data["status"], g.user_id)
        return {"status": institution.status}


@ns_admin.route("/institutions")
class InstitutionsNetwork(Resource):
    method_decorators = [require_permission("tenants:manage")]

    @ns_admin.doc(description="Every institution with real aggregate signals (certificates issued, "
                              "claim rate, revocations, verifications, last activity) — the data "
                              "source for the Global Trust Network view. Five GROUP BY queries "
                              "regardless of institution count, so this stays flat as tenants scale "
                              "into the hundreds (no N+1).")
    def get(self):
        rows = Institution.query.order_by(Institution.created_at).all()

        cert_counts = dict(
            db.session.query(Certificate.institution_id, func.count(Certificate.id))
            .group_by(Certificate.institution_id).all())
        claimed_counts = dict(
            db.session.query(Certificate.institution_id, func.count(Certificate.id))
            .filter(Certificate.holder_user_id.isnot(None))
            .group_by(Certificate.institution_id).all())
        revoked_counts = dict(
            db.session.query(Certificate.institution_id, func.count(Certificate.id))
            .filter(Certificate.status == "revoked")
            .group_by(Certificate.institution_id).all())
        verification_counts = dict(
            db.session.query(Certificate.institution_id, func.count(VerificationLog.id))
            .join(VerificationLog, VerificationLog.certificate_id == Certificate.id)
            .group_by(Certificate.institution_id).all())
        last_activity = dict(
            db.session.query(ActivityLog.institution_id, func.max(ActivityLog.created_at))
            .filter(ActivityLog.institution_id.isnot(None))
            .group_by(ActivityLog.institution_id).all())

        def row_json(inst: Institution) -> dict:
            issued = cert_counts.get(inst.id, 0)
            claimed = claimed_counts.get(inst.id, 0)
            return {
                "id": inst.id, "legal_name": inst.legal_name, "slug": inst.slug,
                "institution_type": inst.institution_type, "status": inst.status,
                "accreditation_body": inst.accreditation_body,
                "chain_issuer_id": inst.chain_issuer_id, "issuer_did": inst.issuer_did,
                "registration_tx_hash": inst.registration_tx_hash,
                "created_at": inst.created_at.isoformat(),
                "certificates_issued": issued,
                "claim_rate": round(claimed / issued, 4) if issued else 0.0,
                "revoked": revoked_counts.get(inst.id, 0),
                "verifications_total": verification_counts.get(inst.id, 0),
                "last_activity_at": last_activity[inst.id].isoformat() if inst.id in last_activity else None,
            }

        return {"data": [row_json(i) for i in rows]}


@ns_admin.route("/settings")
class Settings(Resource):
    method_decorators = [require_permission("settings:manage")]

    def get(self):
        return {"data": [{"key": s.key, "value": s.value, "description": s.description}
                         for s in SystemSetting.query.all()]}

    @ns_admin.doc(description="Upsert a platform setting (audited).")
    def put(self):
        data = SettingSchema().load(request.get_json(force=True))
        setting = SystemSetting.query.filter_by(key=data["key"]).first()
        if setting is None:
            setting = SystemSetting(key=data["key"], value=data["value"], description=data["description"])
            db.session.add(setting)
        else:
            setting.value, setting.description = data["value"], data["description"]
        from app.services import audit_service
        audit_service.record("settings.update", "system_setting", data["key"], after={"value": data["value"]})
        db.session.commit()
        return {"key": setting.key, "value": setting.value}


@ns_misc.route("/profile")
class MyProfile(Resource):
    method_decorators = [require_permission("notifications:own")]  # any authenticated user

    @ns_misc.doc(description="Real identity signals for the Digital Academic Identity Wallet "
                            "(Identity Status section): email verification, linked wallets, "
                            "account age. Never a fabricated 'trust' number — just the raw facts.")
    def get(self):
        user = db.session.get(User, g.user_id)
        return {
            "full_name": user.full_name,
            "email": user.email,
            "email_verified": user.email_verified_at is not None,
            "created_at": user.created_at.isoformat(),
            "wallets": [{"address": w.address, "chain_id": w.chain_id,
                        "linked_at": w.linked_at.isoformat()} for w in user.wallets],
        }


# ── Notifications ─────────────────────────────────────────────────────────────

@ns_misc.route("/notifications")
class MyNotifications(Resource):
    method_decorators = [require_permission("notifications:own")]

    def get(self):
        rows = Notification.query.filter_by(user_id=g.user_id).order_by(
            Notification.created_at.desc()).limit(50).all()
        return {"data": [{"id": n.id, "category": n.category, "title": n.title,
                          "body": n.body, "read": n.read_at is not None,
                          "at": n.created_at.isoformat()} for n in rows]}


@ns_misc.route("/notifications/<string:notification_id>/read")
class MarkRead(Resource):
    method_decorators = [require_permission("notifications:own")]

    def post(self, notification_id: str):
        n = db.session.get(Notification, notification_id)
        if n is None or n.user_id != g.user_id:
            raise NotFoundError("Notification not found.")
        n.read_at = utcnow()
        db.session.commit()
        return {"detail": "Marked read."}


# ── Audit, analytics, blockchain, health ─────────────────────────────────────

@ns_ops.route("/audit-logs")
class AuditLogs(Resource):
    method_decorators = [require_permission("audit:read")]

    @ns_ops.doc(description="Append-only audit trail; tenant-scoped unless platform admin (FR-AUD-003). "
                            "Platform admins may additionally filter to one institution's timeline "
                            "(Global Trust Network profile view); the filter is ignored for everyone "
                            "else so tenant isolation is never weakened.",
                params={"action": "Filter by action prefix", "limit": "≤200",
                        "institution_id": "Platform-admin only: scope to one institution"})
    def get(self):
        query = ActivityLog.query
        if "platform_admin" not in g.roles:
            query = query.filter_by(institution_id=g.institution_id)
        elif institution_id := request.args.get("institution_id"):
            query = query.filter_by(institution_id=institution_id)
        if action := request.args.get("action"):
            query = query.filter(ActivityLog.action.like(f"{action}%"))
        rows = query.order_by(ActivityLog.created_at.desc()).limit(
            min(int(request.args.get("limit", 50)), 200)).all()
        return {"data": [{"at": r.created_at.isoformat(), "actor": r.actor_id, "action": r.action,
                          "resource": f"{r.resource_type}:{r.resource_id}", "before": r.before,
                          "after": r.after, "trace_id": r.trace_id} for r in rows]}


@ns_ops.route("/analytics/issuer")
class IssuerAnalytics(Resource):
    method_decorators = [require_permission("analytics:read")]

    def get(self):
        if not g.institution_id:
            raise NotFoundError("No institution context on this account.")
        return analytics_service.issuer_dashboard(g.institution_id)


@ns_ops.route("/analytics/platform")
class PlatformAnalytics(Resource):
    method_decorators = [require_permission("settings:manage")]

    def get(self):
        return analytics_service.platform_dashboard()


@ns_ops.route("/blockchain/info")
class ChainInfo(Resource):
    @ns_ops.doc(description="Public chain configuration: network, contracts, mode (FR-BC-015).")
    def get(self):
        cfg = current_app.config
        return {"mode": cfg["BLOCKCHAIN_MODE"], "chain_id": cfg["CHAIN_ID"],
                "contracts": {"issuer_registry": cfg["ISSUER_REGISTRY_ADDRESS"],
                              "certificate_anchor": cfg["CERTIFICATE_ANCHOR_ADDRESS"],
                              "revocation_registry": cfg["REVOCATION_REGISTRY_ADDRESS"]}}


@ns_ops.route("/health/live")
class Live(Resource):
    @ns_ops.doc(description="Liveness probe — process is up.")
    def get(self):
        return {"status": "ok"}


@ns_ops.route("/health/ready")
class Ready(Resource):
    @ns_ops.doc(description="Readiness probe — DB reachable (503 otherwise).")
    def get(self):
        try:
            db.session.execute(db.text("SELECT 1"))
            return {"status": "ready"}
        except Exception:  # pragma: no cover
            return {"status": "unavailable"}, 503
