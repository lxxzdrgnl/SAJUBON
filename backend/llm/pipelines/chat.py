"""LangGraph ReAct 채팅 에이전트 그래프."""

from __future__ import annotations
from typing import Annotated

from langchain_core.messages import AIMessage, SystemMessage, HumanMessage, BaseMessage
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
    block_msg, _category, is_instant = await guard_and_classify(
        question=last_msg.content,
        history=history[-6:],
    )
    if block_msg == "OFFTOPIC":
        # 채팅에서는 LLM 분류만으로 범위 밖 처리하지 않는다 — "뭔소리야 방금 말했잖아" 같은 되받음이 오분류된다.
        # 명백한 키워드(프로그래밍·숙제 등)가 있을 때만 고정 안내, 나머지는 에이전트가 맥락으로 답한다.
        from llm.guard import _OFFTOPIC_KW
        if not any(kw in last_msg.content.lower() for kw in _OFFTOPIC_KW):
            block_msg = None
    if is_instant:
        # INSTANT("헤드라인|||본문")는 한줄 상담 전용 포맷. 채팅에선 맥락(첨부·이전 턴)을 아는 에이전트가 답한다.
        # ("뭔소리야 첨부했잖아" 같은 되받음이 INSTANT로 분류돼 구분자째 노출되던 문제)
        return {}
    if block_msg:
        # 센티널은 고정 문구로 변환 — "MEDICAL" 같은 내부 토큰이 사용자에게 그대로 보이던 문제
        from llm.guard import CRISIS_RESPONSE, OFFTOPIC_RESPONSE, MEDICAL_CHAT_RESPONSE
        fixed = {
            "CRISIS": f"**{CRISIS_RESPONSE['headline']}**\n\n{CRISIS_RESPONSE['content']}",
            "OFFTOPIC": OFFTOPIC_RESPONSE["content"],
            "MEDICAL": MEDICAL_CHAT_RESPONSE,
        }
        return {"messages": [AIMessage(content=fixed.get(block_msg, block_msg))]}
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
    # parallel_tool_calls=False — 차트 tool을 한 턴에 몰아 호출하지 않고 하나씩 부르게 해,
    # 차트 사이에 설명 단락이 끼어 [차트]+해설 인터리브로 스트리밍되게 한다.
    llm = get_llm(provider="openai", model="gpt-4.1-mini").bind_tools(
        CHAT_TOOLS, parallel_tool_calls=False
    )
    language = state.get("language", "ko")
    system = build_chat_system_prompt(state["saju_summary"], language=language)

    # 모델이 몰라서 생기던 실패 두 가지를 막는다:
    #  - 사용자 생년월일이 없어 "1살 연상" 연도를 엉뚱하게 추정 (1995년생인데 1991로 계산)
    #  - 상대가 첨부돼 있어도 모델은 모른 채 request_partner_profile을 다시 띄움
    # (`from __future__ import annotations` 때문에 config 파라미터 주입이 문자열 타입 힌트로 깨져서 get_config()를 쓴다)
    try:
        from langgraph.config import get_config
        configurable = (get_config() or {}).get("configurable", {}) or {}
    except Exception:  # noqa: BLE001 — 그래프 밖에서 직접 호출될 때
        configurable = {}
    birth = configurable.get("birth_info") or state.get("birth_info") or {}
    extra: list[str] = []
    if birth.get("birth_date"):
        extra.append(
            f"[사용자 생년월일] {birth['birth_date']} {birth.get('birth_time') or '(시간 모름)'} "
            f"— '1살 연상' = {int(birth['birth_date'][:4]) - 1}년생, '1살 연하' = {int(birth['birth_date'][:4]) + 1}년생처럼 이 값으로 계산한다."
        )
    partner = configurable.get("partner_info")
    if partner:
        extra.append(
            f"[첨부된 상대 만세력] {partner.get('name') or '상대방'} · {partner.get('birth_date')} "
            f"{partner.get('birth_time') or '(출생 시간 없음 — 시주 없이 분석 가능, 다시 묻지 말 것)'} · "
            f"{'남성' if partner.get('gender') == 'male' else '여성'}\n"
            f"→ 궁합·상대 관련 질문이면 `request_partner_profile`을 부르지 말고 **`get_compatibility_detail`을 인자 없이 바로 호출**한다."
        )
    if extra:
        system = system + "\n\n" + "\n".join(extra)
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
