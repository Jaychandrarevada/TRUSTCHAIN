"""
Model base classes & mixins.

Conventions (TDD §5):
- UUID string PKs (portable across PostgreSQL and the SQLite test database).
- created_at/updated_at on everything (UTC).
- Soft delete via `deleted_at` (SoftDeleteMixin) — certificates are NEVER
  deleted (erasure = PII shred, BR-26); operational rows purge via jobs.
- Append-only tables (history, logs) simply never expose update/delete paths.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlalchemy.types import TypeDecorator

from app.extensions import db


class UTCDateTime(TypeDecorator):
    """
    Timezone-safe DateTime: PostgreSQL stores tz-aware natively; SQLite (tests)
    drops tzinfo on read — this decorator re-attaches UTC on the way out so
    every datetime in the app is ALWAYS timezone-aware (NFR-AUD-04).
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


def utcnow() -> datetime:
    """Timezone-aware UTC now (all timestamps are UTC — NFR-AUD-04)."""
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class TimestampMixin:
    created_at = db.Column(UTCDateTime(), nullable=False, default=utcnow)
    updated_at = db.Column(UTCDateTime(), nullable=False, default=utcnow, onupdate=utcnow)


class SoftDeleteMixin:
    """Soft delete: rows are marked, never removed; queries must filter."""

    deleted_at = db.Column(UTCDateTime(), nullable=True)

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        self.deleted_at = utcnow()


class BaseModel(db.Model, TimestampMixin):
    """Abstract base: UUID PK + timestamps."""

    __abstract__ = True
    id = db.Column(db.String(36), primary_key=True, default=new_uuid)
