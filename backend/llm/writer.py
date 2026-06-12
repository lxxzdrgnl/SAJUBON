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
from llm.prompts.un_flow import UN_FLOW_SYSTEM_PROMPT, format_un_flow_message

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
    llm = get_llm(provider)

    # ── 1. PydanticOutputParser 생성 ──
    parser: PydanticOutputParser[WriterOutput] = PydanticOutputParser(
        pydantic_object=WriterOutput
    )
    format_instructions = parser.get_format_instructions()

    # ── 2. 메시지 조립 ──
    user_text = format_user_message(saju, rag_ctx, concern, format_instructions)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_text),
    ]

    # ── 3. LLM 호출 ──
    try:
        response = await llm.ainvoke(messages)
        raw = response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        logger.error("Writer LLM 호출 실패: %s", exc)
        raise

    # ── 4. 파싱 (실패 시 JSON 수정 프롬프트로 재시도) ──
    return await _parse_with_recovery(llm, raw, parser, format_instructions)


async def generate_consultation(
    saju: dict,
    rag_ctx: dict,
    question: str,
    category: str = "general",
    provider: str | None = None,
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
        SystemMessage(content=QUESTION_SYSTEM_PROMPT),
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
    llm = get_llm(provider)

    parser: PydanticOutputParser[UnFlowOutput] = PydanticOutputParser(
        pydantic_object=UnFlowOutput
    )
    format_instructions = parser.get_format_instructions()

    user_text = format_un_flow_message(saju, months, year, format_instructions)
    messages = [
        SystemMessage(content=UN_FLOW_SYSTEM_PROMPT),
        HumanMessage(content=user_text),
    ]

    try:
        response = await llm.ainvoke(messages)
        raw = response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        logger.error("UnFlow LLM 호출 실패: %s", exc)
        raise

    return await _parse_with_recovery(llm, raw, parser, format_instructions)
