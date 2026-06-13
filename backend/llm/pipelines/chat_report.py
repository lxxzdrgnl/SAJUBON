"""채팅 히스토리 → 상담 리포트 파이프라인."""

from __future__ import annotations
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage, SystemMessage
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel

from llm.providers import get_llm
from llm.prompts.chat import build_chat_report_prompt
from llm.writer import _parse_with_recovery


class ChatReportOutput(BaseModel):
    summary: str
    key_insights: list[str]
    advice: list[str]
    topics_covered: list[str]


async def run_chat_report(
    messages: list[BaseMessage],
    saju_summary: dict,
    provider: str | None = None,
) -> ChatReportOutput:
    """채팅 메시지 목록 + saju_summary → ChatReportOutput."""
    lines = []
    for m in messages:
        if isinstance(m, HumanMessage):
            lines.append(f"사용자: {m.content}")
        elif isinstance(m, AIMessage) and m.content:
            lines.append(f"상담사: {m.content}")
    conversation = "\n".join(lines)

    if not conversation.strip():
        return ChatReportOutput(
            summary="대화 내용이 없습니다.",
            key_insights=[],
            advice=[],
            topics_covered=[],
        )

    llm = get_llm(provider)
    parser = PydanticOutputParser(pydantic_object=ChatReportOutput)
    prompt = build_chat_report_prompt(saju_summary, conversation)

    raw = await llm.ainvoke([SystemMessage(content=prompt)])
    return await _parse_with_recovery(llm, raw, parser, parser.get_format_instructions())
