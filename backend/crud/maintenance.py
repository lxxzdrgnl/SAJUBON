"""유지보수 CRUD — 소프트 삭제된 컨텐츠 하드 퍼지."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Consultation, CompatibilityReport, DailyFortuneRecord, SajuReport


async def purge_deleted_content(db: AsyncSession, retention_days: int) -> None:
    """deleted_at이 retention_days보다 오래된 행을 하드 삭제한다.

    SajuReport·CompatibilityReport의 공유 테이블은 ondelete=CASCADE FK로
    부모 삭제 시 자동 삭제된다.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    for model in (SajuReport, CompatibilityReport, Consultation, DailyFortuneRecord):
        await db.execute(
            delete(model).where(
                model.deleted_at.is_not(None),
                model.deleted_at < cutoff,
            )
        )
