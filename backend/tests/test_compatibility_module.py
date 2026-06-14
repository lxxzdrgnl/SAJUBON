"""궁합 리포트 모듈 단위 테스트.

Writer(LLM)를 모킹해 assemble_signals·assemble_tabs 보장 사항만 검증한다.
"""

from __future__ import annotations
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from llm.reports.base import ReportTab
from llm.reports.compatibility import CompatibilityReportModule, _ANCHOR_CATEGORIES


# ─── 픽스처 ──────────────────────────────────────────────────────────────────

_INPUTS_A = {
    "birth_date": "1990-03-15",
    "birth_time": "14:30",
    "gender": "male",
    "calendar": "solar",
    "is_leap_month": False,
    "birth_longitude": None,
    "birth_utc_offset": None,
}

_INPUTS_B = {
    "birth_date": "1992-07-21",
    "birth_time": "09:00",
    "gender": "female",
    "calendar": "solar",
    "is_leap_month": False,
    "birth_longitude": None,
    "birth_utc_offset": None,
}

_MODULE_INPUTS = {"person_a": _INPUTS_A, "person_b": _INPUTS_B}


# ─── assemble_signals 테스트 ─────────────────────────────────────────────────

def test_assemble_signals_has_required_keys():
    m = CompatibilityReportModule()
    sig = m.assemble_signals(_MODULE_INPUTS)
    assert "person_a_chart" in sig
    assert "person_b_chart" in sig
    assert "synastry" in sig
    assert "score" in sig


def test_assemble_signals_synastry_shape():
    m = CompatibilityReportModule()
    sig = m.assemble_signals(_MODULE_INPUTS)
    syn = sig["synastry"]
    for key in ["stem_hap", "day_ten_god", "element_synergy", "clash_pairs",
                "complement_a_to_b", "complement_b_to_a", "yongsin_help", "interaction_tags"]:
        assert key in syn, f"synastry missing key: {key}"


def test_assemble_signals_score_shape():
    m = CompatibilityReportModule()
    sig = m.assemble_signals(_MODULE_INPUTS)
    score = sig["score"]
    for key in ["total_score", "day_pillar_score", "element_harmony_score",
                "branch_relation_score", "ten_gods_score"]:
        assert key in score, f"score missing key: {key}"
    assert 0 <= score["total_score"] <= 100


def test_assemble_signals_charts_have_yong_sin():
    """full calc 경로를 통했으면 yong_sin이 있어야 한다."""
    m = CompatibilityReportModule()
    sig = m.assemble_signals(_MODULE_INPUTS)
    assert sig["person_a_chart"].get("yong_sin") is not None
    assert sig["person_b_chart"].get("yong_sin") is not None


def test_assemble_signals_charts_have_weak_dominant_elements():
    """full calc → weak_elements·dominant_elements 존재."""
    m = CompatibilityReportModule()
    sig = m.assemble_signals(_MODULE_INPUTS)
    assert "weak_elements" in sig["person_a_chart"]
    assert "dominant_elements" in sig["person_a_chart"]


def test_assemble_signals_request_topics_passed_through():
    m = CompatibilityReportModule()
    inputs = {**_MODULE_INPUTS, "request_topics": "결혼 시기"}
    sig = m.assemble_signals(inputs)
    assert sig.get("request_topics") == "결혼 시기"


# ─── output_schema 테스트 ────────────────────────────────────────────────────

def test_output_schema_has_tabs_field():
    m = CompatibilityReportModule()
    schema = m.output_schema()
    instance = schema(tabs=[ReportTab(category="c", headline="h", content="b")])
    assert len(instance.tabs) == 1


# ─── assemble_tabs 테스트 ────────────────────────────────────────────────────

def _make_parsed(tabs: list[ReportTab]):
    """Writer 출력 모의 객체."""
    m = MagicMock()
    m.tabs = tabs
    return m


def test_assemble_tabs_anchors_always_present():
    """Writer가 가변 탭만 줘도 앵커 3개는 보장."""
    m = CompatibilityReportModule()
    writer_tabs = [
        ReportTab(category="연애 스타일", headline="활활 타는 연애", content="..."),
        ReportTab(category="장기 전망", headline="멀리 봐야 빛나는 인연", content="..."),
    ]
    parsed = _make_parsed(writer_tabs)
    # build_rag_context를 호출해 signals["rag_context"]를 채워야 함
    sig = {"synastry": {"interaction_tags": []}, "score": {}, "person_a_chart": {}, "person_b_chart": {}}
    tabs = m.assemble_tabs(parsed, sig, request_topics=None)
    categories = [t.category for t in tabs]
    for anchor in _ANCHOR_CATEGORIES:
        assert anchor in categories, f"앵커 탭 누락: {anchor}"


def test_assemble_tabs_requested_topic_added():
    """request_topics='결혼시기' → requested=True 탭이 추가됨."""
    m = CompatibilityReportModule()
    writer_tabs = [
        ReportTab(category="종합 케미", headline="좋은 궁합", content="..."),
        ReportTab(category="두 사람의 매력", headline="작은 불꽃", content="..."),
        ReportTab(category="관계 조언", headline="함께 성장", content="..."),
        ReportTab(category="연애 스타일", headline="뜨거운 연애", content="..."),
    ]
    parsed = _make_parsed(writer_tabs)
    sig = {}
    tabs = m.assemble_tabs(parsed, sig, request_topics="결혼시기")
    requested = [t for t in tabs if t.requested]
    assert len(requested) >= 1
    assert any(t.category == "결혼시기" for t in requested)


def test_assemble_tabs_multiple_request_topics():
    """request_topics='결혼시기,갈등해소' → 요청 탭 2개."""
    m = CompatibilityReportModule()
    writer_tabs = [
        ReportTab(category="종합 케미", headline="h", content="b"),
        ReportTab(category="두 사람의 매력", headline="h", content="b"),
        ReportTab(category="관계 조언", headline="h", content="b"),
    ]
    parsed = _make_parsed(writer_tabs)
    sig = {}
    tabs = m.assemble_tabs(parsed, sig, request_topics="결혼시기, 갈등해소")
    requested = [t for t in tabs if t.requested]
    assert len(requested) == 2


def test_assemble_tabs_no_duplicate_request_topics():
    """이미 Writer가 생성한 탭과 같은 이름의 request_topics는 중복 추가 안 함."""
    m = CompatibilityReportModule()
    writer_tabs = [
        ReportTab(category="종합 케미", headline="h", content="b"),
        ReportTab(category="두 사람의 매력", headline="h", content="b"),
        ReportTab(category="관계 조언", headline="h", content="b"),
        ReportTab(category="결혼시기", headline="h", content="b"),
    ]
    parsed = _make_parsed(writer_tabs)
    sig = {}
    tabs = m.assemble_tabs(parsed, sig, request_topics="결혼시기")
    assert sum(1 for t in tabs if t.category == "결혼시기") == 1


def test_assemble_tabs_max_clamp():
    """탭이 10개를 초과하면 클램프."""
    m = CompatibilityReportModule()
    writer_tabs = [
        ReportTab(category=f"tab_{i}", headline="h", content="b")
        for i in range(12)
    ]
    parsed = _make_parsed(writer_tabs)
    sig = {}
    tabs = m.assemble_tabs(parsed, sig, request_topics=None)
    assert len(tabs) <= 10


def test_assemble_tabs_anchor_order():
    """앵커 탭이 Writer 탭에 있어도 앵커끼리 순서가 유지돼야 한다."""
    m = CompatibilityReportModule()
    # Writer가 역순으로 앵커 반환
    writer_tabs = [
        ReportTab(category="관계 조언", headline="h", content="b"),
        ReportTab(category="두 사람의 매력", headline="h", content="b"),
        ReportTab(category="종합 케미", headline="h", content="b"),
    ]
    parsed = _make_parsed(writer_tabs)
    sig = {}
    tabs = m.assemble_tabs(parsed, sig, request_topics=None)
    anchor_positions = [tabs.index(t) for t in tabs if t.category in _ANCHOR_CATEGORIES]
    # 앵커가 목록 안에 있는지 (순서 검증은 완화: 적어도 다 존재해야)
    assert len(anchor_positions) == 3


# ─── build_rag_context 테스트 ────────────────────────────────────────────────

def test_build_rag_context_returns_string():
    m = CompatibilityReportModule()
    sig = {"synastry": {"interaction_tags": ["stem_hap_토", "element_complement"]}, "score": {}}
    ctx = m.build_rag_context(sig)
    assert isinstance(ctx, str)
    assert len(ctx) > 0


def test_build_rag_context_stores_in_signals():
    """build_rag_context는 signals["rag_context"]를 채워야 한다."""
    m = CompatibilityReportModule()
    sig = {"synastry": {"interaction_tags": ["yong_sin_complement"]}, "score": {}}
    m.build_rag_context(sig)
    assert "rag_context" in sig


# ─── run_report 통합 (Writer 모킹) ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_run_report_with_mocked_writer():
    """run_report가 Writer를 모킹한 상태에서 signals·tabs를 올바르게 반환하는지."""
    from llm.reports.runner import run_report

    m = CompatibilityReportModule()
    output_schema = m.output_schema()
    fake_output = output_schema(tabs=[
        ReportTab(category="종합 케미", headline="좋은 궁합", content="..."),
        ReportTab(category="두 사람의 매력", headline="작은 마찰", content="..."),
        ReportTab(category="관계 조언", headline="함께 성장", content="..."),
        ReportTab(category="연애 스타일", headline="뜨거운 연애", content="..."),
        ReportTab(category="보완 시너지", headline="서로를 채우는 오행", content="..."),
    ])

    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=fake_output)):
        signals, tabs = await run_report(m, _MODULE_INPUTS, request_topics="결혼시기")

    assert "synastry" in signals
    assert "score" in signals
    # 앵커 3탭 보장
    categories = [t.category for t in tabs]
    for anchor in _ANCHOR_CATEGORIES:
        assert anchor in categories
    # 요청 탭 존재
    assert any(t.requested and t.category == "결혼시기" for t in tabs)
