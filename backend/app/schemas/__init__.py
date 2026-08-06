"""
Marshmallow request schemas — the validation boundary (PART 8).

Every mutating endpoint validates its payload through one of these schemas
before any service code runs; unknown fields are REJECTED (RAISE) on
privileged endpoints (SEC-VAL-1). Validators cover email, wallet address,
certificate UID, institution slug, and generic input constraints.
"""
from __future__ import annotations

import re

from marshmallow import EXCLUDE, RAISE, Schema, ValidationError, fields, validate

# ── Reusable validators ───────────────────────────────────────────────────────

WALLET_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")
CERT_UID_RE = re.compile(r"^TC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$")
SLUG_RE = re.compile(r"^[a-z0-9-]{3,40}$")


def validate_wallet(value: str) -> None:
    if not WALLET_RE.match(value):
        raise ValidationError("Not a valid wallet address (0x + 40 hex chars).")


def validate_cert_uid(value: str) -> None:
    if not CERT_UID_RE.match(value):
        raise ValidationError("Certificate IDs look like TC-XXXX-XXXX-XXXX.")


class StrictSchema(Schema):
    """Privileged-endpoint base: unknown fields are rejected."""
    class Meta:
        unknown = RAISE


class LenientSchema(Schema):
    """Public-endpoint base: unknown fields ignored (forward compatibility)."""
    class Meta:
        unknown = EXCLUDE


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterSchema(StrictSchema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=12, max=200))
    full_name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    role = fields.String(load_default="student",
                         validate=validate.OneOf(["student", "employer"]))  # staff roles are invited, not self-served


class LoginSchema(StrictSchema):
    email = fields.Email(required=True)
    password = fields.String(required=True)


class EmailTokenSchema(StrictSchema):
    token = fields.String(required=True, validate=validate.Length(min=10, max=64))


class PasswordForgotSchema(StrictSchema):
    email = fields.Email(required=True)


class PasswordResetSchema(StrictSchema):
    token = fields.String(required=True)
    password = fields.String(required=True, validate=validate.Length(min=12, max=200))


class WalletChallengeSchema(StrictSchema):
    address = fields.String(required=True, validate=validate_wallet)


class WalletVerifySchema(StrictSchema):
    nonce = fields.String(required=True)
    signature = fields.String(required=True, validate=validate.Length(min=100, max=200))
    chain_id = fields.Integer(load_default=80002)


# ── Institutions ──────────────────────────────────────────────────────────────

class InstitutionCreateSchema(StrictSchema):
    legal_name = fields.String(required=True, validate=validate.Length(min=3, max=200))
    slug = fields.String(required=True, validate=validate.Regexp(SLUG_RE, error="3–40 chars: a–z, 0–9, hyphen."))
    institution_type = fields.String(load_default="university",
                                     validate=validate.OneOf(["university", "college", "certifier", "enterprise"]))
    accreditation_body = fields.String(load_default=None, allow_none=True)
    accreditation_ref = fields.String(load_default=None, allow_none=True)


class MemberAddSchema(StrictSchema):
    email = fields.Email(required=True)
    role = fields.String(required=True,
                         validate=validate.OneOf(["viewer", "operator", "approver", "issuer_admin", "owner"]))


class KybDecisionSchema(StrictSchema):
    reason = fields.String(load_default="", validate=validate.Length(max=2000))


class TenantStatusSchema(StrictSchema):
    status = fields.String(required=True, validate=validate.OneOf(["active", "suspended", "retired"]))


# ── Certificates ──────────────────────────────────────────────────────────────

class CertificateRowSchema(LenientSchema):
    holder_name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    holder_email = fields.Email(required=True)
    program = fields.String(required=True, validate=validate.Length(min=1, max=200))
    certificate_type = fields.String(load_default="degree")


class BatchCreateSchema(StrictSchema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    rows = fields.List(fields.Dict(), required=True, validate=validate.Length(min=1, max=50000))


class RevokeInitiateSchema(StrictSchema):
    reason_code = fields.String(required=True,
                                validate=validate.OneOf(["fraud", "error", "misconduct", "superseded", "holder_request"]))
    visibility = fields.String(load_default="public", validate=validate.OneOf(["public", "verifier", "private"]))


class ClaimSchema(StrictSchema):
    cert_uid = fields.String(required=True, validate=validate_cert_uid)
    holder_email = fields.Email(required=True)  # identity-field match (BR-05)


class ShareCreateSchema(StrictSchema):
    cert_uid = fields.String(required=True, validate=validate_cert_uid)
    disclosed_fields = fields.List(fields.String(), load_default=[])
    expires_in_days = fields.Integer(load_default=None, allow_none=True, validate=validate.Range(min=1, max=365))
    max_views = fields.Integer(load_default=None, allow_none=True, validate=validate.Range(min=1, max=10000))
    pin = fields.String(load_default=None, allow_none=True, validate=validate.Length(min=4, max=12))


class SupersedeSchema(StrictSchema):
    corrected_row = fields.Dict(required=True)


class FileVerifySchema(LenientSchema):
    cert_uid = fields.String(required=True, validate=validate_cert_uid)
    payload = fields.Dict(required=True)  # re-hashed against the anchored record


class SettingSchema(StrictSchema):
    key = fields.String(required=True, validate=validate.Length(min=3, max=80))
    value = fields.Raw(required=True)
    description = fields.String(load_default="")
