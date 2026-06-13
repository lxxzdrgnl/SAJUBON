"""채팅 메시지 SSE 스트림 통합 테스트 (A3).

그래프·title LLM은 스텁 (실호출 금지). SSE 이벤트 시퀀스 계약과
title 1회성을 검증한다. DB는 로컬 postgres(5433).
"""

from __future__ import annotations

import json
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from langchain_core.messages import AIMessageChunk
from sqlalchemy import delete

import routers.chat as chat_router
import llm.pipelines.chat_title as chat_title_mod
from core.security import create_access_token
from db.models import ChatSession
from main import app
from llm.tools.saju_tools import REQUEST_PARTNER_SIGNAL, _envelope


# ── 스텁 그래프: astream_events가 canned 이벤트를 방출 ──

class _FakeGraph:
    def __init__(self, events):
        self._events = events

    async def astream_events(self, _input, config=None, version=None):
        for ev in self._events:
            yield ev


def _token(text):
    return {"event": "on_chat_model_stream", "data": {"chunk": AIMessageChunk(content=text)}}


def _tool_end(name, output):
    return {"event": "on_tool_end", "name": name, "data": {"output": output}}


@pytest.fixture(autouse=True)
def _stub_checkpointer():
    app.dependency_overrides[chat_router._get_checkpointer] = lambda: object()
    yield
    app.dependency_overrides.pop(chat_router._get_checkpointer, None)


@pytest.fixture(autouse=True)
def _stub_title(monkeypatch):
    async def _fake_title(first_message, first_response):
        return "이직 타이밍 상담"
    monkeypatch.setattr(chat_title_mod, "generate_chat_title", _fake_title)


@pytest.fixture
async def chat_session(test_sessionmaker, db_user):
    sid = uuid.uuid4()
    birth_info = {
        "birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male",
        "calendar": "solar", "is_leap_month": False,
    }
    async with test_sessionmaker() as s:
        s.add(ChatSession(id=sid, user_id=db_user.id, birth_info=birth_info))
        await s.commit()
    yield sid
    async with test_sessionmaker() as s:
        await s.execute(delete(ChatSession).where(ChatSession.id == sid))
        await s.commit()


def _client(token):
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://t", cookies={"access_token": token})


def _parse_sse(text: str) -> list[dict]:
    events = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("data: "):
            events.append(json.loads(line[len("data: "):]))
    return events


async def test_token_done_sequence_and_title(monkeypatch, db_user, chat_session):
    """기존 token/done 보존 + 첫 턴 후 title 이벤트."""
    events = [_token("당신은 "), _token("바위 같은 사람입니다.")]
    monkeypatch.setattr(chat_router, "build_chat_graph", lambda cp: _FakeGraph(events))

    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post(f"/api/chat/{chat_session}/message", json={"message": "이직 언제?"})
    assert r.status_code == 200
    parsed = _parse_sse(r.text)
    types = [e["type"] for e in parsed]

    assert types[0] == "token"
    assert "title" in types
    assert types[-1] == "done"
    title_ev = next(e for e in parsed if e["type"] == "title")
    assert title_ev["title"] == "이직 타이밍 상담"


async def test_tool_result_and_request_partner(monkeypatch, db_user, chat_session):
    """차트 tool → tool_result, request_partner tool → request_partner."""
    payload = {"dae_un_list": [{"ganji": "갑자"}]}
    events = [
        _tool_end("request_partner_profile", REQUEST_PARTNER_SIGNAL),
        _tool_end("get_dae_un", _envelope("대운입니다", payload)),
        _token("분석 결과입니다."),
    ]
    monkeypatch.setattr(chat_router, "build_chat_graph", lambda cp: _FakeGraph(events))

    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post(f"/api/chat/{chat_session}/message", json={"message": "궁합 봐줘"})
    parsed = _parse_sse(r.text)
    types = [e["type"] for e in parsed]

    assert "request_partner" in types
    tr = next(e for e in parsed if e["type"] == "tool_result")
    assert tr["tool"] == "get_dae_un"
    assert tr["payload"] == payload


async def test_title_generated_only_once(monkeypatch, db_user, chat_session, test_sessionmaker):
    """두 번째 메시지에는 title 이벤트가 없어야 한다."""
    events = [_token("첫 답변입니다.")]
    monkeypatch.setattr(chat_router, "build_chat_graph", lambda cp: _FakeGraph(events))
    token = create_access_token(db_user.id)

    async with _client(token) as c:
        r1 = await c.post(f"/api/chat/{chat_session}/message", json={"message": "질문1"})
        r2 = await c.post(f"/api/chat/{chat_session}/message", json={"message": "질문2"})

    t1 = [e["type"] for e in _parse_sse(r1.text)]
    t2 = [e["type"] for e in _parse_sse(r2.text)]
    assert "title" in t1
    assert "title" not in t2

    async with test_sessionmaker() as s:
        session = await s.get(ChatSession, chat_session)
        assert session.title == "이직 타이밍 상담"
