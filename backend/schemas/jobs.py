"""비동기 job API 스키마."""
from __future__ import annotations

from pydantic import BaseModel


class JobCreatedResponse(BaseModel):
    job_id: int


class JobStatusResponse(BaseModel):
    status: str                 # pending | running | done | failed
    job_type: str               # saju_report | compatibility
    result_id: int | None = None
    error: str | None = None
