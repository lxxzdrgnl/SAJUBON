"""
공통 입력 스키마 — Pydantic 모델.

MCP tool 핸들러 내부에서 입력 파싱·검증에 사용.
FastMCP tool 시그니처(flat params)와는 별도로 존재하며,
핸들러가 dict 입력을 받을 때 타입 안전성을 보장.
"""

from __future__ import annotations
from pydantic import BaseModel, field_validator


class BirthInput(BaseModel):
    """사주 계산 공통 입력 스키마."""

    birth_date: str        # "YYYY-MM-DD"
    birth_time: str | None = None   # "HH:MM" — 모르면 None (시주 없이 계산)
    gender: str            # "male" | "female"
    calendar: str = "solar"       # "solar" | "lunar"
    is_leap_month: bool = False

    @field_validator("gender")
    @classmethod
    def _check_gender(cls, v: str) -> str:
        if v not in ("male", "female"):
            raise ValueError(f"gender는 'male' 또는 'female': {v!r}")
        return v

    @field_validator("calendar")
    @classmethod
    def _check_calendar(cls, v: str) -> str:
        if v not in ("solar", "lunar"):
            raise ValueError(f"calendar는 'solar' 또는 'lunar': {v!r}")
        return v


class PersonInput(BirthInput):
    """check_compatibility의 person1 / person2 입력 스키마."""
    pass
