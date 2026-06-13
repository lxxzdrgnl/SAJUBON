"""채팅 에이전트 라우터."""

from __future__ import annotations
import uuid

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from sqlalchemy.ext.asyncio import AsyncSession

from crud import chat as chat_crud
from crud.profile import get_profile_or_404
from db.models import User
from dependencies.auth import get_current_user
from dependencies.db import get_db
from llm.pipelines.chat import build_chat_graph
from llm.chat_sse import map_stream_event, sse
from schemas.chat import (
    ChatSessionCreate, ChatSessionResponse,
    ChatMessageRequest, ChatHistoryResponse, ChatHistoryMessage,
    ChatReportResponse, PartnerAttachRequest, PartnerAttachResponse,
)
from services.chat import (
    create_chat_session, generate_chat_report,
    attach_partner, detach_partner, maybe_generate_title,
)

router = APIRouter(prefix="/api/chat", tags=["채팅 에이전트"])


def _get_checkpointer(request: Request):
    return request.app.state.checkpointer


@router.post("/session", response_model=ChatSessionResponse)
async def create_session(
    req: ChatSessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    checkpointer=Depends(_get_checkpointer),
):
    if req.profile_id:
        profile = await get_profile_or_404(db, req.profile_id, user.id)
        birth_info = {
            "birth_date": str(profile.birth_date),
            # time(23, 0) → "23:00" (str()는 "23:00:00"이라 엔진의 HH:MM 검증 실패)
            "birth_time": profile.birth_time.strftime("%H:%M") if profile.birth_time else None,
            "gender": profile.gender,
            "calendar": profile.calendar,
            "is_leap_month": profile.is_leap_month,
        }
    else:
        birth_info = {
            "birth_date": req.birth_date,
            "birth_time": req.birth_time,
            "gender": req.gender,
            "calendar": req.calendar,
            "is_leap_month": req.is_leap_month,
        }

    session = await create_chat_session(
        db=db, user_id=user.id, birth_info=birth_info, checkpointer=checkpointer
    )
    return session


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await chat_crud.list_sessions(db, user.id)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await chat_crud.delete_session(db, session_id, user.id)


@router.post("/{session_id}/partner", response_model=PartnerAttachResponse)
async def attach_partner_profile(
    session_id: uuid.UUID,
    req: PartnerAttachRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    partner_name = await attach_partner(
        db=db, session_id=session_id, user_id=user.id, req=req
    )
    return PartnerAttachResponse(partner_name=partner_name)


@router.delete("/{session_id}/partner", status_code=status.HTTP_204_NO_CONTENT)
async def remove_partner_profile(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await detach_partner(db=db, session_id=session_id, user_id=user.id)


@router.post("/{session_id}/message")
async def send_message(
    session_id: uuid.UUID,
    req: ChatMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    checkpointer=Depends(_get_checkpointer),
):
    session = await chat_crud.get_session_or_404(db, session_id, user.id)
    graph = build_chat_graph(checkpointer)
    configurable = {
        "thread_id": str(session_id),
        "birth_info": session.birth_info,
    }
    if session.partner_info:
        configurable["partner_info"] = session.partner_info
    config = {"configurable": configurable}

    async def event_stream():
        assistant_text = []
        async for event in graph.astream_events(
            {"messages": [HumanMessage(content=req.message)]},
            config=config,
            version="v2",
        ):
            mapped = map_stream_event(event)
            if mapped is None:
                continue
            if mapped["type"] == "token":
                assistant_text.append(mapped["content"])
            yield sse(mapped)

        await chat_crud.update_last_message_at(db, session_id)

        title = await maybe_generate_title(
            db=db,
            session_id=session_id,
            first_message=req.message,
            first_response="".join(assistant_text),
        )
        if title:
            yield sse({"type": "title", "title": title})

        yield sse({"type": "done"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/{session_id}/history", response_model=ChatHistoryResponse)
async def get_history(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    checkpointer=Depends(_get_checkpointer),
):
    await chat_crud.get_session_or_404(db, session_id, user.id)
    graph = build_chat_graph(checkpointer)
    config = {"configurable": {"thread_id": str(session_id)}}
    snapshot = await graph.aget_state(config)
    messages = snapshot.values.get("messages", []) if snapshot else []

    import json as _json
    from langchain_core.messages import HumanMessage as HM, AIMessage as AM, ToolMessage as TM
    from llm.tools.saju_tools import CHART_TOOL_NAMES

    result = []
    for m in messages:
        if isinstance(m, HM):
            if m.content:
                result.append(ChatHistoryMessage(role="human", content=m.content))
        elif isinstance(m, TM):
            # 차트 tool 결과만 포함 — search_rag 등 비차트 tool은 제외
            if getattr(m, "name", None) not in CHART_TOOL_NAMES:
                continue
            try:
                envelope = _json.loads(m.content)
                data = envelope.get("data")
                if data is None:
                    continue
                result.append(ChatHistoryMessage(
                    role="tool",
                    tool=m.name,
                    payload=data,
                ))
            except (ValueError, TypeError, AttributeError):
                continue
        elif isinstance(m, AM):
            # tool_calls-only 중간 AIMessage(content 없음)는 제외
            if m.content:
                result.append(ChatHistoryMessage(role="ai", content=m.content))

    return ChatHistoryResponse(session_id=session_id, messages=result)


@router.post("/{session_id}/report", response_model=ChatReportResponse)
async def create_report(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    checkpointer=Depends(_get_checkpointer),
):
    report = await generate_chat_report(
        db=db, session_id=session_id, user_id=user.id, checkpointer=checkpointer
    )
    return report
