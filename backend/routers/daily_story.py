"""운세 스토리 API — 생성(선택적 인증) + 마이 운세 기록."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from crud import daily_record as record_crud
from db.models import User
from dependencies.auth import get_current_user, get_optional_user
from dependencies.db import get_db
from schemas.daily_story import (
    DailyRecordSummary,
    DailyShareRequest,
    DailyShareResponse,
    DailyStoryRequest,
    DailyStoryResponse,
)
from services import daily_story as story_service

router = APIRouter(prefix="/api/daily", tags=["운세 스토리"])


@router.post("/story", response_model=DailyStoryResponse, summary="운세 스토리 생성 (게스트 허용)")
async def create_story(
    body: DailyStoryRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> DailyStoryResponse:
    return await story_service.create_story(db, user.id if user else None, body)


@router.post("/share", response_model=DailyShareResponse, status_code=status.HTTP_201_CREATED, summary="운세 공유 링크 생성 (게스트 허용)")
async def create_share(
    body: DailyShareRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> DailyShareResponse:
    return await story_service.create_share(db, user.id if user else None, body)


@router.get("/shared/{token}", response_model=DailyStoryResponse, summary="운세 공유 공개 조회 (인증 불필요, 재계산 없음)")
async def get_shared(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> DailyStoryResponse:
    return await story_service.get_shared(db, token)


@router.get("/records", response_model=list[DailyRecordSummary], summary="내 운세 기록")
async def list_records(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DailyRecordSummary]:
    return await story_service.list_records(db, user.id)


@router.get("/records/{record_id}", response_model=DailyStoryResponse, summary="운세 기록 재생 (소유자)")
async def get_record(
    record_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyStoryResponse:
    return await story_service.get_record(db, record_id, user.id)


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT, summary="운세 기록 삭제 (소유자)")
async def delete_record(
    record_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await record_crud.delete_record(db, record_id, user.id)
