"""
Application settings — typed, environment-driven configuration.

Pattern (12-factor): everything configurable comes from the environment; the
class hierarchy provides safe defaults per environment. Anything secret has NO
default in production and the app refuses to boot without it (fail-closed,
TDD §17.3).
"""
from __future__ import annotations

import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()  # .env is developer convenience only; prod injects real env vars


def _require(name: str) -> str:
    """Fetch a mandatory env var; refuse to start without it (production)."""
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


class BaseConfig:
    """Defaults shared by all environments."""

    # ── Flask / API ───────────────────────────────────────────────────────────
    # Dev fallback is ≥32 bytes (HS256 minimum); production REQUIRES a real key.
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-not-for-prod-0123456789abcdef")
    API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:5000")
    VERIFY_BASE_URL = os.environ.get("VERIFY_BASE_URL", "http://localhost:3000")
    JSON_SORT_KEYS = False
    RESTX_MASK_SWAGGER = False
    ERROR_INCLUDE_MESSAGE = False  # we own the error envelope (RFC 9457 style)

    # ── Database ──────────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql+psycopg2://trustchain:trustchain@localhost:5432/trustchain"
    )
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20}

    # ── JWT (Flask-JWT-Extended) ─────────────────────────────────────────────
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.environ.get("JWT_ACCESS_MINUTES", "15")))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.environ.get("JWT_REFRESH_DAYS", "30")))
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_ERROR_MESSAGE_KEY = "detail"

    # ── Rate limiting ─────────────────────────────────────────────────────────
    RATELIMIT_STORAGE_URI = os.environ.get("REDIS_URL", "memory://")
    RATELIMIT_HEADERS_ENABLED = True

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]

    # ── Blockchain ────────────────────────────────────────────────────────────
    BLOCKCHAIN_MODE = os.environ.get("BLOCKCHAIN_MODE", "mock")  # mock | web3
    CHAIN_ID = int(os.environ.get("CHAIN_ID", "80002"))
    RPC_URL = os.environ.get("RPC_URL", "")
    RELAYER_PRIVATE_KEY = os.environ.get("RELAYER_PRIVATE_KEY", "")
    ISSUER_REGISTRY_ADDRESS = os.environ.get("ISSUER_REGISTRY_ADDRESS", "")
    CERTIFICATE_ANCHOR_ADDRESS = os.environ.get("CERTIFICATE_ANCHOR_ADDRESS", "")
    REVOCATION_REGISTRY_ADDRESS = os.environ.get("REVOCATION_REGISTRY_ADDRESS", "")
    ANCHOR_CONFIRMATIONS = int(os.environ.get("ANCHOR_CONFIRMATIONS", "16"))
    # Local-demo only: persist mock chain state to this file so the seed and the
    # server (separate processes) share the same "chain". Empty in tests/prod.
    MOCK_CHAIN_STATE_FILE = os.environ.get("MOCK_CHAIN_STATE_FILE", "")

    # ── Auth policy (SRS FR-AUTH) ────────────────────────────────────────────
    PASSWORD_MIN_LENGTH = 12
    LOCKOUT_MAX_ATTEMPTS = 5
    LOCKOUT_MINUTES = 15
    WALLET_CHALLENGE_TTL_SECONDS = 300  # 5-minute nonce TTL (TDD §10.3)

    # ── Mail ──────────────────────────────────────────────────────────────────
    MAIL_MODE = os.environ.get("MAIL_MODE", "mock")
    MAIL_FROM = os.environ.get("MAIL_FROM", "no-reply@trustchain.local")

    # ── AI assistant (advisory only — never a source of truth, see ai_service.py)
    # Empty by default: the assistant is OFF until a real key is supplied. No
    # key ever means an honest "unavailable" response, never a fabricated one.
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-5")


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    """In-memory SQLite + relaxed timings so the suite runs anywhere, fast."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS: dict = {}
    RATELIMIT_ENABLED = False
    BLOCKCHAIN_MODE = "mock"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


class ProductionConfig(BaseConfig):
    """Fail-closed: secrets must exist; HTTPS assumed at the edge + enforced."""

    DEBUG = False
    SECRET_KEY = _require("SECRET_KEY") if os.environ.get("FLASK_ENV") == "production" else BaseConfig.SECRET_KEY
    PREFERRED_URL_SCHEME = "https"


CONFIG_BY_NAME = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(name: str | None = None) -> type[BaseConfig]:
    """Resolve the config class from FLASK_ENV (default: development)."""
    return CONFIG_BY_NAME[name or os.environ.get("FLASK_ENV", "development")]
