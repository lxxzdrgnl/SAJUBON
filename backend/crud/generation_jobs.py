"""generation_jobs DB 접근 — 멀티스텝 쓰기는 flush까지, commit은 호출측."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import GenerationJob

_ACTIVE = ("pending", "running")


async def create_job(
    db: AsyncSession, *, user_id: int, job_type: str, payload: dict
) -> GenerationJob:
    job = GenerationJob(user_id=user_id, job_type=job_type, status="pending", payload=payload)
    db.add(job)
    await db.flush()
    await db.refresh(job)
    return job


async def get_job(db: AsyncSession, job_id: int) -> GenerationJob | None:
    return await db.get(GenerationJob, job_id)


async def get_active_for_user(db: AsyncSession, user_id: int) -> GenerationJob | None:
    result = await db.execute(
        select(GenerationJob)
        .where(GenerationJob.user_id == user_id, GenerationJob.status.in_(_ACTIVE))
        .order_by(GenerationJob.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def set_status(
    db: AsyncSession,
    job_id: int,
    status: str,
    *,
    result_id: int | None = None,
    error: str | None = None,
) -> None:
    values: dict = {"status": status, "updated_at": datetime.now(timezone.utc)}
    if result_id is not None:
        values["result_id"] = result_id
    if error is not None:
        values["error"] = error
    await db.execute(update(GenerationJob).where(GenerationJob.id == job_id).values(**values))


async def sweep_stale(db: AsyncSession, stale_minutes: int) -> list[int]:
    """active 상태인데 updated_at이 stale_minutes 초과한 job을 failed 처리. id 목록 반환."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=stale_minutes)
    result = await db.execute(
        select(GenerationJob.id).where(
            GenerationJob.status.in_(_ACTIVE), GenerationJob.updated_at < cutoff
        )
    )
    ids = [row[0] for row in result.all()]
    if ids:
        await db.execute(
            update(GenerationJob)
            .where(GenerationJob.id.in_(ids))
            .values(status="failed", error="stale: worker timeout", updated_at=datetime.now(timezone.utc))
        )
    return ids


async def delete_old_jobs(db: AsyncSession, retention_days: int) -> int:
    """완료/실패 후 retention_days 지난 job 행 삭제. 삭제 건수 반환."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    result = await db.execute(
        delete(GenerationJob).where(
            GenerationJob.status.in_(("done", "failed")),
            GenerationJob.updated_at < cutoff,
        )
    )
    return result.rowcount or 0
