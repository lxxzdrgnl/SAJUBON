"""채팅 에이전트 비즈니스 로직."""

from __future__ import annotations
import asyncio
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import CalcFailedException, LLMFailedException
from crud import chat as chat_crud
from db.models import ChatSession, ChatReport
from engine.handlers.calculate_saju import handle_calculate_saju
from llm.tools.saju_tools import extract_summary


async def create_chat_session(
    db: AsyncSession,
    user_id: int,
    birth_info: dict,
    checkpointer,
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
    await graph.aupdate_state(config, {"birth_info": birth_info, "saju_summary": saju_summary})

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
