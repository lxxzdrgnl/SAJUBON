"""
사주 리포트 파이프라인.

흐름:
  1. Engine.calculate_saju() — 동기 함수, ThreadPoolExecutor로 비동기 래핑
  2. llm.rag_builder.build_rag_context() — 동기 (ChromaDB + JSON 직접 조회)
  3. llm.writer.generate_report() — 비동기 (LLM ainvoke)

반환: (saju_dict, WriterOutput)
"""

from __future__ import annotations
import asyncio
import functools
import logging
from concurrent.futures import ThreadPoolExecutor

from datetime import datetime

from engine.handlers.calculate_saju import handle_calculate_saju
from engine.handlers.get_wol_un import handle_get_wol_un
from llm.rag_builder import build_rag_context
from llm.writer import WriterOutput, generate_report
from schemas.report import UnFlowOutput
from llm.writer import generate_un_flow

logger = logging.getLogger(__name__)

# 동기 계산 함수 전용 스레드 풀 (CPU-bound 아니라 I/O-light 이지만 chromadb도 동기)
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="saju-pipeline")


async def run_saju_report(
    birth_date: str,
    birth_time: str,
    gender: str,
    calendar: str = "solar",
    is_leap_month: bool = False,
    concern: str | None = None,
    birth_longitude: float | None = None,
    birth_utc_offset: int | None = None,
    llm_provider: str | None = None,
) -> tuple[dict, WriterOutput]:
    """
    사주 계산 → RAG 조회 → Writer LLM 생성을 순차 실행한다.

    Args:
        birth_date     : 'YYYY-MM-DD'
        birth_time     : 'HH:MM'
        gender         : 'male' | 'female'
        calendar       : 'solar' | 'lunar'
        is_leap_month  : 음력 윤달 여부
        concern        : 사용자 고민 원문 (없으면 None)
        llm_provider   : LLM provider 오버라이드

    Returns:
        (saju_dict, WriterOutput)
    """
    saju, rag_ctx = await _prepare_saju_context(
        birth_date=birth_date,
        birth_time=birth_time,
        gender=gender,
        calendar=calendar,
        is_leap_month=is_leap_month,
        concern=concern,
        birth_longitude=birth_longitude,
        birth_utc_offset=birth_utc_offset,
    )

    # ── 3. Writer LLM 호출 (비동기) ──
    logger.info("Writer LLM 호출 시작")
    writer_output: WriterOutput = await generate_report(saju, rag_ctx, concern, llm_provider)
    logger.info("Writer LLM 완료: 탭 %d개 생성", len(writer_output.tabs))

    return saju, writer_output


async def _prepare_saju_context(
    *,
    birth_date: str,
    birth_time: str,
    gender: str,
    calendar: str = "solar",
    is_leap_month: bool = False,
    concern: str | None = None,
    birth_longitude: float | None = None,
    birth_utc_offset: int | None = None,
) -> tuple[dict, dict]:
    """사주 계산 + RAG 컨텍스트 조립 (LLM 호출 이전 단계). Writer/UnFlow가 공유한다."""
    loop = asyncio.get_running_loop()

    # ── 1. Engine 계산 (동기 → executor) ──
    logger.info("사주 계산 시작: %s %s %s", birth_date, birth_time, gender)
    calc_fn = functools.partial(
        handle_calculate_saju,
        birth_date=birth_date,
        birth_time=birth_time,
        gender=gender,
        calendar=calendar,
        is_leap_month=is_leap_month,
        birth_longitude=birth_longitude,
        birth_utc_offset=birth_utc_offset,
    )
    saju: dict = await loop.run_in_executor(_executor, calc_fn)
    logger.info("사주 계산 완료: 일주=%s%s",
                saju.get("day_pillar", {}).get("stem", ""),
                saju.get("day_pillar", {}).get("branch", ""))

    # ── 2. RAG 컨텍스트 조립 (동기, 빠름) ──
    logger.info("RAG 컨텍스트 조립 시작")
    rag_ctx_fn = functools.partial(build_rag_context, saju, concern)
    rag_ctx: dict = await loop.run_in_executor(_executor, rag_ctx_fn)
    logger.info(
        "RAG 조립 완료: ilju=%s, context=%d개, concern=%d개",
        "있음" if rag_ctx.get("ilju") else "없음",
        len(rag_ctx.get("context", [])),
        len(rag_ctx.get("concern", [])),
    )
    return saju, rag_ctx


async def run_saju_report_full(
    birth_date: str,
    birth_time: str,
    gender: str,
    calendar: str = "solar",
    is_leap_month: bool = False,
    concern: str | None = None,
    birth_longitude: float | None = None,
    birth_utc_offset: int | None = None,
    llm_provider: str | None = None,
    year: int | None = None,
) -> tuple[dict, WriterOutput, UnFlowOutput]:
    """사주 계산·RAG를 1회만 하고, 본 리포트(Writer)와 올해의 흐름(UnFlow) LLM을
    **동시에** 호출한다. 두 호출은 같은 saju만 의존하므로 병렬이 안전하며,
    순차(≈Writer+UnFlow) 대비 벽시계 시간이 ≈max(Writer, UnFlow)로 줄어든다.
    """
    saju, rag_ctx = await _prepare_saju_context(
        birth_date=birth_date,
        birth_time=birth_time,
        gender=gender,
        calendar=calendar,
        is_leap_month=is_leap_month,
        concern=concern,
        birth_longitude=birth_longitude,
        birth_utc_offset=birth_utc_offset,
    )

    logger.info("Writer·UnFlow LLM 동시 호출 시작")
    writer_output, un_flow = await asyncio.gather(
        generate_report(saju, rag_ctx, concern, llm_provider),
        run_un_flow(saju, year, llm_provider),
    )
    logger.info("Writer·UnFlow 완료: 탭 %d개", len(writer_output.tabs))
    return saju, writer_output, un_flow


async def run_un_flow(
    saju: dict,
    year: int | None = None,
    llm_provider: str | None = None,
) -> UnFlowOutput:
    """
    이미 계산된 사주 dict로 올해의 흐름·대운 해설을 생성한다.

    Args:
        saju         : run_saju_report()가 반환한 saju dict
        year         : 대상 연도 (None이면 올해)
        llm_provider : LLM provider 오버라이드

    Returns:
        UnFlowOutput (year_flow + dae_un_analysis)
    """
    loop = asyncio.get_running_loop()
    target_year = year or datetime.now().year
    day_stem = saju.get("day_pillar", {}).get("stem", "")

    # ── 월운 12개 (동기 계산 → executor) ──
    wol_fn = functools.partial(handle_get_wol_un, year=target_year, day_stem=day_stem)
    months: list[dict] = await loop.run_in_executor(_executor, wol_fn)

    # ── 올해의 흐름·대운 해설 LLM 호출 ──
    logger.info("UnFlow LLM 호출 시작: year=%d", target_year)
    un_flow: UnFlowOutput = await generate_un_flow(saju, months, target_year, llm_provider)
    logger.info("UnFlow LLM 완료: 월 %d개", len(un_flow.year_flow.months))

    return un_flow
