"""궁합 리포트 생성·목록·단건·공유·공개열람·from-session API 통합 테스트.

생성 endpoint는 이제 202 {job_id} 를 반환한다 (워커가 실제 생성).
목록·단건·공유 테스트는 crud.compatibility.create_report 로 행을 직접 삽입한다.
DB는 로컬 postgres(5433).
"""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from core.security import create_access_token
from crud import compatibility as compat_crud
from db.models import ChatSession, CompatibilityReport, CompatibilityShare, GenerationJob
from dependencies.arq import get_arq
from main import app


# ── FakeArq ──

class _FakeArq:
    def __init__(self):
        self.calls = []

    async def enqueue_job(self, fn, *args):
        self.calls.append((fn, args))


@pytest.fixture(autouse=True)
def _override_arq():
    app.dependency_overrides[get_arq] = lambda: _FakeArq()
    yield
    app.dependency_overrides.pop(get_arq, None)


# ── 공통 픽스처 ──

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
        # GenerationJob
        await s.execute(delete(GenerationJob).where(GenerationJob.user_id == db_user.id))
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

# 직접 삽입용 스텁 데이터 (DB 저장 형식 — score/synastry는 이미 변환된 형태)
_SCORE = {
    "total": 97,
    "day_pillar": 90,
    "element_harmony": 88,
    "branch_relation": 80,
    "ten_gods": 85,
}

_SYNASTRY = {
    "stem_hap": "수",
    "day_ten_god": "정재",
    "element_synergy": "상생",
    "clash_pairs": [["인", "신"]],
    "complement_a_to_b": ["수"],
    "complement_b_to_a": ["목"],
    "yongsin_help": "mutual",
    "interaction_tags": ["stem_hap_수"],
}

_TABS = [
    {"category": "종합 케미", "headline": "물과 나무처럼 서로를 키우는 궁합", "content": "본문1", "requested": False},
    {"category": "갈등 포인트", "headline": "속도가 다른 두 사람", "content": "본문2", "requested": False},
    {"category": "관계 조언", "headline": "함께 더 멀리 가는 법", "content": "본문3", "requested": False},
    {"category": "연애 스타일", "headline": "끌림의 결이 다르다", "content": "본문4", "requested": False},
    {"category": "결혼 시기", "headline": "내년 봄이 적기", "content": "본문5", "requested": True},
]

_PERSON_A = {
    "birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male",
    "calendar": "solar", "is_leap_month": False, "name": "이용재",
}

_PERSON_B = {
    "birth_date": "1992-07-21", "birth_time": "09:00", "gender": "female",
    "calendar": "solar", "is_leap_month": False, "name": "유다연",
}


async def _insert_report(test_sessionmaker, db_user) -> CompatibilityReport:
    """테스트용 CompatibilityReport 행을 직접 삽입하고 반환한다."""
    async with test_sessionmaker() as s:
        report = await compat_crud.create_report(
            s,
            user_id=db_user.id,
            person_a=_PERSON_A,
            person_b=_PERSON_B,
            request_topics="결혼 시기",
            language="ko",
            score=_SCORE,
            synastry=_SYNASTRY,
            tabs=_TABS,
        )
        await s.commit()
        rid = report.id
    async with test_sessionmaker() as s:
        return await s.get(CompatibilityReport, rid)


def _client(token=None):
    transport = ASGITransport(app=app)
    cookies = {"access_token": token} if token else None
    return AsyncClient(transport=transport, base_url="http://t", cookies=cookies)


# ── 생성 테스트 ──

async def test_create_returns_job_id(db_user, _cleanup):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post("/api/compatibility", json=_BODY)
    assert r.status_code == 202, r.text
    assert isinstance(r.json()["job_id"], int)


async def test_create_requires_auth(override_db):
    async with _client() as c:
        r = await c.post("/api/compatibility", json=_BODY)
    assert r.status_code == 401


# ── 목록·단건·공유 테스트 (직접 삽입) ──

async def test_list_reports(test_sessionmaker, db_user, _cleanup):
    await _insert_report(test_sessionmaker, db_user)
    token = create_access_token(db_user.id)
    async with _client(token) as c:
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
    report = await _insert_report(test_sessionmaker, db_user)
    rid = report.id
    token = create_access_token(db_user.id)
    async with _client(token) as c:
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


async def test_share_flow_and_masking(test_sessionmaker, db_user, _cleanup):
    report = await _insert_report(test_sessionmaker, db_user)
    rid = report.id
    token = create_access_token(db_user.id)
    async with _client(token) as c:
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


async def test_share_no_mask_keeps_birth(test_sessionmaker, db_user, _cleanup):
    report = await _insert_report(test_sessionmaker, db_user)
    rid = report.id
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        share = (await c.post(f"/api/compatibility/{rid}/share", json={"mask_birth": False})).json()
    async with _client() as c:
        pb = (await c.get(f"/api/compatibility/shared/{share['share_token']}")).json()
    assert pb["person_a"]["birth_date"] == "1990-03-15"


async def test_shared_token_404(override_db):
    async with _client() as c:
        r = await c.get(f"/api/compatibility/shared/{uuid.uuid4()}")
    assert r.status_code == 404


# ── from-session 테스트 ──

async def test_from_session(db_user, chat_session, _cleanup):
    """세션 기반 생성: 202 + job_id 반환 (워커가 실제 생성)."""
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post(f"/api/compatibility/from-session/{chat_session}")
    assert r.status_code == 202, r.text
    assert isinstance(r.json()["job_id"], int)


async def test_from_session_requires_auth(override_db, chat_session):
    async with _client() as c:
        r = await c.post(f"/api/compatibility/from-session/{chat_session}")
    assert r.status_code == 401


async def test_from_session_enqueues_payload(db_user, chat_session, _cleanup, test_sessionmaker):
    """세션 기반 job 등록 시 payload에 session_id가 포함되는지 확인."""
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post(f"/api/compatibility/from-session/{chat_session}")
    assert r.status_code == 202, r.text
    job_id = r.json()["job_id"]
    # DB의 job payload 확인
    import crud.generation_jobs as jobs_crud
    async with test_sessionmaker() as s:
        job = await jobs_crud.get_job(s, job_id)
    assert job is not None
    assert job.payload.get("mode") == "session"
    assert job.payload.get("session_id") == str(chat_session)


async def test_from_session_not_found_404(db_user, override_db):
    """존재하지 않거나 소유하지 않은 세션 → 즉시 404 (job 생성 안 함)."""
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post(f"/api/compatibility/from-session/{uuid.uuid4()}")
    assert r.status_code == 404, r.text


async def test_from_session_no_partner_400(db_user, _cleanup, test_sessionmaker):
    """상대 사주 미첨부 세션 → 즉시 400 (job 생성 안 함)."""
    sid = uuid.uuid4()
    birth_info = {
        "birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male",
        "calendar": "solar", "is_leap_month": False, "name": "이용재",
    }
    async with test_sessionmaker() as s:
        s.add(ChatSession(id=sid, user_id=db_user.id, birth_info=birth_info, partner_info=None))
        await s.commit()
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post(f"/api/compatibility/from-session/{sid}")
    assert r.status_code == 400, r.text
    async with test_sessionmaker() as s:
        await s.execute(delete(ChatSession).where(ChatSession.id == sid))
        await s.commit()
