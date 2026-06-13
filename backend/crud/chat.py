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


async def delete_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: int,
) -> None:
    """세션 삭제 (소유자 확인). 단발 연산이라 여기서 commit."""
    session = await get_session_or_404(db, session_id, user_id)
    await db.delete(session)
    await db.commit()


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


async def get_title(db: AsyncSession, session_id: uuid.UUID) -> str | None:
    """세션의 현재 제목 조회 (없으면 None)."""
    result = await db.execute(
        select(ChatSession.title).where(ChatSession.id == session_id)
    )
    return result.scalar_one_or_none()


async def set_title(
    db: AsyncSession,
    session_id: uuid.UUID,
    title: str,
) -> bool:
    """세션 제목을 단발 갱신한다. 이미 제목이 있으면 덮어쓰지 않고 False를 반환."""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session and not session.title:
        session.title = title
        await db.commit()
        return True
    return False


def set_partner_info(session: ChatSession, partner_info: dict) -> None:
    """세션에 상대 사주를 첨부한다 (flush/commit은 Service가 담당)."""
    session.partner_info = partner_info


def clear_partner_info(session: ChatSession) -> None:
    """세션의 상대 사주를 제거한다 (flush/commit은 Service가 담당)."""
    session.partner_info = None


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
