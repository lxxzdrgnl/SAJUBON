"""연운(年運/歲運) 핸들러 — 특정 구간의 연간지 + 일간 기준 십성·12운성."""

from __future__ import annotations
from engine.calc.se_un import calc_year_ganji
from engine.calc.ten_gods import calculate_ten_god, get_branch_ten_god
from engine.calc.twelve_wun import get_twelve_wun


def handle_get_yeon_un(start_year: int, count: int, day_stem: str) -> list[dict]:
    """
    연운 목록 반환.

    Args:
        start_year: 시작 연도
        count:      반환할 연도 수 (최대 20)
        day_stem:   일간 천간 (십성 계산용)

    Returns:
        [{year, stem, branch, stem_element, branch_element, ganji_name,
          stem_ten_god, branch_ten_god, twelve_wun}]
    """
    count = min(count, 20)
    result = []
    for year in range(start_year, start_year + count):
        ganji = calc_year_ganji(year)
        result.append({
            "year":           year,
            "stem":           ganji["stem"],
            "branch":         ganji["branch"],
            "stem_element":   ganji["stem_element"],
            "branch_element": ganji["branch_element"],
            "ganji_name":     ganji["ganji_name"],
            "stem_ten_god":   calculate_ten_god(day_stem, ganji["stem"]),
            "branch_ten_god": get_branch_ten_god(day_stem, ganji["branch"]),
            "twelve_wun":     get_twelve_wun(day_stem, ganji["branch"]),
        })
    return result
