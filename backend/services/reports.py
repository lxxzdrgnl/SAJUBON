"""리포트 생성·조회·공유 서비스 — 비즈니스 흐름 + 예외 변환 + 단일 commit."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import ForbiddenException, ReportNotFoundException
from crud import reports as reports_crud
from db.models import SajuReport
from engine.handlers.calculate_saju import handle_calculate_saju
from llm.tools.chart_payloads import (
    payload_palja, payload_strength, payload_ten_gods, payload_wuxing_balance,
    payload_sin_sal, payload_twelve_un_seong, payload_hap_chung, payload_dae_un,
)
from schemas.report import (
    ReportCreateRequest, ReportDetail, ReportSummary, ReportShareResponse,
)

# handle_calculate_saju가 받는 kwargs (birth_input에 섞인 name 등은 제외)
_SAJU_CALC_KEYS = (
    "birth_date", "birth_time", "gender", "calendar", "is_leap_month",
    "birth_longitude", "birth_utc_offset",
)


# ─── 직렬화 헬퍼 ──────────────────────────────────────────────────────────────

def _profile_name(birth_input: dict) -> str:
    return birth_input.get("name") or ""


def _first_headline(tabs: list[dict]) -> str:
    if tabs:
        return tabs[0].get("headline", "")
    return ""


def _build_charts(birth_input: dict) -> dict | None:
    """birth_input으로 원국을 재계산해 ToolCard용 차트 payload를 조립 (best-effort).

    DB 마이그레이션 없이 조회 시점에 계산한다. 계산 실패 시 None을 반환해
    리포트 본문(탭)은 깨지지 않게 한다. payload 키는 chat tool과 동일하다.
    """
    try:
        kwargs = {k: birth_input[k] for k in _SAJU_CALC_KEYS if k in birth_input}
        saju = handle_calculate_saju(**kwargs)
        return {
            "palja":            payload_palja(saju),
            "wuxing_balance":   payload_wuxing_balance(saju),
            "strength":         payload_strength(saju),
            "ten_gods":         payload_ten_gods(saju),
            "sin_sal":          payload_sin_sal(saju),
            "twelve_un_seong":  payload_twelve_un_seong(saju),
            "hap_chung":        payload_hap_chung(saju),
            "dae_un":           payload_dae_un(saju),
        }
    except Exception:
        return None


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
        charts=_build_charts(report.birth_input),
    )


# ─── 유스케이스 ───────────────────────────────────────────────────────────────

async def create_report(
    db: AsyncSession,
    user_id: int,
    req: ReportCreateRequest,
    arq,
) -> int:
    """리포트 생성 job 등록 → job_id 반환. 실제 생성은 워커가 수행."""
    from services import jobs as jobs_service

    limit = settings.report_daily_limit
    if limit is not None:
        used = await reports_crud.count_today(db, user_id)
        if used >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"하루 리포트 생성 한도({limit}개)를 초과했습니다. 내일 다시 시도해주세요.",
            )

    job_id = await jobs_service.create_job_and_enqueue(
        db,
        user_id=user_id,
        job_type="saju_report",
        payload=req.model_dump(),
        enqueue_fn="generate_saju_report",
        arq=arq,
    )
    await db.commit()
    return job_id


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
