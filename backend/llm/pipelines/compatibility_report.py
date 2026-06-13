"""
궁합 리포트 파이프라인.

흐름:
  1. CompatibilityReportModule.assemble_signals() — engine 계산 (동기, executor)
  2. run_report(module, inputs, request_topics) — RAG + Writer
  3. signals에서 score·synastry 추출 → (score, synastry, tabs) 반환

반환: (score_dict, synastry_dict, tabs)
"""

from __future__ import annotations
import asyncio
import functools
import logging
from concurrent.futures import ThreadPoolExecutor

from llm.reports.runner import run_report
from llm.reports.compatibility import CompatibilityReportModule
from llm.reports.base import ReportTab

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="compat-pipeline")


async def run_compatibility_report(
    req,  # CompatibilityReportRequest — 순환 임포트 방지용 duck typing
) -> tuple[dict, dict, list[ReportTab]]:
    """
    궁합 리포트 생성 파이프라인.

    Args:
        req : CompatibilityReportRequest (또는 .person_a/.person_b/.request_topics/.language 를 가진 객체)

    Returns:
        (score_dict, synastry_dict, tabs)
        score_dict   : check_compatibility 반환 dict
        synastry_dict: synastry_for_report 반환 dict
        tabs         : list[ReportTab]
    """
    module = CompatibilityReportModule()

    # person_a/b: Pydantic 모델이거나 dict 모두 지원
    inputs = {
        "person_a": req.person_a if hasattr(req, "person_a") else req["person_a"],
        "person_b": req.person_b if hasattr(req, "person_b") else req["person_b"],
        "request_topics": (
            req.request_topics if hasattr(req, "request_topics") else req.get("request_topics")
        ),
    }

    request_topics = inputs["request_topics"]
    language = req.language if hasattr(req, "language") else req.get("language", "ko")

    logger.info(
        "궁합 리포트 파이프라인 시작: person_a=%s, person_b=%s",
        getattr(inputs["person_a"], "birth_date", None) or inputs["person_a"].get("birth_date", "?"),
        getattr(inputs["person_b"], "birth_date", None) or inputs["person_b"].get("birth_date", "?"),
    )

    signals, tabs = await run_report(module, inputs, request_topics=request_topics, language=language)

    score = signals["score"]
    synastry = signals["synastry"]

    logger.info(
        "궁합 리포트 완료: 종합 점수=%s, 탭 %d개",
        score.get("total_score", "?"),
        len(tabs),
    )

    return score, synastry, tabs
