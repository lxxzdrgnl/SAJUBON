"""
Writer LLM — PydanticOutputParser 기반 사주 리포트 생성기.

입력: 사주 계산 결과 + RAG 컨텍스트 + 사용자 고민
출력: WriterOutput (10개 결론형 탭)
"""

from __future__ import annotations
import logging
from typing import TypeVar
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel

from schemas.report import WriterOutput, UnFlowOutput
from schemas.question import ConsultationOutput
from llm.providers import get_llm
from llm.prompts import SYSTEM_PROMPT, format_user_message, QUESTION_SYSTEM_PROMPT, format_question_message
from llm.prompts.report import build_system_prompt
from llm.prompts.un_flow import UN_FLOW_SYSTEM_PROMPT, format_un_flow_message, build_un_flow_system_prompt
from llm.prompts.question import build_question_system_prompt

logger = logging.getLogger(__name__)

_T = TypeVar("_T", bound=BaseModel)


async def _parse_with_recovery(
    llm,
    raw: str,
    parser: PydanticOutputParser[_T],
    format_instructions: str,
) -> _T:
    """파싱 실패 시 JSON 수정 프롬프트로 한 번 재시도한다."""
    try:
        return parser.parse(raw)
    except Exception as parse_exc:
        logger.warning("1차 파싱 실패, 재시도: %s", parse_exc)
        try:
            fix_messages = [
                SystemMessage(content="You are a JSON fixer. Return only valid JSON."),
                HumanMessage(content=(
                    f"Fix the following output to match this schema:\n"
                    f"{format_instructions}\n\n"
                    f"Original output:\n{raw}\n\n"
                    f"Return ONLY the fixed JSON, no explanation."
                )),
            ]
            fix_response = await llm.ainvoke(fix_messages)
            fix_raw = fix_response.content if hasattr(fix_response, "content") else str(fix_response)
            return parser.parse(fix_raw)
        except Exception as fix_exc:
            logger.error("2차 파싱도 실패: %s", fix_exc)
            raise RuntimeError(f"출력 파싱 최종 실패: {fix_exc}") from fix_exc


async def generate_report(
    saju: dict,
    rag_ctx: dict,
    concern: str | None = None,
    provider: str | None = None,
    language: str = "ko",
) -> WriterOutput:
    """
    사주 데이터 + RAG 컨텍스트를 받아 WriterOutput을 생성한다.

    Args:
        saju     : handle_calculate_saju() 반환 dict
        rag_ctx  : build_rag_context() 반환 dict
        concern  : 사용자 고민 원문
        provider : LLM provider 오버라이드 (None → settings 기본값)

    Returns:
        WriterOutput (tabs: list[TabContent])
    """
    # 10탭 장문 구조화 — 가장 무겁고 호출 빈도 낮은 작업이라 full gpt-4.1로 품질 우선.
    llm = get_llm(provider, model="gpt-4.1")

    # ── 1. PydanticOutputParser 생성 ──
    parser: PydanticOutputParser[WriterOutput] = PydanticOutputParser(
        pydantic_object=WriterOutput
    )
    format_instructions = parser.get_format_instructions()

    # ── 2. 메시지 조립 ──
    user_text = format_user_message(saju, rag_ctx, concern, format_instructions)
    messages = [
        SystemMessage(content=build_system_prompt(language)),
        HumanMessage(content=user_text),
    ]

    # ── 3. LLM 호출 + 파싱 (기본 탭 10개 미달 시 1회 재생성) ──
    MIN_BASE_TABS = 10
    out: WriterOutput | None = None
    for attempt in range(2):
        try:
            response = await llm.ainvoke(messages)
            raw = response.content if hasattr(response, "content") else str(response)
        except Exception as exc:
            logger.error("Writer LLM 호출 실패: %s", exc)
            raise

        out = await _parse_with_recovery(llm, raw, parser, format_instructions)
        base_count = sum(1 for t in out.tabs if not getattr(t, "requested", False))
        if base_count >= MIN_BASE_TABS:
            return out
        logger.warning("기본 탭 %d개 (<%d) — 재생성 %d/1", base_count, MIN_BASE_TABS, attempt + 1)
        messages.append(response)
        messages.append(HumanMessage(content=(
            f"기본 탭이 {base_count}개뿐입니다. 지시된 10개 카테고리"
            "(성격·직업·재물·연애·건강·학업·가족·대인관계·시기 흐름·총평)를 "
            "각각 1개씩 모두 포함해 전체 JSON을 다시 출력하세요. 요청 주제 탭도 유지하세요."
        )))
    # 재시도까지 미달이면 있는 만큼이라도 반환 (graceful degrade — 빈 응답보다 낫다)
    return out  # type: ignore[return-value]


async def generate_consultation(
    saju: dict,
    rag_ctx: dict,
    question: str,
    category: str = "general",
    provider: str | None = None,
    language: str = "ko",
) -> ConsultationOutput:
    """
    한줄 상담 LLM 호출 — ConsultationOutput(headline, content) 반환.
    """
    llm = get_llm(provider)

    parser: PydanticOutputParser[ConsultationOutput] = PydanticOutputParser(
        pydantic_object=ConsultationOutput
    )
    format_instructions = parser.get_format_instructions()

    user_text = format_question_message(saju, rag_ctx, question, category, format_instructions)
    messages = [
        SystemMessage(content=build_question_system_prompt(language)),
        HumanMessage(content=user_text),
    ]

    try:
        response = await llm.ainvoke(messages)
        raw = response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        logger.error("Consultation LLM 호출 실패: %s", exc)
        raise

    return await _parse_with_recovery(llm, raw, parser, format_instructions)


async def generate_un_flow(
    saju: dict,
    months: list[dict],
    year: int,
    provider: str | None = None,
    language: str = "ko",
) -> UnFlowOutput:
    """
    사주 + 올해 월운 12개 + 대상 연도를 받아 올해의 흐름·대운 해설을 생성한다.

    Args:
        saju     : handle_calculate_saju() 반환 dict (current_dae_un·dae_un_list 포함)
        months   : handle_get_wol_un() 반환 12개 리스트
        year     : 대상 연도
        provider : LLM provider 오버라이드

    Returns:
        UnFlowOutput (year_flow + dae_un_analysis)
    """
    # 연운·대운 구조화 해설 — mini로.
    llm = get_llm(provider, model="gpt-4.1-mini")

    parser: PydanticOutputParser[UnFlowOutput] = PydanticOutputParser(
        pydantic_object=UnFlowOutput
    )
    format_instructions = parser.get_format_instructions()

    user_text = format_un_flow_message(saju, months, year, format_instructions)
    messages = [
        SystemMessage(content=build_un_flow_system_prompt(language)),
        HumanMessage(content=user_text),
    ]

    try:
        response = await llm.ainvoke(messages)
        raw = response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        logger.error("UnFlow LLM 호출 실패: %s", exc)
        raise

    return await _parse_with_recovery(llm, raw, parser, format_instructions)
