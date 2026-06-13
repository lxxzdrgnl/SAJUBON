# backend/schemas/chat.py
"""채팅 에이전트 요청/응답 스키마."""

from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class ChatSessionCreate(BaseModel):
    profile_id: int | None = Field(default=None, description="저장된 프로필 ID")
    birth_date: str | None = Field(default=None, description="생년월일 (YYYY-MM-DD)", examples=["1990-03-15"])
    birth_time: str | None = Field(default=None, description="태어난 시간 (HH:MM)", examples=["14:30"])
    gender: str | None = Field(default=None, description="성별 (male/female)", examples=["male"])
    calendar: str = Field(default="solar", description="양력/음력")
    is_leap_month: bool = Field(default=False)
    language: str = Field(default="ko", description="응답 언어 (ko | en)")


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    birth_info: dict
    created_at: datetime
    last_message_at: datetime
    title: str | None

    model_config = {"from_attributes": True}


class PartnerAttachRequest(BaseModel):
    profile_id: int | None = Field(default=None, description="저장된 프로필 ID")
    birth_date: str | None = Field(default=None, description="생년월일 (YYYY-MM-DD)", examples=["1992-07-21"])
    birth_time: str | None = Field(default=None, description="태어난 시간 (HH:MM)", examples=["09:00"])
    gender: str | None = Field(default=None, description="성별 (male/female)", examples=["female"])
    calendar: str = Field(default="solar", description="양력/음력")
    is_leap_month: bool = Field(default=False)
    name: str | None = Field(default=None, description="상대방 이름(표시용)", examples=["지민"])


class PartnerAttachResponse(BaseModel):
    partner_name: str


class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500, description="사용자 메시지")


class ChatHistoryMessage(BaseModel):
    role: str                              # "human" | "ai" | "tool"
    content: str = ""
    tool: str | None = None                # role == "tool" 일 때 tool 이름
    payload: dict | None = None            # role == "tool" 일 때 차트 data
    created_at: str | None = None


class ChatHistoryResponse(BaseModel):
    session_id: uuid.UUID
    messages: list[ChatHistoryMessage]


class ChatReportResponse(BaseModel):
    id: int
    session_id: uuid.UUID
    summary: str
    key_insights: list[str]
    advice: list[str]
    topics_covered: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}
