"""Consultation CRUD 헬퍼 — DB 조회·저장·404 처리."""

from __future__ import annotations
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Consultation


async def get_consultation_or_404(
    db: AsyncSession,
    consultation_id: int,
    user_id: int | None = None,
) -> Consultation:
    """
    Consultation을 조회한다.

    user_id를 전달하면 소유권까지 함께 필터링한다.
    존재하지 않으면 404를 반환한다.
    """
    query = select(Consultation).where(Consultation.id == consultation_id, Consultation.deleted_at.is_(None))
    if user_id is not None:
        query = query.where(Consultation.user_id == user_id)

    result = await db.execute(query)
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상담 기록을 찾을 수 없습니다.",
        )
    return row


async def create_consultation(db: AsyncSession, **kwargs) -> Consultation:
    """Consultation 레코드를 생성하고 반환한다."""
    obj = Consultation(**kwargs)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_user_consultations(
    db: AsyncSession,
    user_id: int,
    limit: int = 50,
) -> list[Consultation]:
    """유저의 상담 기록을 최신순으로 조회한다 (소프트 삭제 제외)."""
    result = await db.execute(
        select(Consultation)
        .where(Consultation.user_id == user_id, Consultation.deleted_at.is_(None))
        .order_by(Consultation.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_by_share_token(
    db: AsyncSession,
    token: uuid.UUID,
) -> Consultation | None:
    """공유 토큰으로 Consultation을 조회한다. 소프트 삭제된 건은 제외. 없으면 None을 반환한다."""
    result = await db.execute(
        select(Consultation).where(
            Consultation.share_token == token,
            Consultation.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def ensure_share_token(db: AsyncSession, row: Consultation) -> Consultation:
    """공유 토큰이 없으면 발급하고 저장한다. 이미 있으면 그대로 반환한다."""
    if not row.share_token:
        row.share_token = uuid.uuid4()
        await db.commit()
        await db.refresh(row)
    return row


async def soft_delete(db: AsyncSession, consultation_id: int, user_id: int) -> None:
    """본인 소유 상담 기록을 소프트 삭제한다 (단발 쓰기 — 내부 commit). 없으면 404, 타인 소유면 403."""
    row = await get_consultation_or_404(db, consultation_id, user_id)
    row.deleted_at = datetime.now(timezone.utc)
    await db.commit()
