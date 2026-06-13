"""채팅 상대 프로필 첨부 API 통합 테스트 (A2).

DB는 로컬 postgres(5433). 만세력 계산은 실제 엔진(빠름, LLM 아님).
세션은 checkpointer 없이 DB에 직접 생성해 lifespan 의존을 피한다.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from core.security import create_access_token
from db.models import ChatSession
from main import app


@pytest.fixture
async def chat_session(test_sessionmaker, db_user):
    """db_user 소유의 채팅 세션 1개 생성 후 정리."""
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


def _client(token=None):
    transport = ASGITransport(app=app)
    cookies = {"access_token": token} if token else None
    return AsyncClient(transport=transport, base_url="http://t", cookies=cookies)


_PARTNER_BODY = {
    "birth_date": "1992-07-21", "birth_time": "09:00", "gender": "female",
    "calendar": "solar", "is_leap_month": False, "name": "지민",
}


async def test_attach_partner_returns_name(db_user, chat_session, test_sessionmaker):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post(f"/api/chat/{chat_session}/partner", json=_PARTNER_BODY)
    assert r.status_code == 200, r.text
    assert r.json()["partner_name"] == "지민"

    # DB에 partner_info 저장 확인
    async with test_sessionmaker() as s:
        session = await s.get(ChatSession, chat_session)
        assert session.partner_info is not None
        assert session.partner_info["birth_date"] == "1992-07-21"
        assert session.partner_info["name"] == "지민"


async def test_attach_partner_default_name(db_user, chat_session):
    token = create_access_token(db_user.id)
    body = {k: v for k, v in _PARTNER_BODY.items() if k != "name"}
    async with _client(token) as c:
        r = await c.post(f"/api/chat/{chat_session}/partner", json=body)
    assert r.status_code == 200, r.text
    assert r.json()["partner_name"] == "상대방"


async def test_detach_partner(db_user, chat_session, test_sessionmaker):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        await c.post(f"/api/chat/{chat_session}/partner", json=_PARTNER_BODY)
        r = await c.delete(f"/api/chat/{chat_session}/partner")
    assert r.status_code == 204, r.text
    async with test_sessionmaker() as s:
        session = await s.get(ChatSession, chat_session)
        assert session.partner_info is None


async def test_attach_requires_auth(override_db, chat_session):
    async with _client() as c:
        r = await c.post(f"/api/chat/{chat_session}/partner", json=_PARTNER_BODY)
    assert r.status_code == 401


async def test_attach_foreign_session_404(db_user, chat_session):
    """다른 유저의 세션에 첨부 시도 → 404 (소유권 검증)."""
    other_token = create_access_token(db_user.id + 999999)
    async with _client(other_token) as c:
        r = await c.post(f"/api/chat/{chat_session}/partner", json=_PARTNER_BODY)
    assert r.status_code in (401, 404)
