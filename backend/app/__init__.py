"""
TrustChain backend — application factory.

Boot order: config → logging → extensions → DI container (`app.services`) →
middleware → error handlers → API namespaces (Swagger at /api/v1/docs).
"""
from __future__ import annotations

import logging
import sys

from flask import Flask
from flask_restx import Api

from app.config.settings import get_config
from app.errors import register_error_handlers
from app.extensions import cors, db, jwt, limiter, migrate
from app.middleware.request_context import register_request_context


def _configure_logging(app: Flask) -> None:
    """Structured-ish stdout logging (JSON logging via gunicorn config in prod)."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s"))
    root = logging.getLogger()
    if not root.handlers:
        root.addHandler(handler)
    root.setLevel(logging.DEBUG if app.debug else logging.INFO)


def create_app(env: str | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(get_config(env))
    _configure_logging(app)

    # ── Extensions ────────────────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    cors.init_app(app, origins=app.config.get("CORS_ORIGINS") or "*",
                  supports_credentials=False)  # Bearer tokens → no cookies → no CSRF surface

    # ── DI container (DIP): services resolve infrastructure here ─────────────
    from app.blockchain.client import make_chain_client
    app.services = {"chain": make_chain_client(app.config)}

    # ── Cross-cutting middleware + error envelope ─────────────────────────────
    register_request_context(app)
    register_error_handlers(app)

    # ── API v1 (Swagger under /api/v1/docs) ──────────────────────────────────
    api = Api(
        app, version="1.0", title="TrustChain API",
        description="Blockchain-based certificate verification platform — REST API v1",
        prefix="/api/v1", doc="/api/v1/docs",
        authorizations={"Bearer": {"type": "apiKey", "in": "header", "name": "Authorization",
                                   "description": "Format: Bearer <access_token>"}},
        security="Bearer",
    )
    from app.api.ai import ns as ai_ns
    from app.api.auth import ns as auth_ns
    from app.api.certificates import ns as certs_ns
    from app.api.verify import ns as verify_ns
    from app.api.wallet import ns as wallet_ns, ns_emp as employers_ns
    from app.api.ops import ns_admin, ns_inst, ns_misc, ns_ops

    api.add_namespace(auth_ns, path="/auth")
    api.add_namespace(ns_inst, path="/institutions")
    api.add_namespace(certs_ns, path="/certificates")
    api.add_namespace(verify_ns, path="/verify")
    api.add_namespace(wallet_ns, path="/wallet")
    api.add_namespace(employers_ns, path="/employers")
    api.add_namespace(ns_admin, path="/admin")
    api.add_namespace(ns_misc, path="/me")
    api.add_namespace(ai_ns, path="/ai")
    api.add_namespace(ns_ops, path="/")  # routes carry their own segments (audit-logs, health, …)

    # Import models so Alembic/`db.create_all` see every table.
    from app import models  # noqa: F401

    return app
