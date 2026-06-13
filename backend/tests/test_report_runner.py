import pytest
from unittest.mock import AsyncMock, patch
from llm.reports.base import ReportTab
from llm.reports.runner import run_report


class FakeModule:
    key = "fake"
    def assemble_signals(self, inputs): return {"score": 97}
    def build_rag_context(self, signals): return "ctx"
    def output_schema(self):
        from pydantic import BaseModel
        class Out(BaseModel):
            tabs: list[ReportTab]
        return Out
    def system_prompt(self): return "sys"
    def format_message(self, signals): return "msg"
    def assemble_tabs(self, parsed, signals, request_topics):
        return list(parsed.tabs)


@pytest.mark.asyncio
async def test_run_report_happy(monkeypatch):
    out = FakeModule().output_schema()(tabs=[ReportTab(category="c", headline="h", content="b")])
    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=out)):
        signals, tabs = await run_report(FakeModule(), {"a": 1}, request_topics=None)
    assert signals["score"] == 97
    assert tabs[0].category == "c"
