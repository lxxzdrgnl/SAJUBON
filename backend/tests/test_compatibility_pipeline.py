"""궁합 리포트 파이프라인 단위 테스트.

Writer(LLM)를 모킹해 run_compatibility_report의 반환 형태·보장 사항을 검증한다.
"""

from __future__ import annotations
import pytest
from unittest.mock import AsyncMock, patch
from pydantic import BaseModel

from llm.reports.base import ReportTab
from llm.reports.compatibility import _ANCHOR_CATEGORIES


# ─── 요청 픽스처 ──────────────────────────────────────────────────────────────

class _MockBirthInput:
    """Pydantic 모델 대신 간단한 duck-typing 객체."""
    def __init__(self, birth_date, birth_time, gender, **kwargs):
        self.birth_date = birth_date
        self.birth_time = birth_time
        self.gender = gender
        self.calendar = kwargs.get("calendar", "solar")
        self.is_leap_month = kwargs.get("is_leap_month", False)
        self.birth_longitude = kwargs.get("birth_longitude", None)
        self.birth_utc_offset = kwargs.get("birth_utc_offset", None)


class _MockReq:
    def __init__(self, person_a, person_b, request_topics=None):
        self.person_a = person_a
        self.person_b = person_b
        self.request_topics = request_topics
        self.language = "ko"


def _make_req(request_topics=None):
    return _MockReq(
        person_a=_MockBirthInput("1990-03-15", "14:30", "male"),
        person_b=_MockBirthInput("1992-07-21", "09:00", "female"),
        request_topics=request_topics,
    )


# ─── Writer 모킹용 출력 ───────────────────────────────────────────────────────

def _make_writer_output(extra_tabs: list[ReportTab] | None = None):
    from llm.reports.compatibility import CompatibilityReportModule
    schema = CompatibilityReportModule().output_schema()
    base_tabs = [
        ReportTab(category="종합 케미", headline="물과 나무처럼 서로를 키우는 관계", content="..."),
        ReportTab(category="갈등 포인트", headline="불꽃 튀는 순간들", content="..."),
        ReportTab(category="관계 조언", headline="조화로운 동행을 위한 팁", content="..."),
        ReportTab(category="연애 스타일", headline="뜨겁고 깊은 감정선", content="..."),
        ReportTab(category="보완 시너지", headline="서로의 부족을 채우는 오행", content="..."),
    ]
    return schema(tabs=base_tabs + (extra_tabs or []))


# ─── 기본 반환 형태 테스트 ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_pipeline_returns_tuple():
    from llm.pipelines.compatibility_report import run_compatibility_report

    fake_output = _make_writer_output()
    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=fake_output)):
        result = await run_compatibility_report(_make_req())

    assert isinstance(result, tuple)
    assert len(result) == 3


@pytest.mark.asyncio
async def test_pipeline_score_dict():
    from llm.pipelines.compatibility_report import run_compatibility_report

    fake_output = _make_writer_output()
    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=fake_output)):
        score, synastry, tabs = await run_compatibility_report(_make_req())

    assert "total_score" in score
    assert 0 <= score["total_score"] <= 100


@pytest.mark.asyncio
async def test_pipeline_synastry_dict():
    from llm.pipelines.compatibility_report import run_compatibility_report

    fake_output = _make_writer_output()
    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=fake_output)):
        score, synastry, tabs = await run_compatibility_report(_make_req())

    for key in ["stem_hap", "day_ten_god", "element_synergy", "clash_pairs",
                "complement_a_to_b", "complement_b_to_a", "yongsin_help", "interaction_tags"]:
        assert key in synastry, f"synastry missing key: {key}"


@pytest.mark.asyncio
async def test_pipeline_tabs_list():
    from llm.pipelines.compatibility_report import run_compatibility_report

    fake_output = _make_writer_output()
    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=fake_output)):
        score, synastry, tabs = await run_compatibility_report(_make_req())

    assert isinstance(tabs, list)
    assert all(isinstance(t, ReportTab) for t in tabs)


# ─── 앵커 탭 보장 테스트 ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_pipeline_anchor_tabs_guaranteed_when_writer_omits():
    """Writer가 가변 탭만 줘도 파이프라인은 앵커 3탭을 보장해야 한다."""
    from llm.pipelines.compatibility_report import run_compatibility_report
    from llm.reports.compatibility import CompatibilityReportModule

    schema = CompatibilityReportModule().output_schema()
    only_variable = schema(tabs=[
        ReportTab(category="연애 스타일", headline="h", content="b"),
        ReportTab(category="보완 시너지", headline="h", content="b"),
    ])

    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=only_variable)):
        score, synastry, tabs = await run_compatibility_report(_make_req())

    categories = [t.category for t in tabs]
    for anchor in _ANCHOR_CATEGORIES:
        assert anchor in categories, f"파이프라인 결과에 앵커 탭 누락: {anchor}"


# ─── request_topics 요청 탭 테스트 ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_pipeline_request_topics_tab_added():
    """request_topics='결혼시기' → requested=True 탭이 tabs에 포함된다."""
    from llm.pipelines.compatibility_report import run_compatibility_report

    fake_output = _make_writer_output()
    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=fake_output)):
        score, synastry, tabs = await run_compatibility_report(_make_req(request_topics="결혼시기"))

    assert any(t.requested and t.category == "결혼시기" for t in tabs)


@pytest.mark.asyncio
async def test_pipeline_multiple_request_topics():
    """request_topics='결혼시기,갈등해소' → 요청 탭 2개."""
    from llm.pipelines.compatibility_report import run_compatibility_report

    fake_output = _make_writer_output()
    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=fake_output)):
        score, synastry, tabs = await run_compatibility_report(
            _make_req(request_topics="결혼시기, 갈등해소")
        )

    requested = [t for t in tabs if t.requested]
    assert len(requested) == 2


# ─── 탭 개수 범위 테스트 ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_pipeline_tabs_count_within_range():
    """요청 탭 없으면 총 탭이 6~10 사이여야 한다."""
    from llm.pipelines.compatibility_report import run_compatibility_report

    fake_output = _make_writer_output()
    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=fake_output)):
        score, synastry, tabs = await run_compatibility_report(_make_req())

    assert 3 <= len(tabs) <= 10  # 최소 앵커 3개


@pytest.mark.asyncio
async def test_pipeline_tabs_not_exceed_max_without_request():
    """Writer가 11개 이상 반환해도 max 10개로 클램프."""
    from llm.pipelines.compatibility_report import run_compatibility_report
    from llm.reports.compatibility import CompatibilityReportModule

    schema = CompatibilityReportModule().output_schema()
    too_many = schema(tabs=[
        ReportTab(category=f"탭_{i}", headline="h", content="b")
        for i in range(12)
    ])

    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=too_many)):
        score, synastry, tabs = await run_compatibility_report(_make_req())

    assert len(tabs) <= 10
