"""궁합 리포트 생성·조회·공유 서비스 — 비즈니스 흐름 + 예외 변환 + 단일 commit."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import (
    CompatibilityReportNotFoundException,
    ForbiddenException,
    ValidationException,
)
from crud import chat as chat_crud
from crud import compatibility as compat_crud
from db.models import CompatibilityReport
from schemas.compatibility import (
    BirthInput,
    CompatibilityReportDetail,
    CompatibilityReportRequest,
    CompatibilityReportSummary,
    CompatibilityScore,
    CompatibilityShareResponse,
    CompatibilitySynastry,
)


# ─── 직렬화 헬퍼 ──────────────────────────────────────────────────────────────

def _score_to_dict(score: dict) -> dict:
    """check_compatibility 반환 dict → CompatibilityScore 직렬화 dict."""
    return CompatibilityScore(
        total=score.get("total_score", 0),
        day_pillar=score.get("day_pillar_score", 0),
        element_harmony=score.get("element_harmony_score", 0),
        branch_relation=score.get("branch_relation_score", 0),
        ten_gods=score.get("ten_gods_score", 0),
    ).model_dump()


def _synastry_to_dict(synastry: dict) -> dict:
    """synastry_for_report 반환 dict → CompatibilitySynastry 직렬화 dict."""
    return CompatibilitySynastry(**synastry).model_dump()


def _name(birth_input: dict) -> str | None:
    return birth_input.get("name")


def _to_summary(report: CompatibilityReport) -> CompatibilityReportSummary:
    return CompatibilityReportSummary(
        id=report.id,
        person_a_name=_name(report.person_a),
        person_b_name=_name(report.person_b),
        total_score=report.score.get("total", 0),
        request_topics=report.request_topics,
        created_at=report.created_at.isoformat(),
    )


def _birth_input(raw: dict, *, mask_birth: bool) -> BirthInput:
    """저장된 birth_input dict → BirthInput. mask_birth면 생년월일·시각을 가린다.

    마스킹 시 birth_date를 None으로 비워야 하는데 스키마상 필수 필드라
    model_construct로 검증을 건너뛴다 (parent는 인스턴스를 재검증하지 않음).
    """
    if mask_birth:
        masked = dict(raw)
        masked["birth_date"] = None
        masked["birth_time"] = None
        return BirthInput.model_construct(**masked)
    return BirthInput(**raw)


def _to_detail(
    report: CompatibilityReport, *, mask_birth: bool = False
) -> CompatibilityReportDetail:
    return CompatibilityReportDetail(
        id=report.id,
        person_a=_birth_input(report.person_a, mask_birth=mask_birth),
        person_b=_birth_input(report.person_b, mask_birth=mask_birth),
        score=CompatibilityScore(**report.score),
        synastry=CompatibilitySynastry(**report.synastry),
        tabs=report.tabs,
        request_topics=report.request_topics,
        language=report.language,
        created_at=report.created_at.isoformat(),
    )


# ─── 유스케이스 ───────────────────────────────────────────────────────────────

async def create_report(
    db: AsyncSession,
    user_id: int,
    req: CompatibilityReportRequest,
    arq,
) -> int:
    """궁합 생성 job 등록 → job_id."""
    from services import jobs as jobs_service

    payload = {
        "mode": "direct",
        "person_a": req.person_a.model_dump(),
        "person_b": req.person_b.model_dump(),
        "request_topics": req.request_topics,
        "language": req.language,
    }
    job_id = await jobs_service.create_job_and_enqueue(
        db, user_id=user_id, job_type="compatibility",
        payload=payload, enqueue_fn="generate_compatibility", arq=arq,
    )
    await db.commit()
    return job_id


async def create_from_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: int,
    arq,
    request_topics: str | None = None,
) -> int:
    """챗 세션 기반 궁합 생성 job 등록 → job_id."""
    from services import jobs as jobs_service

    # enqueue 전에 세션 소유권·상대 사주 첨부를 검증해 빠른 실패(404/400)로 응답한다.
    # (워커도 동일 검증을 하지만, 무효 요청에 job·큐 슬롯·활성-job 락을 낭비하지 않도록 앞당긴다.)
    session = await chat_crud.get_session_or_404(db, session_id, user_id)
    if not session.partner_info:
        raise ValidationException(
            "세션에 상대 사주가 첨부되어 있지 않습니다. 먼저 상대를 첨부하세요.",
            {"session_id": str(session_id)},
        )

    payload = {
        "mode": "session",
        "session_id": str(session_id),
        "request_topics": request_topics,
    }
    job_id = await jobs_service.create_job_and_enqueue(
        db, user_id=user_id, job_type="compatibility",
        payload=payload, enqueue_fn="generate_compatibility", arq=arq,
    )
    await db.commit()
    return job_id


async def list_reports(db: AsyncSession, user_id: int) -> list[CompatibilityReportSummary]:
    rows = await compat_crud.list_reports(db, user_id)
    return [_to_summary(r) for r in rows]


async def get_report(
    db: AsyncSession, report_id: int, user_id: int
) -> CompatibilityReportDetail:
    report = await compat_crud.get_report(db, report_id)
    if not report:
        raise CompatibilityReportNotFoundException(str(report_id))
    if report.user_id != user_id:
        raise ForbiddenException()
    return _to_detail(report)


async def share_report(
    db: AsyncSession,
    report_id: int,
    user_id: int,
    mask_birth: bool,
) -> CompatibilityShareResponse:
    report = await compat_crud.get_report(db, report_id)
    if not report:
        raise CompatibilityReportNotFoundException(str(report_id))
    if report.user_id != user_id:
        raise ForbiddenException()

    share = await compat_crud.create_share(db, report_id, mask_birth)
    return CompatibilityShareResponse(
        share_token=share.share_token,
        share_url=f"{settings.web_url}/compatibility/shared/{share.share_token}",
    )


async def get_shared_report(
    db: AsyncSession, share_token: str
) -> CompatibilityReportDetail:
    share = await compat_crud.get_share_by_token(db, share_token)
    if not share:
        raise CompatibilityReportNotFoundException(share_token)
    report = await compat_crud.get_report(db, share.report_id)
    if not report:
        raise CompatibilityReportNotFoundException(share_token)
    return _to_detail(report, mask_birth=share.mask_birth)
