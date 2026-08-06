"""
Authentication API — /api/v1/auth/*

Swagger docs come from Flask-RESTX; request validation from Marshmallow
schemas (single source shared with services). Rate limits guard the
brute-forceable endpoints (SEC-VAL-3).
"""
from __future__ import annotations

from flask import request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from flask_restx import Namespace, Resource, fields as rx

from app.auth.rbac import require_permission
from app.extensions import limiter
from app.schemas import (
    EmailTokenSchema,
    LoginSchema,
    PasswordForgotSchema,
    PasswordResetSchema,
    RegisterSchema,
    WalletChallengeSchema,
    WalletVerifySchema,
)
from app.services import auth_service

ns = Namespace("auth", description="Authentication, tokens, and wallet login")

token_model = ns.model("TokenPair", {
    "access_token": rx.String, "refresh_token": rx.String,
    "token_type": rx.String(example="Bearer"), "roles": rx.List(rx.String),
})


@ns.route("/register")
class Register(Resource):
    decorators = [limiter.limit("10 per hour")]

    @ns.doc(description="Create an account (student/employer self-serve). Sends a mock verification email.")
    @ns.response(201, "Created")
    @ns.response(409, "EMAIL_TAKEN")
    def post(self):
        data = RegisterSchema().load(request.get_json(force=True))
        user = auth_service.register_user(data["email"], data["password"], data["full_name"], data["role"])
        return {"id": user.id, "email": user.email}, 201


@ns.route("/verify-email")
class VerifyEmail(Resource):
    @ns.response(204, "Verified")
    def post(self):
        data = EmailTokenSchema().load(request.get_json(force=True))
        auth_service.verify_email(data["token"])
        return "", 204


@ns.route("/login")
class Login(Resource):
    decorators = [limiter.limit("20 per minute")]

    @ns.doc(description="Password login with account lockout (5 failures → 15 min).")
    @ns.marshal_with(token_model)
    @ns.response(401, "AUTHENTICATION_FAILED")
    @ns.response(423, "ACCOUNT_LOCKED")
    def post(self):
        data = LoginSchema().load(request.get_json(force=True))
        return auth_service.login(data["email"], data["password"])


@ns.route("/token/refresh")
class Refresh(Resource):
    @jwt_required(refresh=True)
    @ns.doc(description="Rotate the refresh token. Reuse of a rotated token revokes the whole family.")
    @ns.marshal_with(token_model)
    def post(self):
        return auth_service.rotate_refresh(get_jwt_identity(), get_jwt()["jti"])


@ns.route("/logout")
class Logout(Resource):
    @jwt_required(refresh=True)
    @ns.response(204, "Logged out")
    def post(self):
        auth_service.logout(get_jwt()["jti"])
        return "", 204


@ns.route("/password/forgot")
class Forgot(Resource):
    decorators = [limiter.limit("5 per hour")]

    @ns.doc(description="Always returns 202 (anti-enumeration).")
    def post(self):
        data = PasswordForgotSchema().load(request.get_json(force=True))
        auth_service.request_password_reset(data["email"])
        return {"detail": "If that address exists, a reset email is on its way."}, 202


@ns.route("/password/reset")
class Reset(Resource):
    @ns.response(204, "Password updated; all sessions revoked")
    def post(self):
        data = PasswordResetSchema().load(request.get_json(force=True))
        auth_service.reset_password(data["token"], data["password"])
        return "", 204


# ── MetaMask wallet auth ─────────────────────────────────────────────────────

@ns.route("/wallet/challenge")
class WalletChallenge(Resource):
    decorators = [limiter.limit("30 per hour")]

    @ns.doc(description="Issue a single-use, 5-min signing challenge for a wallet address.")
    def post(self):
        data = WalletChallengeSchema().load(request.get_json(force=True))
        origin = request.headers.get("Origin", "unknown")
        return auth_service.wallet_challenge(data["address"], origin), 201


@ns.route("/wallet/login")
class WalletLogin(Resource):
    @ns.doc(description="Signature login for a PREVIOUSLY LINKED wallet (EIP-191).")
    @ns.marshal_with(token_model)
    def post(self):
        data = WalletVerifySchema().load(request.get_json(force=True))
        return auth_service.wallet_login(data["nonce"], data["signature"])


@ns.route("/wallet/link")
class WalletLink(Resource):
    method_decorators = [require_permission("wallet:own")]

    @ns.doc(description="Link a wallet to the authenticated account (challenge + signature).")
    def post(self):
        from flask import g
        data = WalletVerifySchema().load(request.get_json(force=True))
        wallet = auth_service.link_wallet(g.user_id, data["nonce"], data["signature"], data["chain_id"])
        return {"address": wallet.address, "chain_id": wallet.chain_id}, 201
