"""
Audit service — fail-closed audit logging (BR-24) + notification helper.

`record()` is called INSIDE the same DB transaction as the audited mutation:
if the audit insert fails, the whole transaction rolls back — the action
cannot happen unlogged.
"""
from __future__ import annotations

from flask import g, has_request_context, request

from app.extensions import db
from app.models import ActivityLog, Notification


def record(action: str, resource_type: str, resource_id: str | None = None, *,
           before: dict | None = None, after: dict | None = None,
           institution_id: str | None = None) -> ActivityLog:
    """Appends an audit row bound to the current actor + trace context."""
    entry = ActivityLog(
        actor_type="user" if has_request_context() and getattr(g, "user_id", None) else "system",
        actor_id=getattr(g, "user_id", None) if has_request_context() else None,
        institution_id=institution_id or (getattr(g, "institution_id", None) if has_request_context() else None),
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        before=before,
        after=after,
        ip=(request.headers.get("X-Forwarded-For", request.remote_addr) if has_request_context() else None),
        trace_id=getattr(g, "trace_id", None) if has_request_context() else None,
    )
    db.session.add(entry)  # flushes/commits with the surrounding transaction
    return entry


def notify(user_id: str, category: str, title: str, body: str = "", payload: dict | None = None) -> None:
    """Creates an in-app notification (email fan-out handled by mail worker/mock)."""
    db.session.add(Notification(user_id=user_id, category=category, title=title, body=body, payload=payload))
