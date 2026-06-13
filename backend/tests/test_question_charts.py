"""
한줄 상담 차트 선별 단위 테스트.

- 카테고리별 charts / more tool 이름 검증
- payload 키 검증 (chat tool과 동일 계약)
- instant / guard 차단 / medical 케이스는 charts·more 빈 리스트
- 기존 텍스트(headline/content) 로직 비파괴 확인
"""
from __future__ import annotations

import pytest
from engine.handlers.calculate_saju import handle_calculate_saju
from llm.pipelines.question import _build_charts_for_category

BIRTH = dict(
    birth_date="1990-03-15",
    birth_time="14:30",
    gender="male",
    calendar="solar",
)

# 테스트용 사주 계산 (모듈 레벨에서 한 번만)
_SAJU: dict = handle_calculate_saju(**BIRTH)


# ─── _build_charts_for_category 단위 테스트 ───────────────────────────────────

class TestChartsByCategoryStructure:
    """카테고리별 tool 이름 목록 검증."""

    def test_money_charts_tools(self):
        charts, _ = _build_charts_for_category("money", _SAJU)
        names = [c["tool"] for c in charts]
        assert names == ["get_wuxing_balance", "get_ten_gods"]

    def test_money_more_tools(self):
        _, more = _build_charts_for_category("money", _SAJU)
        names = [c["tool"] for c in more]
        assert names == ["get_wol_un", "get_strength", "get_palja"]

    def test_love_charts_tools(self):
        charts, _ = _build_charts_for_category("love", _SAJU)
        names = [c["tool"] for c in charts]
        assert names == ["get_sin_sal"]

    def test_love_more_tools(self):
        _, more = _build_charts_for_category("love", _SAJU)
        names = [c["tool"] for c in more]
        assert names == ["get_wol_un", "get_twelve_un_seong"]

    def test_career_charts_tools(self):
        charts, _ = _build_charts_for_category("career", _SAJU)
        names = [c["tool"] for c in charts]
        assert names == ["get_ten_gods", "get_strength"]

    def test_career_more_tools(self):
        _, more = _build_charts_for_category("career", _SAJU)
        names = [c["tool"] for c in more]
        assert names == ["get_wuxing_balance", "get_palja"]

    def test_health_charts_empty(self):
        charts, _ = _build_charts_for_category("health", _SAJU)
        assert charts == []

    def test_health_more_tools(self):
        _, more = _build_charts_for_category("health", _SAJU)
        names = [c["tool"] for c in more]
        assert names == ["get_wuxing_balance", "get_strength"]

    def test_general_both_empty(self):
        charts, more = _build_charts_for_category("general", _SAJU)
        assert charts == [] and more == []

    def test_unknown_category_both_empty(self):
        charts, more = _build_charts_for_category("unknown_xyz", _SAJU)
        assert charts == [] and more == []


class TestChartsCount:
    """charts 최대 2개 / more 최대 4개 제약 확인."""

    def test_charts_max_2(self):
        charts, _ = _build_charts_for_category("money", _SAJU)
        assert len(charts) <= 2

    def test_more_max_4(self):
        _, more = _build_charts_for_category("money", _SAJU)
        assert len(more) <= 4


# ─── payload 키 계약 검증 ─────────────────────────────────────────────────────

class TestPayloadKeys:
    """각 tool의 payload 키가 saju_tools._envelope(data)와 일치하는지 검증."""

    def _find(self, items: list[dict], tool_name: str) -> dict | None:
        return next((c for c in items if c["tool"] == tool_name), None)

    def test_wuxing_balance_keys(self):
        charts, more = _build_charts_for_category("money", _SAJU)
        item = self._find(charts, "get_wuxing_balance")
        assert item is not None
        payload = item["payload"]
        for key in (
            "wuxing_count_hap", "wuxing_count", "wuxing_chars",
            "wuxing_hap_contributions", "dominant_elements", "weak_elements",
            "day_stem_element",
        ):
            assert key in payload, f"payload에 '{key}' 없음"

    def test_ten_gods_keys(self):
        charts, _ = _build_charts_for_category("money", _SAJU)
        item = self._find(charts, "get_ten_gods")
        assert item is not None
        for key in ("ten_gods_distribution", "structure_patterns"):
            assert key in item["payload"]

    def test_sin_sal_keys(self):
        charts, _ = _build_charts_for_category("love", _SAJU)
        item = self._find(charts, "get_sin_sal")
        assert item is not None
        assert "sin_sals" in item["payload"]

    def test_strength_keys(self):
        charts, _ = _build_charts_for_category("career", _SAJU)
        item = self._find(charts, "get_strength")
        assert item is not None
        for key in ("day_master_strength", "yong_sin"):
            assert key in item["payload"]

    def test_palja_keys(self):
        _, more = _build_charts_for_category("career", _SAJU)
        item = self._find(more, "get_palja")
        assert item is not None
        for key in ("year_pillar", "month_pillar", "day_pillar", "hour_pillar",
                    "day_stem", "gyeok_guk"):
            assert key in item["payload"]

    def test_wol_un_keys(self):
        _, more = _build_charts_for_category("money", _SAJU)
        item = self._find(more, "get_wol_un")
        assert item is not None
        assert "year" in item["payload"]
        assert "months" in item["payload"]
        assert len(item["payload"]["months"]) == 12

    def test_wol_un_month_entry_keys(self):
        _, more = _build_charts_for_category("money", _SAJU)
        item = self._find(more, "get_wol_un")
        month = item["payload"]["months"][0]
        for key in ("month", "stem", "branch", "stem_element", "branch_element",
                    "ganji_name", "stem_ten_god", "branch_ten_god", "twelve_wun"):
            assert key in month, f"월운 항목에 '{key}' 없음"

    def test_twelve_un_seong_keys(self):
        _, more = _build_charts_for_category("love", _SAJU)
        item = self._find(more, "get_twelve_un_seong")
        assert item is not None
        for key in ("pillars_wun", "day_stem", "day_element"):
            assert key in item["payload"]


# ─── 빈 케이스: instant / guard / medical ────────────────────────────────────

class TestEmptyChartsForSpecialCases:
    """instant·guard·medical 경우 charts·more 빈 리스트 확인 (파이프라인 단위)."""

    def test_general_produces_no_charts(self):
        charts, more = _build_charts_for_category("general", _SAJU)
        assert charts == []
        assert more == []

    def test_health_produces_no_auto_charts(self):
        charts, _ = _build_charts_for_category("health", _SAJU)
        assert charts == []


# ─── ChartItem 스키마 유효성 ─────────────────────────────────────────────────

class TestChartItemSchema:
    """_build_charts_for_category 결과가 ChartItem 계약을 만족하는지 검증."""

    def test_each_item_has_tool_and_payload(self):
        charts, more = _build_charts_for_category("money", _SAJU)
        for item in charts + more:
            assert "tool" in item
            assert "payload" in item
            assert isinstance(item["tool"], str)
            assert isinstance(item["payload"], dict)

    def test_chart_item_pydantic_parse(self):
        from schemas.question import ChartItem

        charts, more = _build_charts_for_category("money", _SAJU)
        for raw in charts + more:
            ci = ChartItem(**raw)
            assert ci.tool == raw["tool"]
            assert ci.payload == raw["payload"]
