"""리포트 생성·조회·공유 서비스 — 비즈니스 흐름 + 예외 변환 + 단일 commit."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import ForbiddenException, ReportNotFoundException
from crud import reports as reports_crud
from db.models import SajuReport
from llm.pipelines.saju_report import run_saju_report_full
from schemas.report import (
    ReportCreateRequest, ReportDetail, ReportSummary, ReportShareResponse,
)


# ─── 직렬화 헬퍼 ──────────────────────────────────────────────────────────────

def _profile_name(birth_input: dict) -> str:
    return birth_input.get("name") or ""


def _first_headline(tabs: list[dict]) -> str:
    if tabs:
        return tabs[0].get("headline", "")
    return ""


def _to_summary(report: SajuReport) -> ReportSummary:
    return ReportSummary(
        id=report.id,
        first_headline=_first_headline(report.tabs),
        profile_name=_profile_name(report.birth_input),
        request_topics=report.request_topics,
        created_at=report.created_at.isoformat(),
    )


def _to_detail(report: SajuReport, *, mask_birth: bool = False) -> ReportDetail:
    birth_input = dict(report.birth_input)
    if mask_birth:
        birth_input["birth_date"] = None
        birth_input["birth_time"] = None
    return ReportDetail(
        id=report.id,
        first_headline=_first_headline(report.tabs),
        profile_name=_profile_name(report.birth_input),
        request_topics=report.request_topics,
        created_at=report.created_at.isoformat(),
        birth_input=birth_input,
        language=report.language,
        tabs=report.tabs,
        year_flow=report.year_flow,
        dae_un_analysis=report.dae_un_analysis,
    )


# ─── 유스케이스 ───────────────────────────────────────────────────────────────

async def create_report(
    db: AsyncSession,
    user_id: int,
    req: ReportCreateRequest,
) -> ReportDetail:
    """리포트 생성: 일일 한도 검사 → 파이프라인 2회 → 저장(단일 commit)."""
    # 1. 일일 한도 (429)
    limit = settings.report_daily_limit
    if limit is not None:
        used = await reports_crud.count_today(db, user_id)
        if used >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"하루 리포트 생성 한도({limit}개)를 초과했습니다. 내일 다시 시도해주세요.",
            )

    b = req.birth_input

    # 2~3. 본 리포트(Writer)와 올해의 흐름(UnFlow)을 병렬 생성 — saju·RAG는 1회만.
    saju, writer_output, un_flow = await run_saju_report_full(
        birth_date=b.birth_date,
        birth_time=b.birth_time,
        gender=b.gender,
        calendar=b.calendar,
        is_leap_month=b.is_leap_month,
        concern=req.request_topics,
        birth_longitude=b.birth_longitude,
        birth_utc_offset=b.birth_utc_offset,
    )

    # 4. 저장 (birth_input은 입력 원본 + name 보존)
    birth_input = b.model_dump()
    report = await reports_crud.insert_report(
        db,
        user_id=user_id,
        profile_id=req.profile_id,
        birth_input=birth_input,
        request_topics=req.request_topics,
        language=req.language,
        tabs=[t.model_dump() for t in writer_output.tabs],
        year_flow=un_flow.year_flow.model_dump(),
        dae_un_analysis=un_flow.dae_un_analysis.model_dump(),
    )
    await db.commit()
    await db.refresh(report)

    return _to_detail(report)


async def list_reports(db: AsyncSession, user_id: int) -> list[ReportSummary]:
    rows = await reports_crud.list_reports(db, user_id)
    return [_to_summary(r) for r in rows]


async def get_report(db: AsyncSession, report_id: int, user_id: int) -> ReportDetail:
    report = await reports_crud.get_report(db, report_id)
    if not report:
        raise ReportNotFoundException(str(report_id))
    if report.user_id != user_id:
        raise ForbiddenException()
    return _to_detail(report)


async def share_report(
    db: AsyncSession,
    report_id: int,
    user_id: int,
    mask_birth: bool,
) -> ReportShareResponse:
    report = await reports_crud.get_report(db, report_id)
    if not report:
        raise ReportNotFoundException(str(report_id))
    if report.user_id != user_id:
        raise ForbiddenException()

    share = await reports_crud.create_share(db, report_id, mask_birth)
    return ReportShareResponse(
        share_token=share.share_token,
        share_url=f"{settings.web_url}/share/report/{share.share_token}",
    )


async def get_shared_report(db: AsyncSession, share_token: str) -> ReportDetail:
    share = await reports_crud.get_share_by_token(db, share_token)
    if not share:
        raise ReportNotFoundException(share_token)
    report = await reports_crud.get_report(db, share.report_id)
    if not report:
        raise ReportNotFoundException(share_token)
    return _to_detail(report, mask_birth=share.mask_birth)
