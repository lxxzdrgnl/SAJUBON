"""ChatSession, ChatReport CRUD."""

from __future__ import annotations
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import ChatSessionNotFoundException
from db.models import ChatSession, ChatReport


async def create_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: int,
    birth_info: dict,
) -> ChatSession:
    session = ChatSession(
        id=session_id,
        user_id=user_id,
        birth_info=birth_info,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session_or_404(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: int,
) -> ChatSession:
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ChatSessionNotFoundException(str(session_id))
    return session


async def list_sessions(
    db: AsyncSession,
    user_id: int,
    limit: int = 20,
) -> list[ChatSession]:
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.last_message_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def update_last_message_at(
    db: AsyncSession,
    session_id: uuid.UUID,
) -> None:
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session:
        session.last_message_at = datetime.now(timezone.utc)
        await db.commit()


async def create_report(
    db: AsyncSession,
    session_id: uuid.UUID,
    summary: str,
    key_insights: list[str],
    advice: list[str],
    topics_covered: list[str],
) -> ChatReport:
    report = ChatReport(
        session_id=session_id,
        summary=summary,
        key_insights=key_insights,
        advice=advice,
        topics_covered=topics_covered,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


async def get_report_by_session(
    db: AsyncSession,
    session_id: uuid.UUID,
) -> ChatReport | None:
    result = await db.execute(
        select(ChatReport)
        .where(ChatReport.session_id == session_id)
        .order_by(ChatReport.created_at.desc())
    )
    return result.scalar_one_or_none()
