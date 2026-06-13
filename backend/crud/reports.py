"""SajuReport, ReportShare CRUD — DB 접근만."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import SajuReport, ReportShare


async def count_today(db: AsyncSession, user_id: int) -> int:
    """오늘(UTC) user가 생성한 리포트 수."""
    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(func.count())
        .select_from(SajuReport)
        .where(
            SajuReport.user_id == user_id,
            func.date(SajuReport.created_at) == today,
        )
    )
    return result.scalar_one()


async def insert_report(
    db: AsyncSession,
    *,
    user_id: int,
    profile_id: int | None,
    birth_input: dict,
    request_topics: str | None,
    language: str,
    tabs: list,
    year_flow: dict,
    dae_un_analysis: dict,
) -> SajuReport:
    """리포트를 추가하고 flush/refresh까지 한다. commit은 Service가 수행."""
    obj = SajuReport(
        user_id=user_id,
        profile_id=profile_id,
        birth_input=birth_input,
        request_topics=request_topics,
        language=language,
        tabs=tabs,
        year_flow=year_flow,
        dae_un_analysis=dae_un_analysis,
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


async def list_reports(db: AsyncSession, user_id: int, limit: int = 50) -> list[SajuReport]:
    """user의 리포트 목록 (최신순)."""
    result = await db.execute(
        select(SajuReport)
        .where(SajuReport.user_id == user_id)
        .order_by(SajuReport.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_report(db: AsyncSession, report_id: int) -> SajuReport | None:
    """리포트 단건 (소유권 검사는 Service)."""
    result = await db.execute(select(SajuReport).where(SajuReport.id == report_id))
    return result.scalar_one_or_none()


async def delete_report(db: AsyncSession, report_id: int, user_id: int) -> None:
    """본인 소유 리포트를 삭제한다 (단발 쓰기 — 내부 commit).

    없으면 404, 타인 소유면 403.
    """
    result = await db.execute(select(SajuReport).where(SajuReport.id == report_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="리포트를 찾을 수 없습니다.",
        )
    if row.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 리포트에 접근할 권한이 없습니다.",
        )
    await db.execute(delete(ReportShare).where(ReportShare.report_id == report_id))
    await db.delete(row)
    await db.commit()


async def get_share_by_token(db: AsyncSession, token: str) -> ReportShare | None:
    result = await db.execute(
        select(ReportShare).where(ReportShare.share_token == token)
    )
    return result.scalar_one_or_none()


async def create_share(db: AsyncSession, report_id: int, mask_birth: bool) -> ReportShare:
    """공유 토큰을 생성한다 (단발 쓰기 — 내부 commit)."""
    obj = ReportShare(
        report_id=report_id,
        share_token=uuid.uuid4(),
        mask_birth=mask_birth,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
