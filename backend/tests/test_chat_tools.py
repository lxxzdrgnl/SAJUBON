"""채팅 에이전트 tool 단위 테스트."""

import pytest
from llm.tools.saju_tools import extract_summary


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
