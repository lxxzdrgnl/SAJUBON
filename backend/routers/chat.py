"""채팅 에이전트 라우터."""

from __future__ import annotations
import json
import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from sqlalchemy.ext.asyncio import AsyncSession

from crud import chat as chat_crud
from crud.profile import get_profile_or_404
from db.models import User
from dependencies.auth import get_current_user
from dependencies.db import get_db
from llm.pipelines.chat import build_chat_graph
from schemas.chat import (
    ChatSessionCreate, ChatSessionResponse,
    ChatMessageRequest, ChatHistoryResponse, ChatHistoryMessage,
    ChatReportResponse,
)
from services.chat import create_chat_session, generate_chat_report

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
            "birth_time": str(profile.birth_time) if profile.birth_time else None,
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
    config = {
        "configurable": {
            "thread_id": str(session_id),
            "birth_info": session.birth_info,
        }
    }

    async def event_stream():
        async for event in graph.astream_events(
            {"messages": [HumanMessage(content=req.message)]},
            config=config,
            version="v2",
        ):
            if event["event"] == "on_chat_model_stream":
                chunk = event["data"].get("chunk")
                if chunk and chunk.content:
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"
        await chat_crud.update_last_message_at(db, session_id)
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

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

    from langchain_core.messages import HumanMessage as HM, AIMessage as AM
    result = []
    for m in messages:
        role = "human" if isinstance(m, HM) else "ai"
        if hasattr(m, "content") and m.content:
            result.append(ChatHistoryMessage(role=role, content=m.content))

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
