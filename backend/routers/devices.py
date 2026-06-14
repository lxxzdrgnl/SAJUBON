"""Expo 푸시 디바이스 토큰 등록."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from crud import device_tokens as dt_crud
from db.models import User
from dependencies.auth import get_current_user
from dependencies.db import get_db
from schemas.devices import DeviceRegisterRequest

router = APIRouter(prefix="/api/devices", tags=["디바이스"])


@router.post("", status_code=status.HTTP_204_NO_CONTENT, summary="푸시 토큰 등록 (로그인)")
async def register_device(
    body: DeviceRegisterRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await dt_crud.upsert_token(db, user_id=user.id, platform=body.platform, token=body.token)
    await db.commit()
