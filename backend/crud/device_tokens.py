"""device_tokens DB 접근. commit은 호출측(서비스/워커)에서."""
from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import DeviceToken


async def upsert_token(db: AsyncSession, *, user_id: int, platform: str, token: str) -> None:
    """(user_id, token) 유니크 충돌 시 무시 — 중복 등록 안전."""
    stmt = (
        pg_insert(DeviceToken)
        .values(user_id=user_id, platform=platform, token=token)
        .on_conflict_do_nothing(constraint="uq_device_tokens_user_token")
    )
    await db.execute(stmt)


async def list_for_user(db: AsyncSession, user_id: int) -> list[DeviceToken]:
    result = await db.execute(select(DeviceToken).where(DeviceToken.user_id == user_id))
    return list(result.scalars().all())


async def delete_token(db: AsyncSession, token: str) -> None:
    await db.execute(delete(DeviceToken).where(DeviceToken.token == token))
