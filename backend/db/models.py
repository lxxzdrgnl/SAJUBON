"""SQLAlchemy 모델."""

from __future__ import annotations
import uuid
from datetime import date, time, datetime, timezone
from sqlalchemy import String, DateTime, Date, Time, Integer, Boolean, Numeric, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id:              Mapped[int]        = mapped_column(Integer, primary_key=True)
    email:           Mapped[str]        = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider:        Mapped[str]        = mapped_column(String(20), default="local")
    social_id:       Mapped[str | None] = mapped_column(String(255), nullable=True)
    role:            Mapped[str]        = mapped_column(String(20), default="user")
    created_at:      Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=_utcnow)


class Profile(Base):
    __tablename__ = "profiles"

    id:            Mapped[int]         = mapped_column(Integer, primary_key=True)
    user_id:       Mapped[int]         = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name:          Mapped[str]         = mapped_column(String(50))
    birth_date:    Mapped[date]         = mapped_column(Date)
    birth_time:    Mapped[time | None] = mapped_column(Time, nullable=True)
    calendar:      Mapped[str]         = mapped_column(String(10), default="solar")
    gender:        Mapped[str]         = mapped_column(String(10))
    is_leap_month: Mapped[bool]        = mapped_column(Boolean, default=False)
    city:               Mapped[str | None]  = mapped_column(String(100), nullable=True)
    longitude:          Mapped[float | None] = mapped_column(Numeric(7, 4), nullable=True)
    is_representative:  Mapped[bool]         = mapped_column(Boolean, default=False, nullable=False)
    created_at:         Mapped[datetime]     = mapped_column(DateTime(timezone=True), default=_utcnow)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True)
    user_id:    Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str]      = mapped_column(Text, unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked:    Mapped[bool]     = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class DailyShare(Base):
    """오늘의 운세 공유 — 생년월일만 저장, 결과는 접근 시 재계산."""

    __tablename__ = "daily_shares"

    id:          Mapped[int]       = mapped_column(Integer, primary_key=True)
    share_token: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    birth_input: Mapped[dict]      = mapped_column(JSONB, nullable=False)
    created_at:  Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=_utcnow)


class SharedResult(Base):
    __tablename__ = "shared_results"

    id:            Mapped[int]         = mapped_column(Integer, primary_key=True)
    profile_id:    Mapped[int | None]  = mapped_column(Integer, ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    birth_input:   Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    share_token:   Mapped[uuid.UUID]   = mapped_column(UUID(as_uuid=True), unique=True, default=uuid.uuid4)
    calc_snapshot: Mapped[dict]        = mapped_column(JSONB)
    created_at:    Mapped[datetime]    = mapped_column(DateTime(timezone=True), default=_utcnow)


class Consultation(Base):
    """한줄 상담 저장."""

    __tablename__ = "consultations"

    id:          Mapped[int]            = mapped_column(Integer, primary_key=True)
    user_id:     Mapped[int | None]     = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    birth_input: Mapped[dict]           = mapped_column(JSONB, nullable=False)
    question:    Mapped[str]            = mapped_column(Text, nullable=False)
    category:    Mapped[str]            = mapped_column(String(20), nullable=False)
    headline:    Mapped[str]            = mapped_column(Text, nullable=False)
    content:     Mapped[str]            = mapped_column(Text, nullable=False)
    share_token: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), unique=True, nullable=True, default=None)
    created_at:  Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=_utcnow)


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id:               Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id:          Mapped[int]       = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title:            Mapped[str | None] = mapped_column(String(200), nullable=True)
    birth_info:       Mapped[dict]      = mapped_column(JSONB, nullable=False)
    created_at:       Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=_utcnow)
    last_message_at:  Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=_utcnow)


class ChatReport(Base):
    __tablename__ = "chat_reports"

    id:             Mapped[int]       = mapped_column(Integer, primary_key=True)
    session_id:     Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    summary:        Mapped[str]       = mapped_column(Text, nullable=False)
    key_insights:   Mapped[list]      = mapped_column(JSONB, nullable=False)
    advice:         Mapped[list]      = mapped_column(JSONB, nullable=False)
    topics_covered: Mapped[list]      = mapped_column(JSONB, nullable=False)
    created_at:     Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=_utcnow)
