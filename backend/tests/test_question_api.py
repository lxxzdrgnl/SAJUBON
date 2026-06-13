"""한줄 상담 히스토리·공유 API 통합 테스트.

LLM·엔진 파이프라인은 호출하지 않는다. Consultation 레코드를 DB에 직접 삽입하고
목록(`/history`)·공유 토큰 발급(`/{id}/share`)·공개 조회(`/share/{token}`)·삭제를 검증한다.
DB는 로컬 postgres(5433).
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from core.security import create_access_token
from db.models import Consultation
from main import app


def _client(token=None):
    transport = ASGITransport(app=app)
    cookies = {"access_token": token} if token else None
    return AsyncClient(transport=transport, base_url="http://t", cookies=cookies)


async def _insert(test_sessionmaker, user_id, *, name="홍길동") -> int:
    async with test_sessionmaker() as s:
        row = Consultation(
            user_id=user_id,
            birth_input={"birth_date": "1990-03-15", "gender": "male", "name": name},
            question="올해 이직 운이 있을까요?",
            category="career",
            headline="변화의 파도가 발아래까지 왔습니다",
            content="정관격에 식상운이 들어온 지금...",
            charts={
                "charts": [{"tool": "get_wuxing_balance", "payload": {"wood": 2}}],
                "more": [{"tool": "get_dae_un", "payload": {"entries": []}}],
            },
        )
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row.id


@pytest.fixture
async def _cleanup(test_sessionmaker, db_user):
    yield
    async with test_sessionmaker() as s:
        await s.execute(delete(Consultation).where(Consultation.user_id == db_user.id))
        await s.commit()


async def test_history_lists_with_profile_name(test_sessionmaker, db_user, _cleanup):
    await _insert(test_sessionmaker, db_user.id, name="김철수")
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.get("/api/question/history")
    assert r.status_code == 200, r.text
    arr = r.json()
    assert len(arr) >= 1
    item = arr[0]
    for k in ("id", "profile_name", "question", "category", "headline", "content", "created_at", "share_token"):
        assert k in item, k
    assert item["profile_name"] == "김철수"


async def test_history_requires_auth(override_db):
    async with _client() as c:
        r = await c.get("/api/question/history")
    assert r.status_code == 401


async def test_share_create_and_public_read(test_sessionmaker, db_user, _cleanup):
    cid = await _insert(test_sessionmaker, db_user.id)
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = await c.post(f"/api/question/{cid}/share")
        assert created.status_code == 200, created.text
        share_token = created.json()["share_token"]
        assert len(share_token) >= 8

    # 인증 없이 공개 조회 — 저장본 그대로 반환
    async with _client() as c:
        got = await c.get(f"/api/question/share/{share_token}")
    assert got.status_code == 200, got.text
    g = got.json()
    assert g["headline"] == "변화의 파도가 발아래까지 왔습니다"
    assert g["question"] == "올해 이직 운이 있을까요?"
    assert g["name"] == "홍길동"
    # 저장된 charts/more가 공개 조회에 그대로 포함된다
    assert g["charts"] == [{"tool": "get_wuxing_balance", "payload": {"wood": 2}}]
    assert g["more"] == [{"tool": "get_dae_un", "payload": {"entries": []}}]


async def test_share_reuses_token(test_sessionmaker, db_user, _cleanup):
    cid = await _insert(test_sessionmaker, db_user.id)
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        t1 = (await c.post(f"/api/question/{cid}/share")).json()["share_token"]
        t2 = (await c.post(f"/api/question/{cid}/share")).json()["share_token"]
    assert t1 == t2


async def test_shared_unknown_token_404(override_db):
    async with _client() as c:
        r = await c.get("/api/question/share/not-a-uuid")
    assert r.status_code == 404


async def test_delete_owner_only(test_sessionmaker, db_user, _cleanup):
    cid = await _insert(test_sessionmaker, db_user.id)
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        deleted = await c.delete(f"/api/question/{cid}")
        assert deleted.status_code == 204
        gone = await c.get("/api/question/history")
    assert all(i["id"] != cid for i in gone.json())


async def test_delete_requires_auth(test_sessionmaker, db_user, _cleanup):
    cid = await _insert(test_sessionmaker, db_user.id)
    async with _client() as c:
        r = await c.delete(f"/api/question/{cid}")
    assert r.status_code == 401
