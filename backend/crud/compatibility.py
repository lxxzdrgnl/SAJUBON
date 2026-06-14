"""CompatibilityReport, CompatibilityShare CRUD — DB 접근만."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import CompatibilityReport, CompatibilityShare


async def create_report(
    db: AsyncSession,
    *,
    user_id: int,
    person_a: dict,
    person_b: dict,
    request_topics: str | None,
    language: str,
    score: dict,
    synastry: dict,
    tabs: list,
) -> CompatibilityReport:
    """궁합 리포트를 추가하고 flush/refresh까지 한다. commit은 Service가 수행."""
    obj = CompatibilityReport(
        user_id=user_id,
        person_a=person_a,
        person_b=person_b,
        request_topics=request_topics,
        language=language,
        score=score,
        synastry=synastry,
        tabs=tabs,
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


async def get_report(db: AsyncSession, report_id: int) -> CompatibilityReport | None:
    """리포트 단건 (소유권 검사는 Service, 소프트 삭제 제외)."""
    result = await db.execute(
        select(CompatibilityReport).where(
            CompatibilityReport.id == report_id,
            CompatibilityReport.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def delete_report(db: AsyncSession, report_id: int, user_id: int) -> None:
    """본인 소유 궁합 리포트를 소프트 삭제한다 (단발 쓰기 — 내부 commit).

    없으면 404, 타인 소유면 403. CompatibilityShare는 그대로 보존 (공유 경로가 자동 404).
    """
    result = await db.execute(
        select(CompatibilityReport).where(CompatibilityReport.id == report_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="궁합 리포트를 찾을 수 없습니다.",
        )
    if row.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 궁합 리포트에 접근할 권한이 없습니다.",
        )
    row.deleted_at = datetime.now(timezone.utc)
    await db.commit()


async def list_reports(
    db: AsyncSession, user_id: int, limit: int = 50
) -> list[CompatibilityReport]:
    """user의 궁합 리포트 목록 (최신순, 소프트 삭제 제외)."""
    result = await db.execute(
        select(CompatibilityReport)
        .where(CompatibilityReport.user_id == user_id, CompatibilityReport.deleted_at.is_(None))
        .order_by(CompatibilityReport.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_share_by_token(db: AsyncSession, token: str) -> CompatibilityShare | None:
    result = await db.execute(
        select(CompatibilityShare).where(CompatibilityShare.share_token == token)
    )
    return result.scalar_one_or_none()


async def create_share(
    db: AsyncSession, report_id: int, mask_birth: bool
) -> CompatibilityShare:
    """공유 토큰을 생성한다 (단발 쓰기 — 내부 commit)."""
    obj = CompatibilityShare(
        report_id=report_id,
        share_token=uuid.uuid4(),
        mask_birth=mask_birth,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
