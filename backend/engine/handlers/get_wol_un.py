"""월운(月運) 핸들러 — 특정 연도의 12개 월간지 + 일간 기준 십성·12운성."""

from __future__ import annotations
from engine.calc.se_un import calc_month_ganji
from engine.calc.ten_gods import calculate_ten_god, get_branch_ten_god
from engine.calc.twelve_wun import get_twelve_wun


def handle_get_wol_un(year: int, day_stem: str) -> list[dict]:
    """
    특정 연도의 월운 목록 반환 (양력 1~12월 순서).

    Args:
        year:     대상 연도
        day_stem: 일간 천간 (일간 기준 십성 계산용)

    Returns:
        [
          {
            "month": 1,
            "stem": "갑", "branch": "인",
            "stem_element": "목", "branch_element": "목",
            "ganji_name": "갑인월",
            "stem_ten_god": "식신",
            "branch_ten_god": "식신",
            "twelve_wun": "병",
          },
          ...  (12개)
        ]
    """
    result = []
    for month in range(1, 13):
        ganji = calc_month_ganji(year, month)
        result.append({
            "month":           month,
            "stem":            ganji["stem"],
            "branch":          ganji["branch"],
            "stem_element":    ganji["stem_element"],
            "branch_element":  ganji["branch_element"],
            "ganji_name":      ganji["ganji_name"],
            "stem_ten_god":    calculate_ten_god(day_stem, ganji["stem"]),
            "branch_ten_god":  get_branch_ten_god(day_stem, ganji["branch"]),
            "twelve_wun":      get_twelve_wun(day_stem, ganji["branch"]),
        })
    return result
