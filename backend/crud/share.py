"""Share CRUD 헬퍼 — 사주 계산 결과 공유 링크 생성·조회."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import SharedResult


async def create_shared_result(
    db: AsyncSession,
    profile_id: int | None,
    birth_input: dict | None,
    calc_snapshot: dict,
) -> SharedResult:
    """SharedResult를 생성하고 반환한다."""
    obj = SharedResult(
        profile_id=profile_id,
        birth_input=birth_input,
        calc_snapshot=calc_snapshot,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_shared_result_or_404(db: AsyncSession, token: str) -> SharedResult:
    """공유 토큰으로 SharedResult를 조회한다. 없으면 404."""
    result = await db.execute(
        select(SharedResult).where(SharedResult.share_token == token)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="공유 링크를 찾을 수 없습니다.")
    return obj
