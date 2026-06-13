"""채팅 에이전트 비즈니스 로직."""

from __future__ import annotations
import asyncio
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import CalcFailedException, LLMFailedException
from crud import chat as chat_crud
from crud.profile import get_profile_or_404
from db.models import ChatSession, ChatReport
from engine.handlers.calculate_saju import handle_calculate_saju
from llm.tools.saju_tools import extract_summary
from schemas.chat import PartnerAttachRequest


async def create_chat_session(
    db: AsyncSession,
    user_id: int,
    birth_info: dict,
    checkpointer,
    language: str = "ko",
) -> ChatSession:
    """
    1. 만세력 1회 계산
    2. saju_summary 추출
    3. LangGraph initial state 저장
    4. ChatSession DB 저장
    """
    try:
        saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    except ValueError as e:
        raise CalcFailedException(str(e)) from e

    saju_summary = extract_summary(saju)
    session_id = uuid.uuid4()

    from llm.pipelines.chat import build_chat_graph
    graph = build_chat_graph(checkpointer)
    config = {"configurable": {"thread_id": str(session_id), "birth_info": birth_info}}
    await graph.aupdate_state(config, {"birth_info": birth_info, "saju_summary": saju_summary, "language": language})

    return await chat_crud.create_session(
        db=db,
        session_id=session_id,
        user_id=user_id,
        birth_info=birth_info,
    )


async def generate_chat_report(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: int,
    checkpointer,
) -> ChatReport:
    """채팅 히스토리 전체 → 리포트 생성."""
    from llm.pipelines.chat import build_chat_graph
    from llm.pipelines.chat_report import run_chat_report

    session = await chat_crud.get_session_or_404(db, session_id, user_id)

    graph = build_chat_graph(checkpointer)
    config = {"configurable": {"thread_id": str(session_id)}}
    state_snapshot = await graph.aget_state(config)
    messages = state_snapshot.values.get("messages", []) if state_snapshot else []
    saju_summary = state_snapshot.values.get("saju_summary", {}) if state_snapshot else {}

    try:
        report_output = await run_chat_report(messages=messages, saju_summary=saju_summary)
    except Exception as e:
        raise LLMFailedException(str(e)) from e

    return await chat_crud.create_report(
        db=db,
        session_id=session_id,
        summary=report_output.summary,
        key_insights=report_output.key_insights,
        advice=report_output.advice,
        topics_covered=report_output.topics_covered,
    )


async def _resolve_partner_birth(
    db: AsyncSession,
    user_id: int,
    req: PartnerAttachRequest,
) -> dict:
    """프로필 ID 또는 직접 입력에서 상대 사주 birth_info(+name) 추출."""
    if req.profile_id:
        profile = await get_profile_or_404(db, req.profile_id, user_id)
        return {
            "birth_date": str(profile.birth_date),
            # time(23,0) → "23:00" — str()는 "23:00:00"이라 엔진의 HH:MM 검증 실패(422)
            "birth_time": profile.birth_time.strftime("%H:%M") if profile.birth_time else None,
            "gender": profile.gender,
            "calendar": profile.calendar,
            "is_leap_month": profile.is_leap_month,
            "name": req.name or profile.name,
        }
    return {
        "birth_date": req.birth_date,
        "birth_time": req.birth_time,
        "gender": req.gender,
        "calendar": req.calendar,
        "is_leap_month": req.is_leap_month,
        "name": req.name,
    }


async def attach_partner(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: int,
    req: PartnerAttachRequest,
) -> str:
    """세션에 상대 사주를 첨부하고 표시용 이름을 반환한다.

    1. 세션 소유 확인
    2. 프로필/직접입력 → 상대 birth_info 조립
    3. 만세력 계산으로 입력 유효성 검증
    4. session.partner_info 저장 (단일 commit)
    """
    session = await chat_crud.get_session_or_404(db, session_id, user_id)
    partner_info = await _resolve_partner_birth(db, user_id, req)

    calc_input = {k: v for k, v in partner_info.items() if k != "name"}
    try:
        await asyncio.to_thread(handle_calculate_saju, **calc_input)
    except ValueError as e:
        raise CalcFailedException(str(e)) from e

    chat_crud.set_partner_info(session, partner_info)
    await db.commit()

    return partner_info.get("name") or "상대방"


async def detach_partner(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: int,
) -> None:
    """세션에서 상대 사주를 제거한다."""
    session = await chat_crud.get_session_or_404(db, session_id, user_id)
    chat_crud.clear_partner_info(session)
    await db.commit()


async def maybe_generate_title(
    db: AsyncSession,
    session_id: uuid.UUID,
    first_message: str,
    first_response: str,
) -> str | None:
    """세션에 제목이 없으면 첫 턴 대화로 제목을 1회 생성·저장하고 반환한다.

    이미 제목이 있으면 None을 반환한다 (재생성 방지). LLM 실패는 조용히 무시한다.
    """
    from llm.pipelines.chat_title import generate_chat_title

    if await chat_crud.get_title(db, session_id):
        return None

    if not first_response.strip():
        return None

    try:
        title = await generate_chat_title(first_message, first_response)
    except Exception:
        return None

    saved = await chat_crud.set_title(db, session_id, title)
    return title if saved else None
