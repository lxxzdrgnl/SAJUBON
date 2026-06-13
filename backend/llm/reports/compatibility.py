"""
궁합 리포트 모듈 — ReportModule 계약 구현.

assemble_signals : 두 사람 사주 전체 계산 + synastry + compatibility score
build_rag_context: interaction_tags 기반 태그 문자열 (태그 인덱스 직접 조회)
output_schema    : {tabs: list[ReportTab]}
system_prompt    : 궁합 Writer 시스템 프롬프트
format_message   : signals → Writer 입력 메시지
assemble_tabs    : 앵커 3탭 보장 + request_topics 요청 탭 추가 + 5~8개 클램프
"""

from __future__ import annotations
import functools
import logging
from typing import Any

from pydantic import BaseModel

from engine.handlers.calculate_saju import handle_calculate_saju
from engine.calc.synastry import synastry_for_report
from engine.calc.compatibility import check_compatibility
from llm.reports.base import ReportTab
from llm.prompts.compatibility_report import build_compatibility_system_prompt, format_message as _fmt_msg

logger = logging.getLogger(__name__)

# ─── 앵커 탭 카테고리 (항상 포함) ─────────────────────────────────────────────
_ANCHOR_CATEGORIES = ["종합 케미", "갈등 포인트", "관계 조언"]

# 앵커 탭이 Writer 출력에 없을 때 사용하는 폴백 헤드라인
_ANCHOR_FALLBACK: dict[str, str] = {
    "종합 케미": "두 사람이 만들어내는 고유한 에너지",
    "갈등 포인트": "서로 다른 리듬 — 인식해야 할 마찰",
    "관계 조언": "함께 더 멀리 가기 위한 실천 조언",
}


class _WriterOutput(BaseModel):
    """Writer LLM 궁합 탭 출력 스키마."""
    tabs: list[ReportTab]


class CompatibilityReportModule:
    """궁합 리포트 ReportModule 구현체."""

    key = "compatibility"

    # ── assemble_signals ────────────────────────────────────────────────────

    def assemble_signals(self, inputs: dict) -> dict:
        """
        두 사람 BirthInput → 전체 사주 계산 + synastry + score.

        inputs 키:
          person_a : BirthInput-like dict (birth_date, birth_time, gender, …)
          person_b : BirthInput-like dict
          request_topics : str | None (선택)
        """
        a = inputs["person_a"]
        b = inputs["person_b"]

        # BirthInput이 Pydantic 모델이거나 dict 모두 지원
        def _get(obj, key, default=None):
            if hasattr(obj, key):
                return getattr(obj, key)
            if isinstance(obj, dict):
                return obj.get(key, default)
            return default

        chart_a = handle_calculate_saju(
            birth_date=_get(a, "birth_date"),
            birth_time=_get(a, "birth_time"),
            gender=_get(a, "gender"),
            calendar=_get(a, "calendar", "solar"),
            is_leap_month=_get(a, "is_leap_month", False),
            birth_longitude=_get(a, "birth_longitude"),
            birth_utc_offset=_get(a, "birth_utc_offset"),
        )

        chart_b = handle_calculate_saju(
            birth_date=_get(b, "birth_date"),
            birth_time=_get(b, "birth_time"),
            gender=_get(b, "gender"),
            calendar=_get(b, "calendar", "solar"),
            is_leap_month=_get(b, "is_leap_month", False),
            birth_longitude=_get(b, "birth_longitude"),
            birth_utc_offset=_get(b, "birth_utc_offset"),
        )

        syn = synastry_for_report(chart_a, chart_b)
        score = check_compatibility(chart_a, chart_b)

        return {
            "person_a_chart": chart_a,
            "person_b_chart": chart_b,
            "synastry": syn,
            "score": score,
            "request_topics": inputs.get("request_topics"),
        }

    # ── build_rag_context ───────────────────────────────────────────────────

    def build_rag_context(self, signals: dict) -> str:
        """
        interaction_tags 기반 간결한 태그 컨텍스트 문자열 반환.

        무거운 벡터 검색 대신 synastry interaction_tags를 직접 활용한다.
        signals["rag_context"]에 저장해 format_message가 그대로 사용한다.
        """
        syn = signals.get("synastry", {})
        tags = syn.get("interaction_tags", [])

        # 태그→한국어 설명 매핑 (RAG 인덱스에 없는 경우 태그명 그대로)
        _TAG_KO: dict[str, str] = {
            "yong_sin_complement": "용신 보완 관계 — 서로의 부족한 기운을 채워줌",
            "same_yong_sin_element": "같은 용신 오행 — 독립적 성향, 경쟁보다 각자의 길",
            "element_complement": "오행 결핍 상호 보완 관계",
            "element_balanced_both": "두 사람 모두 오행 균형 — 안정적 에너지",
        }

        lines: list[str] = []
        for tag in tags:
            if tag in _TAG_KO:
                lines.append(f"  • {_TAG_KO[tag]}")
            elif tag.startswith("stem_hap_"):
                el = tag.split("_")[-1]
                lines.append(f"  • 천간합화 → {el}으로 합화됨")
            elif tag.startswith("branch_clash_"):
                parts = tag.split("_")
                if len(parts) >= 4:
                    lines.append(f"  • 지지충 {parts[2]}-{parts[3]} — 긴장·갈등 요인")
            elif tag.startswith("ilju_tengod_"):
                tg = tag.split("ilju_tengod_")[-1]
                lines.append(f"  • A 기준 B 십성: {tg}")
            elif tag.startswith("element_"):
                interaction = tag.split("element_")[-1]
                lines.append(f"  • 오행 상호작용: {interaction}")

        ctx = "\n".join(lines) if lines else "  • 특별한 상호작용 신호 없음"
        # signals에 삽입해 format_message가 활용하도록
        signals["rag_context"] = ctx
        return ctx

    # ── output_schema ───────────────────────────────────────────────────────

    def output_schema(self) -> type[BaseModel]:
        return _WriterOutput

    # ── system_prompt ───────────────────────────────────────────────────────

    def system_prompt(self, language: str = "ko") -> str:
        return build_compatibility_system_prompt(language)

    # ── format_message ──────────────────────────────────────────────────────

    def format_message(self, signals: dict) -> str:
        return _fmt_msg(signals)

    # ── assemble_tabs ───────────────────────────────────────────────────────

    def assemble_tabs(
        self,
        parsed: Any,
        signals: dict,
        request_topics: str | None,
    ) -> list[ReportTab]:
        """
        Writer 탭 조립.

        1. Writer 출력 탭을 기반으로 시작.
        2. 앵커 3탭(종합 케미·갈등 포인트·관계 조언) 누락 시 삽입.
        3. request_topics 쉼표 분리 → requested=True 탭 추가.
        4. 총 탭을 5~8개로 클램프.
        """
        writer_tabs: list[ReportTab] = list(parsed.tabs) if parsed else []

        # 앵커 보장 — 누락 시 폴백 탭 앞에 삽입
        existing_categories = {t.category for t in writer_tabs}
        anchor_tabs_to_prepend: list[ReportTab] = []
        for cat in _ANCHOR_CATEGORIES:
            if cat not in existing_categories:
                fallback_headline = _ANCHOR_FALLBACK.get(cat, cat)
                anchor_tabs_to_prepend.append(
                    ReportTab(
                        category=cat,
                        headline=fallback_headline,
                        content=f"[{cat}에 대한 분석 내용]",
                        requested=False,
                    )
                )

        # 앵커는 Writer 탭 앞에 위치 (앵커 순서 유지)
        base_tabs = anchor_tabs_to_prepend + [
            t for t in writer_tabs if t.category not in _ANCHOR_CATEGORIES
        ]

        # 앵커가 Writer 탭에 이미 있는 경우 — 앞으로 이동
        anchor_from_writer = [t for t in writer_tabs if t.category in _ANCHOR_CATEGORIES]
        # 앵커 순서를 _ANCHOR_CATEGORIES 순서로 정렬
        anchor_from_writer.sort(key=lambda t: _ANCHOR_CATEGORIES.index(t.category) if t.category in _ANCHOR_CATEGORIES else 99)

        variable_tabs = [t for t in writer_tabs if t.category not in _ANCHOR_CATEGORIES]
        tabs = anchor_from_writer + anchor_tabs_to_prepend + variable_tabs

        # request_topics 요청 탭 추가
        requested_tabs: list[ReportTab] = []
        if request_topics:
            existing_in_all = {t.category for t in tabs}
            for topic in [t.strip() for t in request_topics.split(",") if t.strip()]:
                if topic not in existing_in_all:
                    requested_tabs.append(
                        ReportTab(
                            category=topic,
                            headline=f"{topic}에 대한 분석",
                            content=f"[{topic}에 대한 맞춤 분석]",
                            requested=True,
                        )
                    )
                    existing_in_all.add(topic)

        all_tabs = tabs + requested_tabs

        # 최소 5탭 보장 (앵커 3 + 가변 최소 2)
        MIN_TABS = 5
        MAX_TABS = 8
        if len(all_tabs) < MIN_TABS:
            # 부족하면 그대로 반환 (Writer가 충분히 못 만든 경우)
            pass
        elif len(all_tabs) > MAX_TABS:
            # 요청 탭은 보존, 나머지 클램프
            req_part = [t for t in all_tabs if t.requested]
            non_req = [t for t in all_tabs if not t.requested]
            allowed_non_req = MAX_TABS - len(req_part)
            all_tabs = non_req[:max(allowed_non_req, 3)] + req_part

        return all_tabs
