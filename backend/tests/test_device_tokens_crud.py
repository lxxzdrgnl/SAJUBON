"""device_tokens CRUD: upsert·목록·삭제."""
import pytest

import crud.device_tokens as dt_crud
from db.models import DeviceToken
from sqlalchemy import delete


@pytest.mark.asyncio
async def test_upsert_idempotent_and_list_and_delete(test_sessionmaker, db_user):
    async with test_sessionmaker() as db:
        await dt_crud.upsert_token(db, user_id=db_user.id, platform="ios", token="ExponentPushToken[abc]")
        await db.commit()
    async with test_sessionmaker() as db:
        await dt_crud.upsert_token(db, user_id=db_user.id, platform="ios", token="ExponentPushToken[abc]")
        await db.commit()
    async with test_sessionmaker() as db:
        tokens = await dt_crud.list_for_user(db, db_user.id)
        assert [t.token for t in tokens] == ["ExponentPushToken[abc]"]
    async with test_sessionmaker() as db:
        await dt_crud.delete_token(db, "ExponentPushToken[abc]")
        await db.commit()
    async with test_sessionmaker() as db:
        assert await dt_crud.list_for_user(db, db_user.id) == []
        await db.execute(delete(DeviceToken).where(DeviceToken.user_id == db_user.id))
        await db.commit()
