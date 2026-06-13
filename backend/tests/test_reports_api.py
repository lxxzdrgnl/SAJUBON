"""리포트 생성·목록·단건·공유 API 통합 테스트 (A4).

LLM 파이프라인은 monkeypatch 스텁 (실호출 금지). DB는 로컬 postgres(5433).
계약(공통 API 계약)의 응답 스키마를 검증한다.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from core.security import create_access_token
from db.models import SajuReport, ReportShare
from main import app
import services.reports as reports_service


# ── 파이프라인 스텁 ──
_FAKE_SAJU = {"day_pillar": {"stem": "경"}, "meta": {}}


class _FakeTab:
    def __init__(self, category, headline, content, requested=False):
        self._d = dict(category=category, headline=headline, content=content, requested=requested)

    def model_dump(self):
        return dict(self._d)


class _FakeWriter:
    tabs = [
        _FakeTab("성격", "당신은 바위처럼 단단한 사람입니다", "본문1"),
        _FakeTab("재물", "재물이 늦게 터지는 팔자입니다", "본문2"),
        _FakeTab("이직 시기", "올해 하반기가 적기입니다", "본문3", requested=True),
    ]


def _fake_year_flow():
    from schemas.report import YearFlow, YearFlowMonth
    return YearFlow(
        year=2026, first_half="상반기 요약", second_half="하반기 요약",
        months=[YearFlowMonth(month=m, keyword=f"키{m}", memo=f"메모{m}") for m in range(1, 13)],
    )


def _fake_dae_un():
    from schemas.report import DaeUnAnalysis, DaeUnPeriod
    return DaeUnAnalysis(
        current=DaeUnPeriod(ganji="을해", period="현재 ~2035", text="현재"),
        next=DaeUnPeriod(ganji="갑술", period="2036~", text="다음"),
        caution="주의점",
    )


class _FakeUnFlow:
    year_flow = _fake_year_flow()
    dae_un_analysis = _fake_dae_un()


@pytest.fixture(autouse=True)
def _stub_pipeline(monkeypatch):
    async def _fake_run_saju_report(**kwargs):
        return _FAKE_SAJU, _FakeWriter()

    async def _fake_run_un_flow(saju, year=None, llm_provider=None):
        return _FakeUnFlow()

    monkeypatch.setattr(reports_service, "run_saju_report", _fake_run_saju_report)
    monkeypatch.setattr(reports_service, "run_un_flow", _fake_run_un_flow)


@pytest.fixture
async def _cleanup_reports(test_sessionmaker, db_user):
    yield
    async with test_sessionmaker() as s:
        ids = [r.id for r in (await s.execute(
            __import__("sqlalchemy").select(SajuReport).where(SajuReport.user_id == db_user.id)
        )).scalars().all()]
        if ids:
            await s.execute(delete(ReportShare).where(ReportShare.report_id.in_(ids)))
            await s.execute(delete(SajuReport).where(SajuReport.id.in_(ids)))
            await s.commit()


_BODY = {
    "birth_input": {
        "birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male",
        "calendar": "solar", "is_leap_month": False, "name": "홍길동",
    },
    "request_topics": "이직 시기",
}


def _client(token=None):
    transport = ASGITransport(app=app)
    cookies = {"access_token": token} if token else None
    return AsyncClient(transport=transport, base_url="http://t", cookies=cookies)


async def test_create_report_returns_detail(db_user, _cleanup_reports):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post("/api/reports", json=_BODY)
    assert r.status_code == 201, r.text
    body = r.json()
    # 계약: ReportDetail
    for key in ("id", "first_headline", "profile_name", "request_topics",
                "created_at", "birth_input", "language", "tabs",
                "year_flow", "dae_un_analysis"):
        assert key in body, key
    assert body["profile_name"] == "홍길동"
    assert body["first_headline"] == "당신은 바위처럼 단단한 사람입니다"
    assert len(body["tabs"]) == 3
    assert body["tabs"][2]["requested"] is True
    assert len(body["year_flow"]["months"]) == 12
    assert body["dae_un_analysis"]["current"]["ganji"] == "을해"
    # 마스킹 안 됨
    assert body["birth_input"]["birth_date"] == "1990-03-15"


async def test_create_requires_auth(override_db):
    async with _client() as c:
        r = await c.post("/api/reports", json=_BODY)
    assert r.status_code == 401


async def test_list_reports(db_user, _cleanup_reports):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        await c.post("/api/reports", json=_BODY)
        r = await c.get("/api/reports")
    assert r.status_code == 200
    arr = r.json()
    assert len(arr) >= 1
    for key in ("id", "first_headline", "profile_name", "request_topics", "created_at"):
        assert key in arr[0]


async def test_get_single_owner_only(test_sessionmaker, db_user, _cleanup_reports):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/reports", json=_BODY)).json()
        rid = created["id"]
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


async def test_share_flow_and_masking(db_user, _cleanup_reports):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/reports", json=_BODY)).json()
        rid = created["id"]
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


async def test_share_no_mask_keeps_birth(db_user, _cleanup_reports):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/reports", json=_BODY)).json()
        rid = created["id"]
        share = (await c.post(f"/api/reports/{rid}/share", json={"mask_birth": False})).json()
    async with _client() as c:
        pb = (await c.get(f"/api/share/reports/{share['share_token']}")).json()
    assert pb["birth_input"]["birth_date"] == "1990-03-15"


async def test_shared_token_404(override_db):
    import uuid as _uuid
    async with _client() as c:
        r = await c.get(f"/api/share/reports/{_uuid.uuid4()}")
    assert r.status_code == 404


async def test_delete_report_owner(db_user, _cleanup_reports):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/reports", json=_BODY)).json()
        rid = created["id"]
        deleted = await c.delete(f"/api/reports/{rid}")
        assert deleted.status_code == 204
        gone = await c.get(f"/api/reports/{rid}")
    assert gone.status_code == 404


async def test_delete_report_with_share_cascades(db_user, _cleanup_reports):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/reports", json=_BODY)).json()
        rid = created["id"]
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


async def test_delete_report_requires_auth(db_user, _cleanup_reports):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/reports", json=_BODY)).json()
        rid = created["id"]
    async with _client() as c:
        r = await c.delete(f"/api/reports/{rid}")
    assert r.status_code == 401


async def test_delete_report_forbidden_for_others(test_sessionmaker, db_user, _cleanup_reports):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        created = (await c.post("/api/reports", json=_BODY)).json()
        rid = created["id"]

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


async def test_daily_limit_429(db_user, _cleanup_reports, monkeypatch):
    from core.config import settings
    monkeypatch.setattr(settings, "report_daily_limit", 1)
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        first = await c.post("/api/reports", json=_BODY)
        assert first.status_code == 201
        second = await c.post("/api/reports", json=_BODY)
    assert second.status_code == 429
    assert "detail" in second.json()
