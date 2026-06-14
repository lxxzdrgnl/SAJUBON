"""worker 태스크 함수가 runner로 위임하는지 + 스윕 cron 동작."""
import pytest

import worker
from db.models import GenerationJob
from sqlalchemy import delete
import crud.generation_jobs as jobs_crud


@pytest.mark.asyncio
async def test_generate_saju_report_delegates(monkeypatch, test_sessionmaker):
    seen = {}
    async def _fake_runner(db, job_id):
        seen["job_id"] = job_id
    monkeypatch.setattr(worker, "run_saju_report_job", _fake_runner)
    ctx = {"sessionmaker": test_sessionmaker}
    await worker.generate_saju_report(ctx, 123)
    assert seen["job_id"] == 123


@pytest.mark.asyncio
async def test_sweep_cron_marks_failed(monkeypatch, test_sessionmaker, db_user):
    from datetime import datetime, timedelta, timezone
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        job.status = "running"
        job.updated_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        await db.commit()
        jid = job.id
    ctx = {"sessionmaker": test_sessionmaker}
    await worker.sweep_stale_jobs(ctx)
    async with test_sessionmaker() as db:
        got = await jobs_crud.get_job(db, jid)
        assert got.status == "failed"
        await db.execute(delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()
