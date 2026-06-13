"""LangGraph ReAct 채팅 에이전트 그래프."""

from __future__ import annotations
from typing import Annotated

from langchain_core.messages import AIMessage, SystemMessage, HumanMessage, BaseMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from typing_extensions import TypedDict

from llm.guard import guard_and_classify
from llm.providers import get_llm
from llm.prompts.chat import build_chat_system_prompt
from llm.tools.saju_tools import (
    search_rag, get_daily_fortune, get_wol_un, get_dae_un,
    get_yeon_un, get_il_jin, convert_calendar,
    get_current_luck_overview, find_favorable_periods,
    evaluate_specific_date, explain_past_event, check_current_sin_sal_timing,
    get_compatibility_detail, request_partner_profile,
    get_wuxing_balance, get_ten_gods, get_sin_sal, get_palja, get_strength,
    get_twelve_un_seong, get_hap_chung,
)

CHAT_TOOLS = [
    search_rag, get_daily_fortune, get_wol_un, get_dae_un,
    get_yeon_un, get_il_jin, convert_calendar,
    get_current_luck_overview, find_favorable_periods,
    evaluate_specific_date, explain_past_event, check_current_sin_sal_timing,
    get_compatibility_detail, request_partner_profile,
    get_wuxing_balance, get_ten_gods, get_sin_sal, get_palja, get_strength,
    get_twelve_un_seong, get_hap_chung,
]


class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    birth_info: dict
    saju_summary: dict
    language: str  # "ko" | "en" — 기본 "ko", 세션 생성 시 설정


async def guard_node(state: ChatState) -> dict:
    """입력 검증 + 차단."""
    last_msg = state["messages"][-1]
    history = [
        {"role": "user" if isinstance(m, HumanMessage) else "ai", "content": m.content}
        for m in state["messages"][:-1]
        if hasattr(m, "content")
    ]
    block_msg, _category, _is_instant = await guard_and_classify(
        question=last_msg.content,
        history=history[-6:],
    )
    if block_msg:
        return {"messages": [AIMessage(content=block_msg)]}
    return {}


def route_guard(state: ChatState) -> str:
    """guard 후 라우팅: 차단됐으면 END, 아니면 agent."""
    last = state["messages"][-1]
    if isinstance(last, AIMessage):
        return "blocked"
    return "agent"


async def agent_node(state: ChatState) -> dict:
    """LLM 추론 — saju_summary를 시스템 프롬프트에 주입.

    OpenAI(gpt-4.1-mini)를 쓴다 — Gemini는 tool 호출 규율이 약해 흐름 질문에
    차트 tool을 안 불러서, 차트가 핵심인 채팅은 OpenAI로 고정. tool 판단·답변
    품질을 위해 nano보다 mini로.
    """
    llm = get_llm(provider="openai", model="gpt-4.1-mini").bind_tools(CHAT_TOOLS)
    language = state.get("language", "ko")
    system = build_chat_system_prompt(state["saju_summary"], language=language)
    messages = [SystemMessage(content=system)] + list(state["messages"])
    response = await llm.ainvoke(messages)
    return {"messages": [response]}


def should_continue(state: ChatState) -> str:
    """tool 호출 여부에 따라 분기."""
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return "end"


def build_chat_graph(checkpointer):
    """LangGraph 그래프 빌드 + checkpointer 연결."""
    builder = StateGraph(ChatState)
    builder.add_node("guard", guard_node)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", ToolNode(CHAT_TOOLS))

    builder.set_entry_point("guard")
    builder.add_conditional_edges(
        "guard",
        route_guard,
        {"blocked": END, "agent": "agent"},
    )
    builder.add_conditional_edges(
        "agent",
        should_continue,
        {"tools": "tools", "end": END},
    )
    builder.add_edge("tools", "agent")

    return builder.compile(checkpointer=checkpointer)
