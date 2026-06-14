"""generation_runner: 사주/궁합 job 실행 성공·실패 경로 (파이프라인 모킹)."""
import pytest

import crud.generation_jobs as jobs_crud
import services.generation_runner as runner
from db.models import GenerationJob, SajuReport
from sqlalchemy import delete


_FAKE_SAJU = {"day_pillar": {"stem": "경"}, "meta": {}}


class _FakeTab:
    def __init__(self, c, h, ct, r=False):
        self._d = dict(category=c, headline=h, content=ct, requested=r)

    def model_dump(self):
        return dict(self._d)


class _FakeWriter:
    tabs = [_FakeTab("성격", "헤드라인", "본문")]


def _fake_year_flow():
    from schemas.report import YearFlow, YearFlowMonth
    return YearFlow(year=2026, first_half="상", second_half="하",
                    months=[YearFlowMonth(month=m, keyword="k", memo="m") for m in range(1, 13)])


def _fake_dae_un():
    from schemas.report import DaeUnAnalysis, DaeUnPeriod
    return DaeUnAnalysis(current=DaeUnPeriod(ganji="을해", period="~2035", text="t"),
                         next=DaeUnPeriod(ganji="갑술", period="2036~", text="t"), caution="c")


class _FakeUnFlow:
    year_flow = _fake_year_flow()
    dae_un_analysis = _fake_dae_un()


_SAJU_PAYLOAD = {
    "birth_input": {"birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male",
                    "calendar": "solar", "is_leap_month": False, "name": "홍길동"},
    "request_topics": "이직", "profile_id": None, "language": "ko",
}


@pytest.mark.asyncio
async def test_run_saju_report_job_success(test_sessionmaker, db_user, monkeypatch):
    async def _fake_full(**kwargs):
        return _FAKE_SAJU, _FakeWriter(), _FakeUnFlow()
    notified = {"v": False}
    async def _fake_notify(db, job):
        notified["v"] = True
    monkeypatch.setattr(runner, "run_saju_report_full", _fake_full)
    monkeypatch.setattr(runner, "notify_generation_done", _fake_notify)

    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload=_SAJU_PAYLOAD)
        await db.commit()
        jid = job.id

    async with test_sessionmaker() as db:
        await runner.run_saju_report_job(db, jid)

    async with test_sessionmaker() as db:
        got = await jobs_crud.get_job(db, jid)
        assert got.status == "done"
        assert got.result_id is not None
        rid = got.result_id
        assert notified["v"] is True
        await db.execute(delete(SajuReport).where(SajuReport.id == rid))
        await db.execute(delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()


@pytest.mark.asyncio
async def test_run_saju_report_job_failure_sets_failed(test_sessionmaker, db_user, monkeypatch):
    async def _boom(**kwargs):
        raise RuntimeError("llm down")
    monkeypatch.setattr(runner, "run_saju_report_full", _boom)
    monkeypatch.setattr(runner, "notify_generation_done", lambda db, job: None)

    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload=_SAJU_PAYLOAD)
        await db.commit()
        jid = job.id

    async with test_sessionmaker() as db:
        await runner.run_saju_report_job(db, jid)

    async with test_sessionmaker() as db:
        got = await jobs_crud.get_job(db, jid)
        assert got.status == "failed"
        assert "llm down" in (got.error or "")
        await db.execute(delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()
