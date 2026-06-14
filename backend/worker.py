"""arq 워커 — 단일 큐 sajuguri:jobs.

실행: `arq worker.WorkerSettings`
태스크: generate_saju_report, generate_compatibility
cron: 10분마다 stale job 정리 + 오래된 done/failed 행 삭제.
"""
from __future__ import annotations

from arq import cron
from arq.connections import RedisSettings
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.config import settings
from crud import generation_jobs as jobs_crud
from crud import maintenance as maintenance_crud
from services.generation_runner import run_compatibility_job, run_saju_report_job

QUEUE_NAME = "sajuguri:jobs"


async def generate_saju_report(ctx, job_id: int) -> None:
    sm = ctx["sessionmaker"]
    async with sm() as db:
        await run_saju_report_job(db, job_id)


async def generate_compatibility(ctx, job_id: int) -> None:
    sm = ctx["sessionmaker"]
    async with sm() as db:
        await run_compatibility_job(db, job_id)


async def sweep_stale_jobs(ctx) -> None:
    sm = ctx["sessionmaker"]
    async with sm() as db:
        await jobs_crud.sweep_stale(db, settings.gen_job_stale_minutes)
        await jobs_crud.delete_old_jobs(db, settings.gen_job_retention_days)
        await db.commit()


async def purge_deleted_content(ctx) -> None:
    sm = ctx["sessionmaker"]
    async with sm() as db:
        await maintenance_crud.purge_deleted_content(db, settings.content_retention_days)
        await db.commit()


async def on_startup(ctx) -> None:
    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        connect_args={"statement_cache_size": 0},
        pool_size=10,
        max_overflow=10,
    )
    ctx["engine"] = engine
    ctx["sessionmaker"] = async_sessionmaker(engine, expire_on_commit=False)


async def on_shutdown(ctx) -> None:
    await ctx["engine"].dispose()


class WorkerSettings:
    functions = [generate_saju_report, generate_compatibility]
    cron_jobs = [
        cron(sweep_stale_jobs, minute=set(range(0, 60, 10))),
        cron(purge_deleted_content, hour={4}, minute={0}),
    ]
    on_startup = on_startup
    on_shutdown = on_shutdown
    max_jobs = settings.gen_worker_max_jobs
    job_timeout = 180
    queue_name = QUEUE_NAME
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
