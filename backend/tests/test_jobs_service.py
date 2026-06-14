"""jobs 서비스: 상태 조회(소유권) + 활성 job 규칙 + enqueue 실패 503."""
import pytest

import crud.generation_jobs as jobs_crud
import services.jobs as jobs_service
from core.exceptions import ForbiddenException, ReportNotFoundException
from db.models import GenerationJob
from sqlalchemy import delete, select


@pytest.mark.asyncio
async def test_get_status_owner_ok_and_forbidden(test_sessionmaker, db_user):
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        await db.commit()
        jid = job.id
    async with test_sessionmaker() as db:
        res = await jobs_service.get_job_status(db, jid, db_user.id)
        assert res.status == "pending"
        assert res.job_type == "saju_report"
    async with test_sessionmaker() as db:
        with pytest.raises(ForbiddenException):
            await jobs_service.get_job_status(db, jid, db_user.id + 99999)
    async with test_sessionmaker() as db:
        with pytest.raises(ReportNotFoundException):
            await jobs_service.get_job_status(db, 99999999, db_user.id)
        await db.execute(delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()


@pytest.mark.asyncio
async def test_create_job_returns_existing_active(test_sessionmaker, db_user):
    class FakeArq:
        def __init__(self):
            self.calls = []

        async def enqueue_job(self, fn, *args):
            self.calls.append((fn, args))

    arq = FakeArq()
    async with test_sessionmaker() as db:
        jid1 = await jobs_service.create_job_and_enqueue(
            db, user_id=db_user.id, job_type="saju_report",
            payload={"x": 1}, enqueue_fn="generate_saju_report", arq=arq,
        )
        await db.commit()
    async with test_sessionmaker() as db:
        jid2 = await jobs_service.create_job_and_enqueue(
            db, user_id=db_user.id, job_type="saju_report",
            payload={"x": 2}, enqueue_fn="generate_saju_report", arq=arq,
        )
        await db.commit()
    assert jid1 == jid2
    assert len(arq.calls) == 1
    async with test_sessionmaker() as db:
        await db.execute(delete(GenerationJob).where(GenerationJob.user_id == db_user.id))
        await db.commit()


@pytest.mark.asyncio
async def test_enqueue_failure_returns_503_and_no_orphan(test_sessionmaker, db_user):
    from fastapi import HTTPException

    class BoomArq:
        async def enqueue_job(self, fn, *args):
            raise RuntimeError("redis down")

    async with test_sessionmaker() as db:
        with pytest.raises(HTTPException) as ei:
            await jobs_service.create_job_and_enqueue(
                db, user_id=db_user.id, job_type="saju_report",
                payload={}, enqueue_fn="generate_saju_report", arq=BoomArq(),
            )
        assert ei.value.status_code == 503
        await db.rollback()
    async with test_sessionmaker() as db:
        rows = (await db.execute(select(GenerationJob).where(GenerationJob.user_id == db_user.id))).scalars().all()
        assert rows == []
