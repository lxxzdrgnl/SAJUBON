"""운세 스토리 서비스 — 조립·리라이트 위임 + 1일 1회 저장/재생.

흐름(공통 API 계약):
  - 로그인 + (user, birth_hash, date) 레코드 존재 → 저장본 그대로 반환
  - 로그인 + 없음 → 생성 + 저장
  - 게스트 → 생성만 (record_id=None)
"""

from __future__ import annotations

import hashlib
import json
from datetime import date as _date

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import ForbiddenException, ReportNotFoundException
from core.security import generate_share_token
from crud import daily_record as record_crud
from db.models import DailyFortuneRecord
from llm.pipelines.daily_story import build_daily_story
from schemas.daily import DailyFortuneRequest
from schemas.daily_story import (
    DailyRecordSummary,
    DailyShareRequest,
    DailyShareResponse,
    DailyStoryRequest,
    DailyStoryResponse,
)


def _birth_hash(birth_input: dict) -> str:
    """birth_input 정규화 문자열의 sha256 — 만세력별 1일 1회 키.

    name·target_date 등 사주에 영향 없는 필드는 제외하고 안정적으로 정규화한다.
    """
    keys = (
        "birth_date", "birth_time", "gender", "calendar",
        "is_leap_month", "birth_longitude", "birth_utc_offset",
    )
    normalized = {k: birth_input.get(k) for k in keys}
    blob = json.dumps(normalized, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def _to_engine_request(req: DailyStoryRequest) -> DailyFortuneRequest:
    """스토리 요청 → 엔진 daily 요청 (target_date = 사용자 로컬 날짜)."""
    b = req.birth_input
    return DailyFortuneRequest(
        birth_date=b.birth_date,
        birth_time=b.birth_time,
        gender=b.gender,
        calendar=b.calendar,
        is_leap_month=b.is_leap_month,
        birth_longitude=b.birth_longitude,
        birth_utc_offset=b.birth_utc_offset,
        target_date=req.date,
    )


def _profile_name(birth_input: dict) -> str:
    return birth_input.get("name") or ""


async def create_story(
    db: AsyncSession,
    user_id: int | None,
    req: DailyStoryRequest,
) -> DailyStoryResponse:
    """스토리 생성 — 로그인 시 1일 1회 저장, 게스트는 생성만."""
    birth_input = req.birth_input.model_dump()
    profile_name = _profile_name(birth_input)
    parsed_date = _date.fromisoformat(req.date)

    # 로그인 + 저장본 존재 → 그대로 반환 (1일 1회)
    if user_id is not None:
        birth_hash = _birth_hash(birth_input)
        existing = await record_crud.get_by_key(
            db, user_id=user_id, birth_hash=birth_hash, date=parsed_date
        )
        if existing is not None:
            return DailyStoryResponse(**existing.payload)

    # 생성 (엔진 조립 + 리라이트)
    story = await build_daily_story(
        _to_engine_request(req),
        profile_name=profile_name,
        date=req.date,
        language=getattr(req, "language", "ko"),
    )

    # 게스트 → 저장 안 함
    if user_id is None:
        return story

    # 로그인 → 저장 (record_id 채움, 단일 commit)
    record = await record_crud.insert(
        db,
        user_id=user_id,
        birth_hash=birth_hash,
        date=parsed_date,
        profile_name=profile_name,
        keyword=story.keyword,
        payload=story.model_dump(),
    )
    story.record_id = record.id
    # payload에도 record_id 반영 후 갱신
    record.payload = story.model_dump()
    await db.commit()
    await db.refresh(record)
    return DailyStoryResponse(**record.payload)


async def list_records(db: AsyncSession, user_id: int) -> list[DailyRecordSummary]:
    rows = await record_crud.list_for_user(db, user_id)
    return [
        DailyRecordSummary(
            id=r.id,
            date=r.date.isoformat(),
            profile_name=r.profile_name,
            keyword=r.keyword,
        )
        for r in rows
    ]


async def get_record(
    db: AsyncSession, record_id: int, user_id: int
) -> DailyStoryResponse:
    record = await record_crud.get_by_id(db, record_id)
    if not record:
        raise ReportNotFoundException(str(record_id))
    if record.user_id != user_id:
        raise ForbiddenException()
    return DailyStoryResponse(**record.payload)


def _share_url(token: str) -> str:
    return f"{settings.frontend_url}/share/fortune/{token}"


async def create_share(
    db: AsyncSession,
    user_id: int | None,
    req: DailyShareRequest,
) -> DailyShareResponse:
    """운세 스토리를 스냅샷+토큰으로 저장 → 공개 공유 링크 반환.

    - record_id 지정(소유자) → 그 레코드를 공유, 이미 토큰 있으면 재사용.
    - story 지정 → 스냅샷 신규 저장 (로그인=user_id, 게스트=null).
    """
    # 기존 레코드를 공유 (소유자 검증 + 토큰 재사용)
    if req.record_id is not None:
        record = await record_crud.get_by_id(db, req.record_id)
        if not record:
            raise ReportNotFoundException(str(req.record_id))
        if record.user_id != user_id:
            raise ForbiddenException()
        if record.share_token is None:
            record.share_token = generate_share_token()
            try:
                await db.commit()
            except IntegrityError:
                await db.rollback()
                record = await record_crud.get_by_id(db, req.record_id)
                record.share_token = generate_share_token()
                await db.commit()
            await db.refresh(record)
        return DailyShareResponse(
            share_token=record.share_token,
            share_url=_share_url(record.share_token),
        )

    # 스토리 스냅샷을 신규 저장 (토큰 충돌 시 1회 재생성)
    story = req.story
    payload = story.model_dump()
    birth_hash = _birth_hash(req.birth_input.model_dump()) if req.birth_input else ""
    parsed_date = _date.fromisoformat(story.date)
    record = None
    for _ in range(2):
        try:
            record = await record_crud.insert_share_snapshot(
                db,
                user_id=user_id,
                birth_hash=birth_hash,
                date=parsed_date,
                profile_name=story.profile_name,
                keyword=story.keyword,
                payload=payload,
                share_token=generate_share_token(),
            )
            break
        except IntegrityError:
            await db.rollback()
    await db.commit()
    return DailyShareResponse(
        share_token=record.share_token,
        share_url=_share_url(record.share_token),
    )


async def get_shared(db: AsyncSession, token: str) -> DailyStoryResponse:
    """공개 조회 — 저장된 스토리(payload)를 그대로 반환. 재계산 없음."""
    record = await record_crud.get_by_share_token(db, token)
    if not record:
        raise ReportNotFoundException(token)
    return DailyStoryResponse(**record.payload)
