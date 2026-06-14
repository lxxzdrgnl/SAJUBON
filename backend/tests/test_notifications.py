"""Expo 푸시 발송: 토큰 없으면 skip, 있으면 호출, DeviceNotRegistered 토큰 삭제."""
import pytest

import crud.device_tokens as dt_crud
import services.notifications as notif
from db.models import DeviceToken, GenerationJob
from sqlalchemy import delete


class _FakeResp:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class _FakeAsyncClient:
    """httpx.AsyncClient 대체 — 마지막 POST body 기록, 지정 응답 반환."""
    last_json = None

    def __init__(self, *a, **k):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, url, json=None, headers=None):
        _FakeAsyncClient.last_json = json
        data = [{"status": "error", "details": {"error": "DeviceNotRegistered"}} for _ in json]
        return _FakeResp({"data": data})


@pytest.mark.asyncio
async def test_no_tokens_is_noop(test_sessionmaker, db_user, monkeypatch):
    job = GenerationJob(user_id=db_user.id, job_type="saju_report", status="done",
                        payload={}, result_id=1)
    monkeypatch.setattr(notif.httpx, "AsyncClient",
                        lambda *a, **k: (_ for _ in ()).throw(AssertionError("should not call")))
    async with test_sessionmaker() as db:
        await notif.notify_generation_done(db, job)


@pytest.mark.asyncio
async def test_sends_and_prunes_invalid(test_sessionmaker, db_user, monkeypatch):
    monkeypatch.setattr(notif.httpx, "AsyncClient", _FakeAsyncClient)
    async with test_sessionmaker() as db:
        await dt_crud.upsert_token(db, user_id=db_user.id, platform="ios", token="ExponentPushToken[x]")
        await db.commit()
        job = GenerationJob(user_id=db_user.id, job_type="saju_report", status="done",
                            payload={}, result_id=7)
        db.add(job)
        await db.commit()
        await db.refresh(job)
        await notif.notify_generation_done(db, job)
        await db.commit()
    assert _FakeAsyncClient.last_json[0]["to"] == "ExponentPushToken[x]"
    assert _FakeAsyncClient.last_json[0]["data"] == {"type": "saju_report", "result_id": 7}
    async with test_sessionmaker() as db:
        assert await dt_crud.list_for_user(db, db_user.id) == []
        await db.execute(delete(GenerationJob).where(GenerationJob.user_id == db_user.id))
        await db.execute(delete(DeviceToken).where(DeviceToken.user_id == db_user.id))
        await db.commit()
