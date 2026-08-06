"""
Identity models: User, Role, Permission, UserRole, Wallet, RefreshSession,
WalletChallenge.

Persona mapping (requested entities → rows):
- Student       = User with role 'student' (holder)
- Administrator = User with role 'platform_admin'
- Institution staff / employer members = User + scoped UserRole
RBAC is data-driven (Role/Permission tables, seeded with the SRS §10.4 matrix)
so the permission matrix is inspectable and auditable at runtime.
"""
from __future__ import annotations

from app.extensions import db
from app.models.base import BaseModel, SoftDeleteMixin, UTCDateTime, new_uuid, utcnow


class User(BaseModel, SoftDeleteMixin):
    __tablename__ = "users"

    email = db.Column(db.String(320), nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=True)  # null = OTP/wallet-only account
    full_name = db.Column(db.String(200), nullable=False, default="")
    status = db.Column(db.String(16), nullable=False, default="active")  # active|locked|deleted
    email_verified_at = db.Column(UTCDateTime(), nullable=True)
    locale = db.Column(db.String(12), nullable=False, default="en")

    # Account lockout (FR-AUTH-009)
    failed_attempts = db.Column(db.Integer, nullable=False, default=0)
    locked_until = db.Column(UTCDateTime(), nullable=True)

    roles = db.relationship("UserRole", back_populates="user", lazy="selectin")
    wallets = db.relationship("Wallet", back_populates="user", lazy="selectin")

    __table_args__ = (
        # Soft-delete-aware uniqueness (partial index in PG; plain unique in SQLite tests
        # is acceptable because tests never soft-delete-then-recreate).
        db.Index("ix_users_email_active", "email", unique=True, sqlite_where=db.text("deleted_at IS NULL"),
                 postgresql_where=db.text("deleted_at IS NULL")),
    )

    def role_names(self, institution_id: str | None = None) -> set[str]:
        """Effective role names, optionally scoped to a tenant."""
        names = set()
        for ur in self.roles:
            if ur.institution_id is None or ur.institution_id == institution_id:
                names.add(ur.role.name)
        return names


class Role(BaseModel):
    """Named role (seeded): student, employer, viewer, operator, approver,
    issuer_admin, owner, platform_admin."""

    __tablename__ = "roles"
    name = db.Column(db.String(40), nullable=False, unique=True)
    description = db.Column(db.String(200), nullable=False, default="")
    permissions = db.relationship("Permission", secondary="role_permissions", lazy="selectin")


class Permission(BaseModel):
    """Fine-grained permission key, e.g. 'certificates:issue' (SRS §10.4)."""

    __tablename__ = "permissions"
    key = db.Column(db.String(64), nullable=False, unique=True)
    description = db.Column(db.String(200), nullable=False, default="")


class RolePermission(db.Model):
    """Role ⇄ Permission join (the permission matrix, as data)."""

    __tablename__ = "role_permissions"
    role_id = db.Column(db.String(36), db.ForeignKey("roles.id", ondelete="RESTRICT"), primary_key=True)
    permission_id = db.Column(db.String(36), db.ForeignKey("permissions.id", ondelete="RESTRICT"), primary_key=True)


class UserRole(BaseModel):
    """Role grant, optionally scoped to an institution or employer org."""

    __tablename__ = "user_roles"
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    role_id = db.Column(db.String(36), db.ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    institution_id = db.Column(db.String(36), db.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=True)
    employer_id = db.Column(db.String(36), db.ForeignKey("employers.id", ondelete="RESTRICT"), nullable=True)

    user = db.relationship("User", back_populates="roles")
    role = db.relationship("Role", lazy="joined")

    __table_args__ = (
        db.UniqueConstraint("user_id", "role_id", "institution_id", "employer_id", name="uq_user_role_scope"),
        db.Index("ix_user_roles_user", "user_id"),
    )


class Wallet(BaseModel):
    """Linked external wallet (BYO-DID, TDD §10.3). Read/sign-message only —
    never used to pay gas; the relayer owns all transactions."""

    __tablename__ = "wallets"
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    address = db.Column(db.String(42), nullable=False, unique=True)  # EIP-55 checksummed
    chain_id = db.Column(db.Integer, nullable=False)
    linked_at = db.Column(UTCDateTime(), nullable=False, default=utcnow)

    user = db.relationship("User", back_populates="wallets")
    __table_args__ = (db.Index("ix_wallets_user", "user_id"),)


class WalletChallenge(BaseModel):
    """Single-use, 5-min-TTL nonce for MetaMask signature login (replay-safe)."""

    __tablename__ = "wallet_challenges"
    address = db.Column(db.String(42), nullable=False, index=True)
    nonce = db.Column(db.String(36), nullable=False, unique=True, default=new_uuid)
    origin = db.Column(db.String(200), nullable=False)
    expires_at = db.Column(UTCDateTime(), nullable=False)
    used_at = db.Column(UTCDateTime(), nullable=True)  # tombstone after use


class RefreshSession(BaseModel):
    """Server-side refresh-token registry: rotation + family revocation on
    reuse detection (SEC-JWT-2). One row per issued refresh token."""

    __tablename__ = "refresh_sessions"
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    jti = db.Column(db.String(36), nullable=False, unique=True)
    family_id = db.Column(db.String(36), nullable=False, index=True)  # rotation lineage
    expires_at = db.Column(UTCDateTime(), nullable=False)
    rotated_at = db.Column(UTCDateTime(), nullable=True)   # set when superseded
    revoked_at = db.Column(UTCDateTime(), nullable=True)

    __table_args__ = (db.Index("ix_refresh_user", "user_id"),)
