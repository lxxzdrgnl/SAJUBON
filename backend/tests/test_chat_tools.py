"""채팅 에이전트 tool 단위 테스트."""

import asyncio
import json

import pytest
from langchain_core.runnables import RunnableConfig

from llm.tools.saju_tools import (
    extract_summary,
    request_partner_profile,
    get_compatibility_detail,
    REQUEST_PARTNER_SIGNAL,
    CHART_TOOL_NAMES,
    _compute_current_luck_overview,
    _compute_find_favorable_periods,
    _compute_evaluate_specific_date,
    _compute_check_current_sin_sal_timing,
    get_wuxing_balance,
    get_ten_gods,
    get_sin_sal,
    get_palja,
    get_strength,
    get_twelve_un_seong,
    get_hap_chung,
)


def _make_saju_result() -> dict:
    """엔진 결과 최소 픽스처."""
    return {
        "day_pillar": {"stem": "갑", "branch": "진", "stem_element": "목", "branch_element": "토"},
        "year_pillar": {"stem": "경", "branch": "오", "stem_element": "금", "branch_element": "화"},
        "month_pillar": {"stem": "무", "branch": "자", "stem_element": "토", "branch_element": "수"},
        "hour_pillar": {"stem": "병", "branch": "인", "stem_element": "화", "branch_element": "목"},
        "gyeok_guk": {"name": "정관격"},
        "yong_sin": {"primary": ["화", "토"], "taboo": ["금", "수"]},
        "day_master_strength": {"level": "신약"},
        "current_dae_un": {"stem": "임", "branch": "술", "start_age": 32, "end_age": 42},
        "wuxing_count": {"목": 25.0, "화": 12.5, "토": 37.5, "금": 12.5, "수": 12.5},
        "ten_gods_distribution": {"정관": 35.0, "식신": 20.0, "정인": 45.0},
        "structure_patterns": ["식신생재 구조"],
        "sin_sals": [{"name": "천을귀인", "type": "lucky", "priority": "medium"}],
        "behavior_profile": {"독립성": 0.8, "사교성": 0.4},
        "life_domains": {"직업": ["전문직"], "연애": ["늦은 결혼"], "재물": ["식신생재"], "건강": ["토 허약"]},
        "branch_relations": {"sam_hap": [], "chung": [], "yuk_hap": []},
    }


class TestExtractSummary:
    def test_returns_required_keys(self):
        saju = _make_saju_result()
        summary = extract_summary(saju)
        required = [
            "day_stem", "day_element", "gyeok_guk", "yong_sin", "ji_sin",
            "strength", "pillars", "current_dae_un", "wuxing_pct",
            "ten_gods_distribution", "structure_patterns", "sin_sals",
            "behavior_profile", "life_domains", "branch_relations",
        ]
        for key in required:
            assert key in summary, f"Missing key: {key}"

    def test_pillars_all_four(self):
        saju = _make_saju_result()
        summary = extract_summary(saju)
        assert set(summary["pillars"].keys()) == {"year", "month", "day", "hour"}

    def test_sin_sals_stripped(self):
        saju = _make_saju_result()
        summary = extract_summary(saju)
        for sal in summary["sin_sals"]:
            assert set(sal.keys()) == {"name", "type", "priority"}

    def test_no_hour_pillar(self):
        saju = _make_saju_result()
        saju["hour_pillar"] = None
        summary = extract_summary(saju)
        assert "hour" not in summary["pillars"]


class TestNewEngineTools:
    def test_current_luck_overview_keys(self):
        saju = _make_saju_result()
        result = _compute_current_luck_overview(saju)
        assert "current_dae_un" in result
        assert "se_un" in result
        assert "wol_un" in result
        assert "stem" in result["se_un"]

    def test_find_favorable_periods_domain(self):
        saju = _make_saju_result()
        result = _compute_find_favorable_periods(saju, domain="재물", years=3)
        assert "domain" in result
        assert "favorable" in result
        assert result["domain"] == "재물"

    def test_evaluate_specific_date_valid(self):
        saju = _make_saju_result()
        result = _compute_evaluate_specific_date(saju, target_date="2026-05-01", action="계약")
        assert "date" in result
        assert "ganji" in result
        assert "favorable" in result

    def test_check_sin_sal_timing_keys(self):
        saju = _make_saju_result()
        result = _compute_check_current_sin_sal_timing(saju)
        assert "in_sam_jae" in result
        assert "active_sin_sals" in result
        assert isinstance(result["in_sam_jae"], bool)


# ─── A1: 궁합 + 상대 프로필 요청 tool ──────────────────────────────────────────

_BIRTH_SELF = {
    "birth_date": "1990-03-15",
    "birth_time": "14:30",
    "gender": "male",
    "calendar": "solar",
    "is_leap_month": False,
}
_BIRTH_PARTNER = {
    "birth_date": "1992-07-21",
    "birth_time": "09:00",
    "gender": "female",
    "calendar": "solar",
    "is_leap_month": False,
}


def _invoke(tool, args: dict, config: RunnableConfig) -> str:
    """LangChain async tool을 동기 테스트에서 호출."""
    return asyncio.run(tool.ainvoke(args, config=config))


class TestRequestPartnerProfile:
    def test_returns_signal_string(self):
        config = {"configurable": {"birth_info": _BIRTH_SELF}}
        out = _invoke(request_partner_profile, {}, config)
        assert out == REQUEST_PARTNER_SIGNAL

    def test_tool_name_registered(self):
        assert request_partner_profile.name == "request_partner_profile"


class TestCompatibilityDetail:
    def test_need_partner_when_missing(self):
        """partner 미첨부 → 구조화된 need_partner 신호 반환 (엔진 미호출)."""
        config = {"configurable": {"birth_info": _BIRTH_SELF}}
        out = _invoke(get_compatibility_detail, {}, config)
        parsed = json.loads(out)
        assert parsed["data"]["need_partner"] is True
        assert "summary" in parsed

    def test_compatibility_with_partner(self):
        """partner 첨부 → 엔진 호출, total_score 포함 구조화 data 반환."""
        config = {
            "configurable": {
                "birth_info": _BIRTH_SELF,
                "partner_info": _BIRTH_PARTNER,
            }
        }
        out = _invoke(get_compatibility_detail, {}, config)
        parsed = json.loads(out)
        assert "summary" in parsed
        assert "data" in parsed
        data = parsed["data"]
        assert "total_score" in data
        assert isinstance(data["total_score"], int)
        assert 0 <= data["total_score"] <= 100
        assert "need_partner" not in data or data.get("need_partner") is False

    def test_partner_name_in_summary_when_provided(self):
        config = {
            "configurable": {
                "birth_info": _BIRTH_SELF,
                "partner_info": {**_BIRTH_PARTNER, "name": "지민"},
            }
        }
        out = _invoke(get_compatibility_detail, {}, config)
        parsed = json.loads(out)
        assert "지민" in parsed["summary"]

    def test_in_chart_whitelist(self):
        assert "get_compatibility_detail" in CHART_TOOL_NAMES
        assert "request_partner_profile" not in CHART_TOOL_NAMES


# ─── 원국 시각 카드 tool ──────────────────────────────────────────────────────

_CARD_TOOLS = {
    "get_wuxing_balance": get_wuxing_balance,
    "get_ten_gods":       get_ten_gods,
    "get_sin_sal":        get_sin_sal,
    "get_palja":          get_palja,
    "get_strength":       get_strength,
    "get_twelve_un_seong": get_twelve_un_seong,
    "get_hap_chung":      get_hap_chung,
}

_CARD_DATA_KEYS = {
    "get_wuxing_balance": [
        "wuxing_count_hap", "wuxing_count", "wuxing_chars",
        "wuxing_hap_contributions", "dominant_elements", "weak_elements",
        "day_stem_element",
    ],
    "get_ten_gods":  ["ten_gods_distribution", "structure_patterns"],
    "get_sin_sal":   ["sin_sals"],
    "get_palja":     ["year_pillar", "month_pillar", "day_pillar", "hour_pillar", "day_stem", "gyeok_guk"],
    "get_strength":  ["day_master_strength", "yong_sin"],
    "get_twelve_un_seong": ["pillars_wun", "day_stem", "day_element"],
    "get_hap_chung": ["year_pillar", "month_pillar", "day_pillar", "branch_relations", "gong_mang"],
}


class TestVisualCardTools:
    def _config(self) -> RunnableConfig:
        return {"configurable": {"birth_info": _BIRTH_SELF}}

    def test_all_registered_in_whitelist(self):
        for name in _CARD_TOOLS:
            assert name in CHART_TOOL_NAMES, f"{name} not whitelisted"

    def test_tool_names(self):
        for name, tool in _CARD_TOOLS.items():
            assert tool.name == name

    def test_returns_envelope_with_summary_and_data(self):
        config = self._config()
        for name, tool in _CARD_TOOLS.items():
            parsed = json.loads(_invoke(tool, {}, config))
            assert "summary" in parsed, f"{name}: missing summary"
            assert isinstance(parsed["summary"], str) and parsed["summary"], f"{name}: empty summary"
            assert "data" in parsed and isinstance(parsed["data"], dict), f"{name}: missing data dict"

    def test_data_contains_expected_keys(self):
        config = self._config()
        for name, tool in _CARD_TOOLS.items():
            data = json.loads(_invoke(tool, {}, config))["data"]
            for key in _CARD_DATA_KEYS[name]:
                assert key in data, f"{name}: data missing '{key}'"

    def test_wuxing_balance_shape(self):
        data = json.loads(_invoke(get_wuxing_balance, {}, self._config()))["data"]
        assert isinstance(data["wuxing_count"], dict)
        assert isinstance(data["dominant_elements"], list)
        assert isinstance(data["day_stem_element"], str) and data["day_stem_element"]

    def test_strength_shape(self):
        data = json.loads(_invoke(get_strength, {}, self._config()))["data"]
        assert "level" in data["day_master_strength"]
        assert "primary" in data["yong_sin"]

    def test_palja_pillars_present(self):
        data = json.loads(_invoke(get_palja, {}, self._config()))["data"]
        for p in ("year_pillar", "month_pillar", "day_pillar"):
            assert "stem" in data[p] and "branch" in data[p]
        assert data["day_stem"] == data["day_pillar"]["stem"]


class TestTwelveUnSeongTool:
    def _config(self) -> RunnableConfig:
        return {"configurable": {"birth_info": _BIRTH_SELF}}

    def test_in_chart_whitelist(self):
        assert "get_twelve_un_seong" in CHART_TOOL_NAMES

    def test_tool_name(self):
        assert get_twelve_un_seong.name == "get_twelve_un_seong"

    def test_envelope_shape(self):
        parsed = json.loads(_invoke(get_twelve_un_seong, {}, self._config()))
        assert "summary" in parsed and isinstance(parsed["summary"], str)
        assert "data" in parsed and isinstance(parsed["data"], dict)

    def test_pillars_wun_contains_wun(self):
        data = json.loads(_invoke(get_twelve_un_seong, {}, self._config()))["data"]
        assert "pillars_wun" in data
        pillars_wun = data["pillars_wun"]
        # at minimum year/month/day pillars are always present
        for pk in ("year_pillar", "month_pillar", "day_pillar"):
            assert pk in pillars_wun, f"missing {pk}"
            assert "twelve_wun" in pillars_wun[pk], f"{pk} missing twelve_wun"
            assert isinstance(pillars_wun[pk]["twelve_wun"], str)
            assert pillars_wun[pk]["twelve_wun"], f"{pk} has empty twelve_wun"

    def test_day_stem_and_element(self):
        data = json.loads(_invoke(get_twelve_un_seong, {}, self._config()))["data"]
        assert "day_stem" in data and data["day_stem"]
        assert "day_element" in data and data["day_element"]


class TestHapChungTool:
    def _config(self) -> RunnableConfig:
        return {"configurable": {"birth_info": _BIRTH_SELF}}

    def test_in_chart_whitelist(self):
        assert "get_hap_chung" in CHART_TOOL_NAMES

    def test_tool_name(self):
        assert get_hap_chung.name == "get_hap_chung"

    def test_envelope_shape(self):
        parsed = json.loads(_invoke(get_hap_chung, {}, self._config()))
        assert "summary" in parsed and isinstance(parsed["summary"], str)
        assert "data" in parsed and isinstance(parsed["data"], dict)

    def test_data_contains_pillars_and_relations(self):
        data = json.loads(_invoke(get_hap_chung, {}, self._config()))["data"]
        for pk in ("year_pillar", "month_pillar", "day_pillar"):
            assert pk in data, f"missing {pk}"
        assert "branch_relations" in data
        assert isinstance(data["branch_relations"], dict)
        assert "gong_mang" in data
        assert "vacant_branches" in data["gong_mang"]
        assert "affected_pillars" in data["gong_mang"]
