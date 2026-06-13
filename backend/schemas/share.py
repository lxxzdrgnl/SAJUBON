"""공유 API 요청/응답 Pydantic 스키마."""

from __future__ import annotations
from datetime import datetime
from typing import Any
from uuid import UUID
from pydantic import BaseModel, Field


class ShareCreate(BaseModel):
    calc_snapshot: dict[str, Any] = Field(description="엔진 계산 결과 전체")
    profile_id: int | None = Field(default=None, description="로그인 사용자의 프로필 ID")
    birth_input: dict[str, Any] | None = Field(default=None, description="비로그인 시 입력값")


class ShareResponse(BaseModel):
    share_token: UUID
    share_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SharedResultResponse(BaseModel):
    share_token: UUID
    profile_id: int | None
    birth_input: dict[str, Any] | None
    calc_snapshot: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}
