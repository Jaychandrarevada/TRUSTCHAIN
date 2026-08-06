"""
Pytest fixtures — app in `testing` config (in-memory SQLite + MockChainClient),
seeded RBAC, and pre-built actors matching the production role model.

Auth in tests goes through the real login flow (register → verify email →
login) so token claims and lockout behavior are exercised, not bypassed.
"""
from __future__ import annotations

import pytest

from app import create_app
from app.auth.rbac import PERMISSIONS, ROLE_MATRIX
from app.auth.security import hash_password
from app.extensions import db as _db
from app.models import Institution, Permission, Role, RolePermission, User, UserRole, utcnow

PASSWORD = "Str0ng-Demo-Password!"


@pytest.fixture()
def app():
    app = create_app("testing")
    with app.app_context():
        _db.create_all()
        _seed_rbac()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def _seed_rbac() -> None:
    perms = {}
    for key, desc in PERMISSIONS.items():
        perm = Permission(key=key, description=desc)
        _db.session.add(perm)
        perms[key] = perm
    _db.session.flush()
    for name, granted in ROLE_MATRIX.items():
        role = Role(name=name)
        _db.session.add(role)
        _db.session.flush()
        for key in granted:
            _db.session.add(RolePermission(role_id=role.id, permission_id=perms[key].id))
    _db.session.commit()


def make_user(email: str, role: str, institution_id: str | None = None) -> User:
    """Creates a verified user with the given (optionally scoped) role."""
    user = User.query.filter_by(email=email).first()
    if user is None:
        user = User(email=email, full_name=email.split("@")[0],
                    password_hash=hash_password(PASSWORD), email_verified_at=utcnow())
        _db.session.add(user)
        _db.session.flush()
    role_row = Role.query.filter_by(name=role).first()
    _db.session.add(UserRole(user_id=user.id, role_id=role_row.id, institution_id=institution_id))
    _db.session.commit()
    return user


def login(client, email: str) -> dict:
    """Real login; returns Authorization headers for follow-up requests."""
    res = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert res.status_code == 200, res.get_json()
    return {"Authorization": f"Bearer {res.get_json()['access_token']}"}


@pytest.fixture()
def approved_institution(app, client):
    """A KYB-approved institution with operator + approver + platform admin,
    registered on the mock chain — the standard issuance context."""
    admin = make_user("admin@test.local", "platform_admin")
    institution = Institution(legal_name="Test University", slug="test-university",
                              accreditation_body="UGC", accreditation_ref="UGC/1")
    _db.session.add(institution)
    _db.session.commit()

    operator = make_user("operator@test.local", "operator", institution.id)
    approver = make_user("approver@test.local", "approver", institution.id)

    from app.services import institution_service
    institution_service.approve_kyb(institution, admin.id)

    return {"institution": institution, "admin": admin, "operator": operator, "approver": approver}
