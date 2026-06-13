# backend/llm/reports/runner.py
from __future__ import annotations
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.messages import SystemMessage, HumanMessage

from llm.reports.base import ReportModule, ReportTab
from llm.providers import get_llm
from llm.writer import _parse_with_recovery


async def _invoke_writer(module: ReportModule, signals: dict, language: str = "ko"):
    schema = module.output_schema()
    parser = PydanticOutputParser(pydantic_object=schema)
    llm = get_llm("openai", model="gpt-4.1")
    format_instructions = parser.get_format_instructions()
    sys = module.system_prompt(language) + "\n\n" + format_instructions
    msg = module.format_message(signals)
    resp = await llm.ainvoke([SystemMessage(content=sys), HumanMessage(content=msg)])
    raw = resp.content if hasattr(resp, "content") else str(resp)
    return await _parse_with_recovery(llm, raw, parser, format_instructions)


async def run_report(
    module: ReportModule,
    inputs: dict,
    *,
    request_topics: str | None,
    language: str = "ko",
) -> tuple[dict, list[ReportTab]]:
    signals = module.assemble_signals(inputs)
    _ = module.build_rag_context(signals)  # 컨텍스트는 format_message가 signals와 함께 사용
    parsed = await _invoke_writer(module, signals, language)
    tabs = module.assemble_tabs(parsed, signals, request_topics)
    return signals, tabs
