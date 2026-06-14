"""리포트 생성·목록·단건·공유 API 통합 테스트 (A4).

생성 endpoint는 이제 202 {job_id} 를 반환한다 (워커가 실제 생성).
목록·단건·공유 테스트는 reports_crud.insert_report 로 행을 직접 삽입한다.
DB는 로컬 postgres(5433).
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from core.security import create_access_token
from crud import reports as reports_crud
from db.models import GenerationJob, SajuReport, ReportShare
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
async def _cleanup_reports(test_sessionmaker, db_user):
    yield
    async with test_sessionmaker() as s:
        # SajuReport (with cascaded ReportShare via delete_report or direct)
        ids = [
            r.id
            for r in (
                await s.execute(
                    __import__("sqlalchemy").select(SajuReport).where(SajuReport.user_id == db_user.id)
                )
            ).scalars().all()
        ]
        if ids:
            await s.execute(delete(ReportShare).where(ReportShare.report_id.in_(ids)))
            await s.execute(delete(SajuReport).where(SajuReport.id.in_(ids)))
        # GenerationJob
        await s.execute(delete(GenerationJob).where(GenerationJob.user_id == db_user.id))
        await s.commit()


_BODY = {
    "birth_input": {
        "birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male",
        "calendar": "solar", "is_leap_month": False, "name": "홍길동",
    },
    "request_topics": "이직 시기",
}

_BIRTH_INPUT = {
    "birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male",
    "calendar": "solar", "is_leap_month": False, "name": "홍길동",
}

_FAKE_TABS = [
    {"category": "성격", "headline": "당신은 바위처럼 단단한 사람입니다", "content": "본문1", "requested": False},
    {"category": "재물", "headline": "재물이 늦게 터지는 팔자입니다", "content": "본문2", "requested": False},
    {"category": "이직 시기", "headline": "올해 하반기가 적기입니다", "content": "본문3", "requested": True},
]

_FAKE_YEAR_FLOW = {
    "year": 2026,
    "first_half": "상반기 요약",
    "second_half": "하반기 요약",
    "months": [{"month": m, "keyword": f"키{m}", "memo": f"메모{m}"} for m in range(1, 13)],
}

_FAKE_DAE_UN = {
    "current": {"ganji": "을해", "period": "현재 ~2035", "text": "현재"},
    "next": {"ganji": "갑술", "period": "2036~", "text": "다음"},
    "caution": "주의점",
}


async def _insert_report(test_sessionmaker, db_user) -> SajuReport:
    """테스트용 SajuReport 행을 직접 삽입하고 반환한다."""
    async with test_sessionmaker() as s:
        report = await reports_crud.insert_report(
            s,
            user_id=db_user.id,
            profile_id=None,
            birth_input=_BIRTH_INPUT,
            request_topics="이직 시기",
            language="ko",
            tabs=_FAKE_TABS,
            year_flow=_FAKE_YEAR_FLOW,
            dae_un_analysis=_FAKE_DAE_UN,
        )
        await s.commit()
        rid = report.id
    # re-fetch outside the session so it's detached-safe
    async with test_sessionmaker() as s:
        return await s.get(SajuReport, rid)


def _client(token=None):
    transport = ASGITransport(app=app)
    cookies = {"access_token": token} if token else None
    return AsyncClient(transport=transport, base_url="http://t", cookies=cookies)


# ── 생성 테스트 ──

async def test_create_report_returns_job_id(db_user, _cleanup_reports):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post("/api/reports", json=_BODY)
    assert r.status_code == 202, r.text
    assert isinstance(r.json()["job_id"], int)


async def test_create_requires_auth(override_db):
    async with _client() as c:
        r = await c.post("/api/reports", json=_BODY)
    assert r.status_code == 401


# ── 목록·단건·공유 테스트 (직접 삽입) ──

async def test_list_reports(test_sessionmaker, db_user, _cleanup_reports):
    await _insert_report(test_sessionmaker, db_user)
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.get("/api/reports")
    assert r.status_code == 200
    arr = r.json()
    assert len(arr) >= 1
    for key in ("id", "first_headline", "profile_name", "request_topics", "created_at"):
        assert key in arr[0]


async def test_get_single_owner_only(test_sessionmaker, db_user, _cleanup_reports):
    report = await _insert_report(test_sessionmaker, db_user)
    rid = report.id
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        ok = await c.get(f"/api/reports/{rid}")
    assert ok.status_code == 200
    assert ok.json()["id"] == rid

    # 다른 유저 → 403
    from db.models import User
    import uuid as _uuid
    async with test_sessionmaker() as s:
        other = User(email=f"other-{_uuid.uuid4().hex[:8]}@t.com", provider="google")
        s.add(other)
        await s.commit()
        await s.refresh(other)
        other_id = other.id
    other_token = create_access_token(other_id)
    async with _client(other_token) as c:
        forbidden = await c.get(f"/api/reports/{rid}")
    assert forbidden.status_code == 403
    async with test_sessionmaker() as s:
        await s.execute(delete(User).where(User.id == other_id))
        await s.commit()


async def test_get_single_404(db_user, override_db):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.get("/api/reports/99999999")
    assert r.status_code == 404


async def test_share_flow_and_masking(test_sessionmaker, db_user, _cleanup_reports):
    report = await _insert_report(test_sessionmaker, db_user)
    rid = report.id
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        # 공유 발급 (mask on)
        share = await c.post(f"/api/reports/{rid}/share", json={"mask_birth": True})
        assert share.status_code == 200
        sb = share.json()
        assert "share_token" in sb and "share_url" in sb
        token_val = sb["share_token"]

    # 비로그인 열람 → 마스킹
    async with _client() as c:
        public = await c.get(f"/api/share/reports/{token_val}")
    assert public.status_code == 200
    pb = public.json()
    assert pb["birth_input"]["birth_date"] is None
    assert pb["birth_input"]["birth_time"] is None
    assert pb["birth_input"]["name"] == "홍길동"  # 이름 유지
    assert pb["profile_name"] == "홍길동"


async def test_share_no_mask_keeps_birth(test_sessionmaker, db_user, _cleanup_reports):
    report = await _insert_report(test_sessionmaker, db_user)
    rid = report.id
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        share = (await c.post(f"/api/reports/{rid}/share", json={"mask_birth": False})).json()
    async with _client() as c:
        pb = (await c.get(f"/api/share/reports/{share['share_token']}")).json()
    assert pb["birth_input"]["birth_date"] == "1990-03-15"


async def test_shared_token_404(override_db):
    import uuid as _uuid
    async with _client() as c:
        r = await c.get(f"/api/share/reports/{_uuid.uuid4()}")
    assert r.status_code == 404


async def test_delete_report_owner(test_sessionmaker, db_user, _cleanup_reports):
    report = await _insert_report(test_sessionmaker, db_user)
    rid = report.id
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        deleted = await c.delete(f"/api/reports/{rid}")
        assert deleted.status_code == 204
        gone = await c.get(f"/api/reports/{rid}")
    assert gone.status_code == 404


async def test_delete_report_with_share_cascades(test_sessionmaker, db_user, _cleanup_reports):
    report = await _insert_report(test_sessionmaker, db_user)
    rid = report.id
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        share = (await c.post(f"/api/reports/{rid}/share", json={"mask_birth": False})).json()
        deleted = await c.delete(f"/api/reports/{rid}")
        assert deleted.status_code == 204
    # 공유 토큰도 함께 제거됨
    async with _client() as c:
        public = await c.get(f"/api/share/reports/{share['share_token']}")
    assert public.status_code == 404


async def test_delete_report_404(db_user, override_db):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.delete("/api/reports/99999999")
    assert r.status_code == 404


async def test_delete_report_requires_auth(test_sessionmaker, db_user, _cleanup_reports):
    report = await _insert_report(test_sessionmaker, db_user)
    rid = report.id
    async with _client() as c:
        r = await c.delete(f"/api/reports/{rid}")
    assert r.status_code == 401


async def test_delete_report_forbidden_for_others(test_sessionmaker, db_user, _cleanup_reports):
    report = await _insert_report(test_sessionmaker, db_user)
    rid = report.id
    token = create_access_token(db_user.id)

    from db.models import User
    import uuid as _uuid
    async with test_sessionmaker() as s:
        other = User(email=f"other-{_uuid.uuid4().hex[:8]}@t.com", provider="google")
        s.add(other)
        await s.commit()
        await s.refresh(other)
        other_id = other.id
    other_token = create_access_token(other_id)
    async with _client(other_token) as c:
        forbidden = await c.delete(f"/api/reports/{rid}")
    assert forbidden.status_code == 403
    # 원본은 여전히 존재
    async with _client(token) as c:
        still = await c.get(f"/api/reports/{rid}")
    assert still.status_code == 200
    async with test_sessionmaker() as s:
        await s.execute(delete(User).where(User.id == other_id))
        await s.commit()


async def test_daily_limit_429(test_sessionmaker, db_user, _cleanup_reports, monkeypatch):
    """일일 한도: SajuReport 행을 직접 삽입해 1개 사용 → 두 번째 POST는 429."""
    from core.config import settings
    monkeypatch.setattr(settings, "report_daily_limit", 1)

    # 워커가 이미 1개 생성한 것처럼 SajuReport를 직접 삽입
    await _insert_report(test_sessionmaker, db_user)

    token = create_access_token(db_user.id)
    async with _client(token) as c:
        second = await c.post("/api/reports", json=_BODY)
    assert second.status_code == 429
    assert "detail" in second.json()
