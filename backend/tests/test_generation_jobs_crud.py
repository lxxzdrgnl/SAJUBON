"""generation_jobs CRUD: 생성·상태전이·활성조회·스윕·보존정리."""
from datetime import datetime, timedelta, timezone

import pytest

import crud.generation_jobs as jobs_crud
from db.models import GenerationJob


@pytest.mark.asyncio
async def test_create_and_get(test_sessionmaker, db_user):
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(
            db, user_id=db_user.id, job_type="saju_report", payload={"a": 1}
        )
        await db.commit()
        jid = job.id
    async with test_sessionmaker() as db:
        got = await jobs_crud.get_job(db, jid)
        assert got is not None
        assert got.status == "pending"
        assert got.payload == {"a": 1}
        await db.execute(__import__("sqlalchemy").delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()


@pytest.mark.asyncio
async def test_active_for_user_and_set_status(test_sessionmaker, db_user):
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        await db.commit()
        jid = job.id
    async with test_sessionmaker() as db:
        active = await jobs_crud.get_active_for_user(db, db_user.id)
        assert active is not None and active.id == jid
    async with test_sessionmaker() as db:
        await jobs_crud.set_status(db, jid, "done", result_id=42)
        await db.commit()
    async with test_sessionmaker() as db:
        assert await jobs_crud.get_active_for_user(db, db_user.id) is None
        got = await jobs_crud.get_job(db, jid)
        assert got.status == "done" and got.result_id == 42
        await db.execute(__import__("sqlalchemy").delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()


@pytest.mark.asyncio
async def test_sweep_stale(test_sessionmaker, db_user):
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        job.status = "running"
        job.updated_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        await db.commit()
        jid = job.id
    async with test_sessionmaker() as db:
        swept = await jobs_crud.sweep_stale(db, stale_minutes=10)
        await db.commit()
        assert jid in swept
    async with test_sessionmaker() as db:
        got = await jobs_crud.get_job(db, jid)
        assert got.status == "failed"
        await db.execute(__import__("sqlalchemy").delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()


@pytest.mark.asyncio
async def test_delete_old_jobs(test_sessionmaker, db_user):
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        job.status = "done"
        job.updated_at = datetime.now(timezone.utc) - timedelta(days=30)
        await db.commit()
        jid = job.id
    async with test_sessionmaker() as db:
        n = await jobs_crud.delete_old_jobs(db, retention_days=14)
        await db.commit()
        assert n >= 1
    async with test_sessionmaker() as db:
        assert await jobs_crud.get_job(db, jid) is None
