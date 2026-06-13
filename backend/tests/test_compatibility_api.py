"""궁합 리포트 생성·목록·단건·공유·공개열람·from-session API 통합 테스트.

LLM/엔진 파이프라인은 monkeypatch 스텁 (실호출 금지). DB는 로컬 postgres(5433).
"""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from core.security import create_access_token
from db.models import ChatSession, CompatibilityReport, CompatibilityShare
from llm.reports.base import ReportTab
from main import app
import services.compatibility as compat_service


# ── 파이프라인 스텁 ──

_FAKE_SCORE = {
    "total_score": 97,
    "day_pillar_score": 90,
    "element_harmony_score": 88,
    "branch_relation_score": 80,
    "ten_gods_score": 85,
    "conflict_branches": [],
    "complement_elements": ["수"],
    "complement_a_to_b": ["수"],
    "complement_b_to_a": ["목"],
}

_FAKE_SYNASTRY = {
    "stem_hap": "수",
    "day_ten_god": "정재",
    "element_synergy": "상생",
    "clash_pairs": [["인", "신"]],
    "complement_a_to_b": ["수"],
    "complement_b_to_a": ["목"],
    "yongsin_help": "mutual",
    "interaction_tags": ["stem_hap_수"],
}

_FAKE_TABS = [
    ReportTab(category="종합 케미", headline="물과 나무처럼 서로를 키우는 궁합", content="본문1"),
    ReportTab(category="갈등 포인트", headline="속도가 다른 두 사람", content="본문2"),
    ReportTab(category="관계 조언", headline="함께 더 멀리 가는 법", content="본문3"),
    ReportTab(category="연애 스타일", headline="끌림의 결이 다르다", content="본문4"),
    ReportTab(category="결혼 시기", headline="내년 봄이 적기", content="본문5", requested=True),
]


@pytest.fixture(autouse=True)
def _stub_pipeline(monkeypatch):
    async def _fake_run(req):
        return _FAKE_SCORE, _FAKE_SYNASTRY, list(_FAKE_TABS)

    monkeypatch.setattr(compat_service, "run_compatibility_report", _fake_run)


@pytest.fixture
async def _cleanup(test_sessionmaker, db_user):
    yield
    async with test_sessionmaker() as s:
        ids = [
            r.id
            for r in (
                await s.execute(
                    select(CompatibilityReport).where(
                        CompatibilityReport.user_id == db_user.id
                    )
                )
            ).scalars().all()
        ]
        if ids:
            await s.execute(
                delete(CompatibilityShare).where(CompatibilityShare.report_id.in_(ids))
            )
            await s.execute(
                delete(CompatibilityReport).where(CompatibilityReport.id.in_(ids))
            )
            await s.commit()


@pytest.fixture
async def chat_session(test_sessionmaker, db_user):
    """partner_info가 첨부된 db_user 소유 채팅 세션."""
    sid = uuid.uuid4()
    birth_info = {
        "birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male",
        "calendar": "solar", "is_leap_month": False, "name": "이용재",
    }
    partner_info = {
        "birth_date": "1992-07-21", "birth_time": "09:00", "gender": "female",
        "calendar": "solar", "is_leap_month": False, "name": "유다연",
    }
    async with test_sessionmaker() as s:
        s.add(ChatSession(id=sid, user_id=db_user.id, birth_info=birth_info, partner_info=partner_info))
        await s.commit()
    yield sid
    async with test_sessionmaker() as s:
        await s.execute(delete(ChatSession).where(ChatSession.id == sid))
        await s.commit()


_BODY = {
    "person_a": {
        "birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male",
        "calendar": "solar", "is_leap_month": False, "name": "이용재",
    },
    "person_b": {
        "birth_date": "1992-07-21", "birth_time": "09:00", "gender": "female",
        "calendar": "solar", "is_leap_month": False, "name": "유다연",
    },
    "request_topics": "결혼 시기",
}


def _client(token=None):
    transport = ASGITransport(app=app)
    cookies = {"access_token": token} if token else None
    return AsyncClient(transport=transport, base_url="http://t", cookies=cookies)


async def test_create_returns_detail(db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post("/api/compatibility", json=_BODY)
    assert r.status_code == 201, r.text
    body = r.json()
    for key in ("id", "person_a", "person_b", "score", "synastry", "tabs",
                "request_topics", "language", "created_at"):
        assert key in body, key
    assert body["score"]["total"] == 97
    assert body["score"]["day_pillar"] == 90
    assert body["synastry"]["stem_hap"] == "수"
    assert body["synastry"]["yongsin_help"] == "mutual"
    assert len(body["tabs"]) == 5
    assert body["tabs"][0]["category"] == "종합 케미"
    assert body["tabs"][4]["requested"] is True
    assert body["person_a"]["name"] == "이용재"
    assert body["person_a"]["birth_date"] == "1990-03-15"


async def test_create_requires_auth(override_db):
    async with _client() as c:
        r = await c.post("/api/compatibility", json=_BODY)
    assert r.status_code == 401


async def test_list_reports(db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        await c.post("/api/compatibility", json=_BODY)
        r = await c.get("/api/compatibility")
    assert r.status_code == 200
    arr = r.json()
    assert len(arr) >= 1
    for key in ("id", "person_a_name", "person_b_name", "total_score",
                "request_topics", "created_at"):
        assert key in arr[0]
    assert arr[0]["person_a_name"] == "이용재"
    assert arr[0]["person_b_name"] == "유다연"
    assert arr[0]["total_score"] == 97


async def test_get_single_owner_only(test_sessionmaker, db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/compatibility", json=_BODY)).json()
        rid = created["id"]
        ok = await c.get(f"/api/compatibility/{rid}")
    assert ok.status_code == 200
    assert ok.json()["id"] == rid

    from db.models import User
    async with test_sessionmaker() as s:
        other = User(email=f"other-{uuid.uuid4().hex[:8]}@t.com", provider="google")
        s.add(other)
        await s.commit()
        await s.refresh(other)
        other_id = other.id
    other_token = create_access_token(other_id)
    async with _client(other_token) as c:
        forbidden = await c.get(f"/api/compatibility/{rid}")
    assert forbidden.status_code == 403
    async with test_sessionmaker() as s:
        await s.execute(delete(User).where(User.id == other_id))
        await s.commit()


async def test_get_single_404(db_user, override_db):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.get("/api/compatibility/99999999")
    assert r.status_code == 404


async def test_share_flow_and_masking(db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/compatibility", json=_BODY)).json()
        rid = created["id"]
        share = await c.post(f"/api/compatibility/{rid}/share", json={"mask_birth": True})
        assert share.status_code == 200, share.text
        sb = share.json()
        assert "share_token" in sb and "share_url" in sb
        token_val = sb["share_token"]

    # 비로그인 공개 열람 → 마스킹
    async with _client() as c:
        public = await c.get(f"/api/compatibility/shared/{token_val}")
    assert public.status_code == 200, public.text
    pb = public.json()
    assert pb["person_a"]["birth_date"] is None
    assert pb["person_a"]["birth_time"] is None
    assert pb["person_a"]["name"] == "이용재"
    assert pb["person_b"]["birth_date"] is None


async def test_share_no_mask_keeps_birth(db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/compatibility", json=_BODY)).json()
        rid = created["id"]
        share = (await c.post(f"/api/compatibility/{rid}/share", json={"mask_birth": False})).json()
    async with _client() as c:
        pb = (await c.get(f"/api/compatibility/shared/{share['share_token']}")).json()
    assert pb["person_a"]["birth_date"] == "1990-03-15"


async def test_shared_token_404(override_db):
    async with _client() as c:
        r = await c.get(f"/api/compatibility/shared/{uuid.uuid4()}")
    assert r.status_code == 404


async def test_from_session(db_user, chat_session, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post(f"/api/compatibility/from-session/{chat_session}")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["person_a"]["name"] == "이용재"
    assert body["person_b"]["name"] == "유다연"
    assert body["score"]["total"] == 97


async def test_from_session_requires_auth(override_db, chat_session):
    async with _client() as c:
        r = await c.post(f"/api/compatibility/from-session/{chat_session}")
    assert r.status_code == 401


async def test_from_session_foreign_404(db_user, chat_session):
    other_token = create_access_token(db_user.id + 999999)
    async with _client(other_token) as c:
        r = await c.post(f"/api/compatibility/from-session/{chat_session}")
    assert r.status_code in (401, 404)
