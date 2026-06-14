"""디바이스 푸시 토큰 등록 스키마."""
from __future__ import annotations

from pydantic import BaseModel, Field


class DeviceRegisterRequest(BaseModel):
    platform: str = Field(description="ios | android")
    token: str = Field(description="ExpoPushToken 문자열")
