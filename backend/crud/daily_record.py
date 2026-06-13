"""DailyFortuneRecord CRUD — DB 접근만."""

from __future__ import annotations

from datetime import date as _date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import DailyFortuneRecord


async def get_by_key(
    db: AsyncSession,
    *,
    user_id: int,
    birth_hash: str,
    date: _date,
) -> DailyFortuneRecord | None:
    """만세력별 1일 1회 키로 저장본 조회."""
    result = await db.execute(
        select(DailyFortuneRecord).where(
            DailyFortuneRecord.user_id == user_id,
            DailyFortuneRecord.birth_hash == birth_hash,
            DailyFortuneRecord.date == date,
        )
    )
    return result.scalar_one_or_none()


async def insert(
    db: AsyncSession,
    *,
    user_id: int,
    birth_hash: str,
    date: _date,
    profile_name: str,
    keyword: str,
    payload: dict,
) -> DailyFortuneRecord:
    """기록을 추가하고 flush/refresh까지 한다. commit은 Service가 수행."""
    obj = DailyFortuneRecord(
        user_id=user_id,
        birth_hash=birth_hash,
        date=date,
        profile_name=profile_name,
        keyword=keyword,
        payload=payload,
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


async def list_for_user(
    db: AsyncSession, user_id: int, limit: int = 50
) -> list[DailyFortuneRecord]:
    """user의 운세 기록 목록 (최신순)."""
    result = await db.execute(
        select(DailyFortuneRecord)
        .where(DailyFortuneRecord.user_id == user_id)
        .order_by(DailyFortuneRecord.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, record_id: int) -> DailyFortuneRecord | None:
    """기록 단건 (소유권 검사는 Service)."""
    result = await db.execute(
        select(DailyFortuneRecord).where(DailyFortuneRecord.id == record_id)
    )
    return result.scalar_one_or_none()


async def delete_record(db: AsyncSession, record_id: int, user_id: int) -> None:
    """본인 소유 운세 기록을 삭제한다 (단발 쓰기 — 내부 commit).

    없으면 404, 타인 소유면 403.
    """
    result = await db.execute(
        select(DailyFortuneRecord).where(DailyFortuneRecord.id == record_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="운세 기록을 찾을 수 없습니다.",
        )
    if row.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 운세 기록에 접근할 권한이 없습니다.",
        )
    await db.delete(row)
    await db.commit()
