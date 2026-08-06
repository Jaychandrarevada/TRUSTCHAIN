"""
Seed script — roles/permissions (the RBAC matrix as data), a platform admin,
a demo institution (KYB-approved → mock-chain registered), demo staff, and a
demo anchored batch. Idempotent: safe to re-run.

Usage:  python -m scripts.seed          (from backend/, venv active)
"""
from __future__ import annotations

from app import create_app
from app.auth.rbac import PERMISSIONS, ROLE_MATRIX
from app.auth.security import hash_password
from app.extensions import db
from app.models import Permission, Role, RolePermission, User, UserRole, utcnow


def seed_rbac() -> None:
    """Loads the permission matrix into Role/Permission tables (inspectable RBAC)."""
    perms: dict[str, Permission] = {}
    for key, description in PERMISSIONS.items():
        perm = Permission.query.filter_by(key=key).first() or Permission(key=key, description=description)
        db.session.add(perm)
        perms[key] = perm
    db.session.flush()

    for role_name, granted in ROLE_MATRIX.items():
        role = Role.query.filter_by(name=role_name).first() or Role(name=role_name)
        db.session.add(role)
        db.session.flush()
        for key in granted:
            exists = RolePermission.query.filter_by(role_id=role.id, permission_id=perms[key].id).first()
            if not exists:
                db.session.add(RolePermission(role_id=role.id, permission_id=perms[key].id))
    db.session.commit()
    print(f"RBAC seeded: {len(ROLE_MATRIX)} roles, {len(PERMISSIONS)} permissions")


def seed_user(email: str, name: str, role: str, institution_id: str | None = None) -> User:
    user = User.query.filter_by(email=email).first()
    if user is None:
        user = User(email=email, full_name=name, password_hash=hash_password("ChangeMe-Demo-123!"),
                    email_verified_at=utcnow())
        db.session.add(user)
        db.session.flush()
    role_row = Role.query.filter_by(name=role).first()
    if not UserRole.query.filter_by(user_id=user.id, role_id=role_row.id,
                                    institution_id=institution_id).first():
        db.session.add(UserRole(user_id=user.id, role_id=role_row.id, institution_id=institution_id))
    db.session.commit()
    return user


def main() -> None:
    app = create_app()
    with app.app_context():
        db.create_all()  # dev convenience; production uses Alembic migrations
        seed_rbac()

        admin = seed_user("admin@trustchain.local", "Platform Admin", "platform_admin")

        from app.services import certificate_service, institution_service
        from app.models import Institution
        from flask import g

        institution = Institution.query.filter_by(slug="demo-university").first()
        if institution is None:
            owner = seed_user("registrar@demo-university.local", "Dr. Meena Rao", "student")
            institution = institution_service.create_institution(
                owner, "Demo University", "demo-university", "university", "UGC", "UGC/2026/0001")
            seed_user("registrar@demo-university.local", "Dr. Meena Rao", "approver", institution.id)
            operator = seed_user("operator@demo-university.local", "Priya Nair", "operator", institution.id)
            g.user_id = admin.id  # audit attribution for the seed actions
            institution_service.approve_kyb(institution, admin.id)

            batch = certificate_service.create_batch(
                institution, "Demo Convocation 2026",
                [{"holder_name": f"Demo Student {i}", "holder_email": f"student{i}@example.com",
                  "program": "B.Tech Computer Science"} for i in range(1, 6)],
                operator.id)
            certificate_service.submit_batch(batch)
            certificate_service.approve_batch(batch, admin.id)
            print(f"Demo batch anchored: root={batch.merkle_root} tx={batch.anchor_tx_hash}")
            for cert in batch.certificates.all():
                print(f"  cert {cert.cert_uid} -> verify at /api/v1/verify/{cert.cert_uid}")

        # Second approver so two-person revocation works in the demo (revoke
        # needs initiate + confirm by DIFFERENT approvers). Idempotent; also
        # backfills existing databases on re-run.
        institution = Institution.query.filter_by(slug="demo-university").first()
        if institution:
            seed_user("approver2@demo-university.local", "Rahul Menon", "approver", institution.id)
            print("Second approver ready: approver2@demo-university.local")

        print("Seed complete. Demo password for all users: ChangeMe-Demo-123!")


if __name__ == "__main__":
    main()
