"""
Role-Based Access Control — the SRS §10.4 permission matrix as code + data.

Enforcement model (deny-by-default, SEC-AUTHZ-1):
  route decorator (@require_permission) → JWT identity → scoped roles →
  permission lookup. UI hints are cosmetic; THIS is the control.

The matrix below is the seed source of truth; it is loaded into the
Role/Permission tables so auditors can inspect effective permissions at
runtime (US-AU-004).
"""
from __future__ import annotations

from functools import wraps

from flask import g
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from app.errors import AuthorizationError

# ── Permission catalog ────────────────────────────────────────────────────────
PERMISSIONS = {
    "certificates:read": "View tenant certificates",
    "certificates:issue": "Draft/issue certificates and batches",
    "certificates:approve": "Approve batches (maker-checker)",
    "certificates:revoke": "Initiate/confirm revocation",
    "institution:manage": "Manage institution settings/members",
    "institution:kyb": "Decide KYB applications",
    "tenants:manage": "Suspend/restore tenants",
    "wallet:own": "Manage own credentials and shares",
    "verify:read": "Perform verifications / bulk verify",
    "analytics:read": "View analytics dashboards",
    "audit:read": "View audit logs",
    "settings:manage": "Manage platform settings",
    "notifications:own": "Read own notifications",
    "blockchain:ops": "Anchoring operations / chain admin",
}

# ── Role → permission matrix (SRS §10.4) ─────────────────────────────────────
ROLE_MATRIX: dict[str, set[str]] = {
    "student": {"wallet:own", "verify:read", "notifications:own"},
    "employer": {"verify:read", "analytics:read", "notifications:own"},
    "viewer": {"certificates:read", "analytics:read", "notifications:own"},
    "operator": {"certificates:read", "certificates:issue", "analytics:read", "notifications:own"},
    "approver": {"certificates:read", "certificates:approve", "certificates:revoke",
                 "analytics:read", "notifications:own"},
    "issuer_admin": {"certificates:read", "certificates:issue", "certificates:approve",
                     "certificates:revoke", "institution:manage", "analytics:read",
                     "audit:read", "notifications:own"},
    "owner": {"certificates:read", "certificates:issue", "certificates:approve",
              "certificates:revoke", "institution:manage", "analytics:read",
              "audit:read", "notifications:own"},
    "platform_admin": {"institution:kyb", "tenants:manage", "audit:read", "analytics:read",
                       "settings:manage", "blockchain:ops", "verify:read", "notifications:own"},
}


def permissions_for(roles: set[str]) -> set[str]:
    """Union of permissions across a user's effective roles."""
    granted: set[str] = set()
    for role in roles:
        granted |= ROLE_MATRIX.get(role, set())
    return granted


def require_permission(*needed: str):
    """
    Route decorator: valid JWT + at least one scoped role granting EVERY listed
    permission. Populates `g.user_id`, `g.roles`, `g.institution_id` for
    downstream handlers/services.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            g.user_id = get_jwt_identity()
            g.roles = set(claims.get("roles", []))
            g.institution_id = claims.get("institution_id")
            g.employer_id = claims.get("employer_id")

            granted = permissions_for(g.roles)
            missing = [p for p in needed if p not in granted]
            if missing:
                raise AuthorizationError(f"Missing permission(s): {', '.join(missing)}")
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def require_fresh_permission(*needed: str):
    """Step-up variant: additionally requires a FRESH token (recent login/MFA)
    for sensitive actions — revocation confirm, key ops (TDD §10.5)."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request(fresh=True)
            return require_permission(*needed)(fn)(*args, **kwargs)

        return wrapper

    return decorator
