"""워커 태스크가 호출하는 실제 생성 로직.

각 함수는 자체 트랜잭션으로 running→done/failed 상태를 전이하고,
완료 시 notify_generation_done을 호출한다. 예외는 삼켜 job을 failed로 기록한다.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

import crud.chat as chat_crud
import crud.compatibility as compat_crud
import crud.reports as reports_crud
from crud import generation_jobs as jobs_crud
from llm.pipelines.compatibility_report import run_compatibility_report
from llm.pipelines.saju_report import run_saju_report_full
from schemas.compatibility import BirthInput, CompatibilityReportRequest
from services.compatibility import _score_to_dict, _synastry_to_dict
from services.notifications import notify_generation_done

logger = logging.getLogger(__name__)


async def run_saju_report_job(db: AsyncSession, job_id: int) -> None:
    job = await jobs_crud.get_job(db, job_id)
    if job is None or job.status not in ("pending", "running"):
        return
    await jobs_crud.set_status(db, job_id, "running")
    await db.commit()

    try:
        p = job.payload
        b = p["birth_input"]
        saju, writer_output, un_flow = await run_saju_report_full(
            birth_date=b["birth_date"],
            birth_time=b.get("birth_time"),
            gender=b["gender"],
            calendar=b.get("calendar", "solar"),
            is_leap_month=b.get("is_leap_month", False),
            concern=p.get("request_topics"),
            birth_longitude=b.get("birth_longitude"),
            birth_utc_offset=b.get("birth_utc_offset"),
            language=p.get("language", "ko"),
        )
        report = await reports_crud.insert_report(
            db,
            user_id=job.user_id,
            profile_id=p.get("profile_id"),
            birth_input=b,
            request_topics=p.get("request_topics"),
            language=p.get("language", "ko"),
            tabs=[t.model_dump() for t in writer_output.tabs],
            year_flow=un_flow.year_flow.model_dump(),
            dae_un_analysis=un_flow.dae_un_analysis.model_dump(),
        )
        await db.flush()
        await jobs_crud.set_status(db, job_id, "done", result_id=report.id)
        await db.refresh(job)
        await notify_generation_done(db, job)
        await db.commit()
    except Exception as e:  # noqa: BLE001
        await db.rollback()
        logger.exception("saju report job 실패 job_id=%s", job_id)
        await jobs_crud.set_status(db, job_id, "failed", error=str(e)[:500])
        await db.commit()


async def run_compatibility_job(db: AsyncSession, job_id: int) -> None:
    job = await jobs_crud.get_job(db, job_id)
    if job is None or job.status not in ("pending", "running"):
        return
    await jobs_crud.set_status(db, job_id, "running")
    await db.commit()

    try:
        p = job.payload
        if p.get("mode") == "session":
            session = await chat_crud.get_session_or_404(
                db, uuid.UUID(p["session_id"]), job.user_id
            )
            if not session.partner_info:
                raise ValueError("세션에 상대 사주가 첨부되어 있지 않습니다.")
            person_a = BirthInput(**session.birth_info)
            person_b = BirthInput(**session.partner_info)
            request_topics = p.get("request_topics")
            language = "ko"
        else:
            person_a = BirthInput(**p["person_a"])
            person_b = BirthInput(**p["person_b"])
            request_topics = p.get("request_topics")
            language = p.get("language", "ko")

        req = CompatibilityReportRequest(
            person_a=person_a, person_b=person_b,
            request_topics=request_topics, language=language,
        )
        score, synastry, tabs = await run_compatibility_report(req)
        report = await compat_crud.create_report(
            db,
            user_id=job.user_id,
            person_a=person_a.model_dump(),
            person_b=person_b.model_dump(),
            request_topics=request_topics,
            language=language,
            score=_score_to_dict(score),
            synastry=_synastry_to_dict(synastry),
            tabs=[t.model_dump() for t in tabs],
        )
        await db.flush()
        await jobs_crud.set_status(db, job_id, "done", result_id=report.id)
        await db.refresh(job)
        await notify_generation_done(db, job)
        await db.commit()
    except Exception as e:  # noqa: BLE001
        await db.rollback()
        logger.exception("compatibility job 실패 job_id=%s", job_id)
        await jobs_crud.set_status(db, job_id, "failed", error=str(e)[:500])
        await db.commit()
