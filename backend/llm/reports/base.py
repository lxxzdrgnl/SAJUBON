# backend/llm/reports/base.py
from __future__ import annotations
from typing import Protocol, Any
from pydantic import BaseModel, Field


class ReportTab(BaseModel):
    category: str
    headline: str
    content: str
    requested: bool = False


class ReportModule(Protocol):
    """리포트류 도메인 모듈 계약. 새 리포트 = 이 프로토콜 구현 1개."""
    key: str
    def assemble_signals(self, inputs: dict) -> dict: ...
    def build_rag_context(self, signals: dict) -> str: ...
    def output_schema(self) -> type[BaseModel]: ...
    def system_prompt(self, language: str = "ko") -> str: ...
    def format_message(self, signals: dict) -> str: ...
    def assemble_tabs(self, parsed: Any, signals: dict, request_topics: str | None) -> list[ReportTab]: ...
