"""운세 스토리 API (A4) 통합 테스트 — 게스트 생성·로그인 1일 1회·기록 목록/단건.

LLM·엔진 파이프라인은 monkeypatch 스텁 (실호출 금지). DB는 로컬 postgres(5433).
공통 API 계약의 응답 스키마를 검증한다.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from core.security import create_access_token
from db.models import DailyFortuneRecord, User
from main import app
import services.daily_story as story_service
from schemas.daily_story import DailyStoryResponse, StoryCard


# ── 파이프라인 스텁 (호출 카운터로 캐시 동작 검증) ──
_calls = {"n": 0}


def _fake_story(date: str) -> DailyStoryResponse:
    cats = ["exam", "money", "love", "career", "health", "social"]
    cards = [
        StoryCard(kind="intro", title="오늘의 일진", headline="병오일", body="근거"),
        StoryCard(kind="overall", title="총운", score=68, headline="무난", body="무난"),
    ]
    for c in cats:
        cards.append(StoryCard(kind="category", category_key=c, title=f"{c}운", score=70, headline="라벨", body="본문"))
    cards.append(StoryCard(kind="caution", title="주의", headline="조심", body="충동 금지"))
    cards.append(StoryCard(kind="color", title="색", headline="흰색", body="안정"))
    cards.append(StoryCard(kind="summary", title="요약", score=68, headline="활력", body="무난"))
    return DailyStoryResponse(
        date=date,
        day_ganji={"stem": "병", "branch": "오"},
        profile_name="홍길동",
        cards=cards,
        scores={c: 70 for c in cats},
        keyword="활력",
        record_id=None,
        rewritten=False,
    )


@pytest.fixture(autouse=True)
def _stub_pipeline(monkeypatch):
    _calls["n"] = 0

    async def _fake_build(req, *, profile_name, date):
        _calls["n"] += 1
        s = _fake_story(date)
        s.profile_name = profile_name
        return s

    monkeypatch.setattr(story_service, "build_daily_story", _fake_build)


@pytest.fixture
async def _cleanup(test_sessionmaker, db_user):
    yield
    async with test_sessionmaker() as s:
        await s.execute(delete(DailyFortuneRecord).where(DailyFortuneRecord.user_id == db_user.id))
        await s.commit()


_BODY = {
    "birth_input": {
        "birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male",
        "calendar": "solar", "is_leap_month": False, "name": "홍길동",
    },
    "date": "2026-06-13",
}


def _client(token=None):
    transport = ASGITransport(app=app)
    cookies = {"access_token": token} if token else None
    return AsyncClient(transport=transport, base_url="http://t", cookies=cookies)


_CONTRACT_KEYS = ("date", "day_ganji", "profile_name", "cards", "scores", "keyword", "record_id", "rewritten")


async def test_guest_creates_every_call(override_db):
    async with _client() as c:
        r1 = await c.post("/api/daily/story", json=_BODY)
        r2 = await c.post("/api/daily/story", json=_BODY)
    assert r1.status_code == 200, r1.text
    b = r1.json()
    for k in _CONTRACT_KEYS:
        assert k in b, k
    assert b["record_id"] is None
    assert len(b["cards"]) == 11
    assert b["cards"][0]["kind"] == "intro"
    assert b["cards"][-1]["kind"] == "summary"
    assert set(b["scores"]) == {"exam", "money", "love", "career", "health", "social"}
    # 게스트는 매 호출 생성
    assert _calls["n"] == 2


async def test_login_once_per_day(db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r1 = await c.post("/api/daily/story", json=_BODY)
        r2 = await c.post("/api/daily/story", json=_BODY)
    assert r1.status_code == 200
    b1, b2 = r1.json(), r2.json()
    # 저장 → record_id 채워짐
    assert b1["record_id"] is not None
    # 두 번째 = 저장본 그대로 (동일 payload·동일 record_id)
    assert b2["record_id"] == b1["record_id"]
    assert b2 == b1
    # 파이프라인은 한 번만 호출 (두 번째는 캐시 반환)
    assert _calls["n"] == 1


async def test_records_list_and_single(db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/daily/story", json=_BODY)).json()
        rid = created["record_id"]
        lst = await c.get("/api/daily/records")
        single = await c.get(f"/api/daily/records/{rid}")
    assert lst.status_code == 200
    arr = lst.json()
    assert len(arr) >= 1
    for k in ("id", "date", "profile_name", "keyword"):
        assert k in arr[0]
    assert single.status_code == 200
    assert single.json()["record_id"] == rid


async def test_records_require_auth(override_db):
    async with _client() as c:
        r = await c.get("/api/daily/records")
    assert r.status_code == 401


async def test_single_record_owner_only(test_sessionmaker, db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/daily/story", json=_BODY)).json()
        rid = created["record_id"]

    async with test_sessionmaker() as s:
        import uuid as _uuid
        other = User(email=f"other-{_uuid.uuid4().hex[:8]}@t.com", provider="google")
        s.add(other)
        await s.commit()
        await s.refresh(other)
        other_id = other.id
    other_token = create_access_token(other_id)
    async with _client(other_token) as c:
        forbidden = await c.get(f"/api/daily/records/{rid}")
    assert forbidden.status_code == 403
    async with test_sessionmaker() as s:
        await s.execute(delete(User).where(User.id == other_id))
        await s.commit()


async def test_single_record_404(db_user, override_db):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.get("/api/daily/records/99999999")
    assert r.status_code == 404


async def test_delete_record_owner(db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/daily/story", json=_BODY)).json()
        rid = created["record_id"]
        deleted = await c.delete(f"/api/daily/records/{rid}")
        assert deleted.status_code == 204
        gone = await c.get(f"/api/daily/records/{rid}")
    assert gone.status_code == 404


async def test_delete_record_404(db_user, override_db):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.delete("/api/daily/records/99999999")
    assert r.status_code == 404


async def test_delete_record_requires_auth(db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/daily/story", json=_BODY)).json()
        rid = created["record_id"]
    async with _client() as c:
        r = await c.delete(f"/api/daily/records/{rid}")
    assert r.status_code == 401


async def test_delete_record_forbidden_for_others(test_sessionmaker, db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/daily/story", json=_BODY)).json()
        rid = created["record_id"]

    import uuid as _uuid
    async with test_sessionmaker() as s:
        other = User(email=f"other-{_uuid.uuid4().hex[:8]}@t.com", provider="google")
        s.add(other)
        await s.commit()
        await s.refresh(other)
        other_id = other.id
    other_token = create_access_token(other_id)
    async with _client(other_token) as c:
        forbidden = await c.delete(f"/api/daily/records/{rid}")
    assert forbidden.status_code == 403
    # 원본은 여전히 존재
    async with _client(token) as c:
        still = await c.get(f"/api/daily/records/{rid}")
    assert still.status_code == 200
    async with test_sessionmaker() as s:
        await s.execute(delete(User).where(User.id == other_id))
        await s.commit()
