"""비동기 job 서비스 — 생성+enqueue(활성 1개 규칙, redis 실패 503) + 상태 조회."""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import ForbiddenException, ReportNotFoundException
from crud import generation_jobs as jobs_crud
from schemas.jobs import JobStatusResponse


async def create_job_and_enqueue(
    db: AsyncSession,
    *,
    user_id: int,
    job_type: str,
    payload: dict,
    enqueue_fn: str,
    arq,
) -> int:
    """job 행 생성 후 arq enqueue. 이미 활성(pending/running) job이 있으면 그 id 반환.

    enqueue 실패(redis 다운 등)는 503으로 변환. job 행은 commit 전이라 롤백된다.
    호출측(서비스)이 commit한다.
    """
    active = await jobs_crud.get_active_for_user(db, user_id)
    if active is not None:
        return active.id

    job = await jobs_crud.create_job(db, user_id=user_id, job_type=job_type, payload=payload)
    await db.flush()
    try:
        await arq.enqueue_job(enqueue_fn, job.id)
    except Exception as e:  # noqa: BLE001 — redis 다운 등 enqueue 실패
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="생성 대기열에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
        ) from e
    return job.id


async def get_job_status(db: AsyncSession, job_id: int, user_id: int) -> JobStatusResponse:
    job = await jobs_crud.get_job(db, job_id)
    if job is None:
        raise ReportNotFoundException(str(job_id))
    if job.user_id != user_id:
        raise ForbiddenException()
    return JobStatusResponse(
        status=job.status, job_type=job.job_type, result_id=job.result_id, error=job.error
    )
