"""비동기 생성 job 상태 조회."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import User
from dependencies.auth import get_current_user
from dependencies.db import get_db
from schemas.jobs import JobStatusResponse
from services import jobs as jobs_service

router = APIRouter(prefix="/api/jobs", tags=["생성 Job"])


@router.get("/{job_id}", response_model=JobStatusResponse, summary="job 상태 조회 (소유자)")
async def get_job(
    job_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobStatusResponse:
    return await jobs_service.get_job_status(db, job_id, user.id)
