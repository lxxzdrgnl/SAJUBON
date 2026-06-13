"""AI 10탭 리포트 생성·목록·공유 API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from crud import reports as reports_crud
from db.models import User
from dependencies.auth import get_current_user
from dependencies.db import get_db
from schemas.report import (
    ReportCreateRequest, ReportDetail, ReportSummary,
    ReportShareRequest, ReportShareResponse,
)
from services import reports as reports_service

router = APIRouter(prefix="/api/reports", tags=["AI 리포트"])
share_router = APIRouter(prefix="/api/share/reports", tags=["AI 리포트 공유"])


@router.post("", response_model=ReportDetail, status_code=status.HTTP_201_CREATED, summary="리포트 생성+저장")
async def create_report(
    body: ReportCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportDetail:
    return await reports_service.create_report(db, user.id, body)


@router.get("", response_model=list[ReportSummary], summary="내 리포트 목록")
async def list_reports(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ReportSummary]:
    return await reports_service.list_reports(db, user.id)


@router.get("/{report_id}", response_model=ReportDetail, summary="리포트 단건 (소유자)")
async def get_report(
    report_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportDetail:
    return await reports_service.get_report(db, report_id, user.id)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT, summary="리포트 삭제 (소유자)")
async def delete_report(
    report_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await reports_crud.delete_report(db, report_id, user.id)


@router.post("/{report_id}/share", response_model=ReportShareResponse, summary="공유 토큰 발급 (소유자)")
async def share_report(
    report_id: int,
    body: ReportShareRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportShareResponse:
    return await reports_service.share_report(db, report_id, user.id, body.mask_birth)


@share_router.get("/{share_token}", response_model=ReportDetail, summary="공유 리포트 열람 (비로그인)")
async def get_shared_report(
    share_token: str,
    db: AsyncSession = Depends(get_db),
) -> ReportDetail:
    return await reports_service.get_shared_report(db, share_token)
