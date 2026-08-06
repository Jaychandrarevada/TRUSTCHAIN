"""
Analytics service — issuer/platform metrics that reconcile EXACTLY with raw
event stores (BR-AN1): counts are computed from the same tables the events
were written to, never from parallel counters.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

from sqlalchemy import func

from app.extensions import db
from app.models import Batch, Certificate, Institution, User, VerificationLog, utcnow

FRAUD_VERDICTS = ("TAMPERED", "UNKNOWN_ISSUER")
LIVE_CERT_STATES = ("issued", "claimed")


def issuer_dashboard(institution_id: str) -> dict:
    """Issuer KPIs (FR-ANA-001): volumes, claim rate, verification mix."""
    certs = db.session.query(func.count(Certificate.id)).filter_by(institution_id=institution_id).scalar() or 0
    claimed = db.session.query(func.count(Certificate.id)).filter(
        Certificate.institution_id == institution_id, Certificate.holder_user_id.isnot(None)).scalar() or 0
    revoked = db.session.query(func.count(Certificate.id)).filter_by(
        institution_id=institution_id, status="revoked").scalar() or 0
    pending = db.session.query(func.count(Batch.id)).filter_by(
        institution_id=institution_id, status="pending_approval").scalar() or 0

    verifications = (
        db.session.query(VerificationLog.verdict, func.count(VerificationLog.id))
        .join(Certificate, Certificate.id == VerificationLog.certificate_id)
        .filter(Certificate.institution_id == institution_id)
        .group_by(VerificationLog.verdict)
        .all()
    )
    return {
        "certificates_issued": certs,
        "claim_rate": round(claimed / certs, 4) if certs else 0.0,
        "revoked": revoked,
        "batches_pending_approval": pending,
        "verifications_by_verdict": {v: c for v, c in verifications},
        "verifications_total": sum(c for _, c in verifications),
    }


def platform_dashboard() -> dict:
    """Platform-admin KPIs — the Mission Control Center (FR-ANA-003).

    Every figure here reconciles with a raw event table (BR-AN1): "fraud
    attempts prevented" is a real count of verifications that resolved to
    TAMPERED or UNKNOWN_ISSUER (the platform genuinely caught something),
    never a modeled/estimated number. The by-day series and heatmap are
    bucketed in Python from one bounded raw-timestamp query rather than
    dialect-specific SQL date functions, so this stays portable across the
    SQLite (dev) and Postgres (prod) backends this app actually runs on.
    """
    now = utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    window_start = now - timedelta(days=30)

    institutions = {
        status: count
        for status, count in db.session.query(Institution.status, func.count(Institution.id))
        .group_by(Institution.status).all()
    }

    # Bounded raw fetch: verdict + timestamp for the last 30 days, capped —
    # this platform's real event volume is nowhere near the cap, so nothing
    # is silently dropped in practice; it exists as a safety ceiling.
    recent_rows = (
        db.session.query(VerificationLog.verdict, VerificationLog.created_at)
        .filter(VerificationLog.created_at >= window_start)
        .order_by(VerificationLog.created_at.desc())
        .limit(20_000)
        .all()
    )
    by_day: dict[str, int] = defaultdict(int)
    heatmap: dict[str, int] = defaultdict(int)  # "{weekday}-{hour}" -> count
    for verdict, at in recent_rows:
        by_day[at.date().isoformat()] += 1
        heatmap[f"{at.weekday()}-{at.hour}"] += 1

    day_series = []
    for i in range(13, -1, -1):
        d = (now - timedelta(days=i)).date().isoformat()
        day_series.append({"date": d, "count": by_day.get(d, 0)})

    recent_batches = (
        db.session.query(Batch, Institution.legal_name)
        .join(Institution, Institution.id == Batch.institution_id)
        .filter(Batch.status == "anchored")
        .order_by(Batch.anchored_at.desc())
        .limit(8).all()
    )
    recent_verifications = (
        db.session.query(VerificationLog, Certificate.cert_uid, Institution.legal_name)
        .join(Certificate, Certificate.id == VerificationLog.certificate_id)
        .join(Institution, Institution.id == Certificate.institution_id)
        .order_by(VerificationLog.created_at.desc())
        .limit(15).all()
    )

    return {
        "institutions": institutions,
        "users_total": db.session.query(func.count(User.id)).filter(User.deleted_at.is_(None)).scalar() or 0,
        "certificates_total": db.session.query(func.count(Certificate.id)).scalar() or 0,
        "certificates_live": db.session.query(func.count(Certificate.id))
            .filter(Certificate.status.in_(LIVE_CERT_STATES)).scalar() or 0,
        "batches_anchored": db.session.query(func.count(Batch.id)).filter_by(status="anchored").scalar() or 0,
        "batches_pending_approval": db.session.query(func.count(Batch.id))
            .filter_by(status="pending_approval").scalar() or 0,
        "kyb_pending": institutions.get("pending_kyb", 0),
        "verifications_total": db.session.query(func.count(VerificationLog.id)).scalar() or 0,
        "verifications_today": db.session.query(func.count(VerificationLog.id))
            .filter(VerificationLog.created_at >= today_start).scalar() or 0,
        "fraud_attempts_prevented": db.session.query(func.count(VerificationLog.id))
            .filter(VerificationLog.verdict.in_(FRAUD_VERDICTS)).scalar() or 0,
        "verifications_by_day": day_series,
        "verifications_heatmap": [
            {"weekday": int(key.split("-")[0]), "hour": int(key.split("-")[1]), "count": count}
            for key, count in heatmap.items()
        ],
        "recent_batches": [{
            "id": b.id, "name": b.name, "institution": name, "row_count": b.row_count,
            "anchored_at": b.anchored_at.isoformat() if b.anchored_at else None,
            "anchor_tx_hash": b.anchor_tx_hash,
        } for b, name in recent_batches],
        "recent_verifications": [{
            "cert_uid": cert_uid, "institution": name, "verdict": log.verdict,
            "channel": log.channel, "at": log.created_at.isoformat(),
        } for log, cert_uid, name in recent_verifications],
    }


def certificate_timeline(cert: Certificate) -> list[dict]:
    """Per-certificate lifecycle + verification counts (FR-REV-012/ANA-002)."""
    events = [
        {"event": h.event, "at": h.created_at.isoformat(), "reason": h.reason_code,
         "tx": h.chain_tx_hash}
        for h in cert.history.all()
    ]
    verification_count = db.session.query(func.count(VerificationLog.id)).filter_by(
        certificate_id=cert.id).scalar() or 0
    return events + [{"event": "verified", "count": verification_count}]
