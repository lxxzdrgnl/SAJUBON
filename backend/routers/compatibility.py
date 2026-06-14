"""궁합 리포트 생성·목록·조회·공유 API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import User
from dependencies.arq import get_arq
from dependencies.auth import get_current_user
from dependencies.db import get_db
from schemas.compatibility import (
    CompatibilityReportDetail,
    CompatibilityReportRequest,
    CompatibilityReportSummary,
    CompatibilityShareRequest,
    CompatibilityShareResponse,
)
from schemas.jobs import JobCreatedResponse
from services import compatibility as compatibility_service

router = APIRouter(prefix="/api/compatibility", tags=["궁합 리포트"])


@router.post("", response_model=JobCreatedResponse, status_code=status.HTTP_202_ACCEPTED, summary="궁합 생성 job 등록")
async def create_report(
    body: CompatibilityReportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    arq=Depends(get_arq),
) -> JobCreatedResponse:
    job_id = await compatibility_service.create_report(db, user.id, body, arq)
    return JobCreatedResponse(job_id=job_id)


@router.post("/from-session/{session_id}", response_model=JobCreatedResponse, status_code=status.HTTP_202_ACCEPTED, summary="세션 기반 궁합 생성 job")
async def create_report_from_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    arq=Depends(get_arq),
) -> JobCreatedResponse:
    job_id = await compatibility_service.create_from_session(db, session_id, user.id, arq)
    return JobCreatedResponse(job_id=job_id)


@router.get(
    "/shared/{share_token}",
    response_model=CompatibilityReportDetail,
    summary="공유 궁합 리포트 열람 (비로그인)",
)
async def get_shared_report(
    share_token: str,
    db: AsyncSession = Depends(get_db),
) -> CompatibilityReportDetail:
    return await compatibility_service.get_shared_report(db, share_token)


@router.get(
    "",
    response_model=list[CompatibilityReportSummary],
    summary="내 궁합 리포트 목록 (소유자)",
)
async def list_reports(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CompatibilityReportSummary]:
    return await compatibility_service.list_reports(db, user.id)


@router.get(
    "/{report_id}",
    response_model=CompatibilityReportDetail,
    summary="궁합 리포트 단건 (소유자)",
)
async def get_report(
    report_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompatibilityReportDetail:
    return await compatibility_service.get_report(db, report_id, user.id)


@router.post(
    "/{report_id}/share",
    response_model=CompatibilityShareResponse,
    summary="공유 토큰 발급 (소유자)",
)
async def share_report(
    report_id: int,
    body: CompatibilityShareRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompatibilityShareResponse:
    return await compatibility_service.share_report(db, report_id, user.id, body.mask_birth)
