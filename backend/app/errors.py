"""
Centralized error-handling framework.

Every error leaving the API is an RFC 9457-style problem document with a
STABLE machine code (SRS §S10 error catalog):

    { "status": 403, "code": "SELF_APPROVAL_FORBIDDEN",
      "title": "...", "detail": "...", "errors": [...], "traceId": "..." }

Handlers are fail-safe: unexpected exceptions become opaque 500s (no stack
traces to clients — OWASP) while the full trace goes to structured logs.
"""
from __future__ import annotations

import logging
import uuid

from flask import Flask, g, jsonify
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.exceptions import HTTPException

log = logging.getLogger("trustchain.errors")


class ApiError(Exception):
    """Base class for all deliberate API errors (custom exceptions derive)."""

    status = 400
    code = "BAD_REQUEST"
    title = "Bad request"

    def __init__(self, detail: str | None = None, *, errors: list | None = None):
        super().__init__(detail or self.title)
        self.detail = detail or self.title
        self.errors = errors or []


# ── Authentication / authorization ───────────────────────────────────────────
class AuthenticationError(ApiError):
    status, code, title = 401, "AUTHENTICATION_FAILED", "Authentication failed"


class AccountLockedError(ApiError):
    status, code, title = 423, "ACCOUNT_LOCKED", "Account temporarily locked"


class AuthorizationError(ApiError):
    status, code, title = 403, "FORBIDDEN", "You don't have access to this resource"


class SelfApprovalError(ApiError):
    status, code, title = 403, "SELF_APPROVAL_FORBIDDEN", "Maker cannot approve their own work"


class SameActorError(ApiError):
    status, code, title = 403, "SAME_ACTOR", "A different approver must confirm this action"


# ── Domain ────────────────────────────────────────────────────────────────────
class NotFoundError(ApiError):
    status, code, title = 404, "NOT_FOUND", "Resource not found"


class ConflictError(ApiError):
    status, code, title = 409, "CONFLICT", "Resource conflict"


class InvalidStateError(ApiError):
    status, code, title = 422, "INVALID_STATE", "Operation not allowed in the current state"


class RequestValidationError(ApiError):
    status, code, title = 400, "VALIDATION_ERROR", "Request validation failed"


# ── Blockchain ────────────────────────────────────────────────────────────────
class BlockchainError(ApiError):
    status, code, title = 502, "CHAIN_ERROR", "Blockchain interaction failed"


class ChainUnavailableError(ApiError):
    status, code, title = 503, "CHAIN_UNAVAILABLE", "Blockchain temporarily unavailable"


class WrongChainError(ApiError):
    status, code, title = 502, "WRONG_CHAIN", "Connected node is on an unexpected chain"


# ── AI assistant (advisory only) ─────────────────────────────────────────────
class AiUnavailableError(ApiError):
    status, code, title = 503, "AI_UNAVAILABLE", "The AI assistant isn't configured"


def _problem(status: int, code: str, title: str, detail: str = "", errors: list | None = None):
    """Builds the uniform problem+json envelope with the request trace id."""
    return (
        jsonify(
            {
                "status": status,
                "code": code,
                "title": title,
                "detail": detail or title,
                "errors": errors or [],
                "traceId": getattr(g, "trace_id", str(uuid.uuid4())),
            }
        ),
        status,
    )


def register_error_handlers(app: Flask) -> None:
    """Wire the centralized handlers onto the app (called by the factory)."""

    @app.errorhandler(ApiError)
    def handle_api_error(err: ApiError):
        return _problem(err.status, err.code, err.title, err.detail, err.errors)

    @app.errorhandler(ValidationError)
    def handle_marshmallow(err: ValidationError):
        # Field-level messages, shaped for form display (UI/UX spec §10.1).
        errors = [{"field": f, "messages": m} for f, m in err.normalized_messages().items()]
        return _problem(400, "VALIDATION_ERROR", "Request validation failed", errors=errors)

    @app.errorhandler(IntegrityError)
    def handle_integrity(err: IntegrityError):
        log.warning("integrity_error", exc_info=err)
        return _problem(409, "CONFLICT", "Resource conflict", "A uniqueness or reference rule was violated.")

    @app.errorhandler(SQLAlchemyError)
    def handle_db(err: SQLAlchemyError):
        log.error("database_error", exc_info=err)
        return _problem(500, "DATABASE_ERROR", "Database error", "A storage error occurred. Try again.")

    @app.errorhandler(HTTPException)
    def handle_http(err: HTTPException):
        return _problem(err.code or 500, err.name.upper().replace(" ", "_"), err.name, err.description or "")

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):  # pragma: no cover - safety net
        log.exception("unhandled_exception")
        return _problem(500, "INTERNAL_ERROR", "Something went wrong on our side",
                        "Contact support with the traceId.")
