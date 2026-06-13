"""한줄 상담 서비스 — LLM 호출 + 데이터 가공 + DB 저장 위임."""

from __future__ import annotations
from typing import NamedTuple

from sqlalchemy.ext.asyncio import AsyncSession

from crud import consultation as consult_crud
from core.exceptions import AppException, CalcFailedException, LLMFailedException
from db.models import Consultation
from llm.pipelines.question import run_question_consultation
from schemas.question import ChartItem, QuestionRequest


class ConsultationResult(NamedTuple):
    """create_consultation_flow 반환값."""
    row:    Consultation
    charts: list[dict]
    more:   list[dict]


async def create_consultation_flow(
    db: AsyncSession,
    req: QuestionRequest,
    user_id: int | None,
) -> ConsultationResult:
    """
    한줄 상담의 전체 흐름을 실행한다.

    1. LLM 파이프라인 호출 (Engine → RAG → Writer)
    2. birth_input 조립 (저장용 스냅샷)
    3. DB 저장 위임 (crud.create_consultation)
    4. charts / more 반환 (DB 저장 안 함 — 런타임 계산값)

    예외 변환:
    - 엔진 ValueError → CalcFailedException (422)
    - LLM RuntimeError / 기타 → LLMFailedException (500)
    """
    try:
        result = await run_question_consultation(
            birth_date=req.birth_date,
            birth_time=req.birth_time,
            gender=req.gender,
            calendar=req.calendar,
            is_leap_month=req.is_leap_month,
            birth_longitude=req.birth_longitude,
            birth_utc_offset=req.birth_utc_offset,
            question=req.question,
        )
    except AppException:
        raise
    except ValueError as e:
        raise CalcFailedException(str(e)) from e
    except RuntimeError as e:
        raise LLMFailedException(str(e)) from e
    except Exception as e:
        raise LLMFailedException(str(e)) from e

    birth_input: dict = req.model_dump(exclude={"question", "category", "name"})
    if req.name:
        birth_input["name"] = req.name

    charts = result.get("charts", [])
    more = result.get("more", [])

    row = await consult_crud.create_consultation(
        db,
        user_id=user_id,
        birth_input=birth_input,
        question=req.question,
        category=result.get("category", "general"),
        headline=result["headline"],
        content=result["content"],
        charts={"charts": charts, "more": more},
    )
    return ConsultationResult(
        row=row,
        charts=charts,
        more=more,
    )
