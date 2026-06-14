"""GET /api/jobs/{id} — 소유자 상태 조회, 비로그인 401."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from core.security import create_access_token
from db.models import GenerationJob
from main import app
import crud.generation_jobs as jobs_crud


def _client(token=None):
    cookies = {"access_token": token} if token else None
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://t", cookies=cookies)


async def test_get_job_status_owner(db_user, test_sessionmaker, override_db):
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        await db.commit()
        jid = job.id
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.get(f"/api/jobs/{jid}")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "pending"
    assert r.json()["job_type"] == "saju_report"
    async with test_sessionmaker() as db:
        await db.execute(delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()


async def test_get_job_requires_auth(override_db):
    async with _client() as c:
        r = await c.get("/api/jobs/1")
    assert r.status_code == 401
