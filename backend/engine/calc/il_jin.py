"""
일진(日辰) 달력 계산.
기준일: 1900-01-01 = 甲戌일 (stemIdx=0, branchIdx=10)
"""

from __future__ import annotations
import calendar
import logging
from datetime import date
from engine.data.heavenly_stems import get_stem_by_index
from engine.data.earthly_branches import get_branch_by_index
from engine.calc.solar_terms import get_solar_terms_for_year

# 1900-01-01 기준 인덱스
logger = logging.getLogger(__name__)

_BASE_DATE = date(1900, 1, 1)
_BASE_STEM_IDX   = 0   # 甲
_BASE_BRANCH_IDX = 10  # 戌


def get_day_ganji(target: date) -> dict:
    """특정 날짜의 일진 간지 반환."""
    delta = (target - _BASE_DATE).days
    stem_idx   = (_BASE_STEM_IDX   + delta) % 10
    branch_idx = (_BASE_BRANCH_IDX + delta) % 12
    stem   = get_stem_by_index(stem_idx)
    branch = get_branch_by_index(branch_idx)
    return {
        "stem":           stem["korean"],
        "branch":         branch["korean"],
        "stem_hanja":     stem["hanja"],
        "branch_hanja":   branch["hanja"],
        "stem_element":   stem["element"],
        "branch_element": branch["element"],
        "ganji_name":     f"{stem['korean']}{branch['korean']}",
    }


def get_il_jin_calendar(year: int, month: int) -> dict:
    """
    특정 년·월의 일진 달력 반환.

    Returns:
        {
          "year": 2026, "month": 3,
          "days": [
            {
              "date": "2026-03-01",
              "weekday": 0,          # 0=월 … 6=일
              "day": 1,
              "ganji": {...},
              "lunar_month": 1, "lunar_day": 13, "is_leap": false,
              "solar_term": null | "경칩"
            },
            ...
          ]
        }
    """
    try:
        from korean_lunar_calendar import KoreanLunarCalendar
        _lunar = KoreanLunarCalendar()
    except ImportError:
        _lunar = None

    # 절기 정보 (ephem 기반) — 해당 년도 전체 절기에서 이 달 것만 필터
    try:
        all_terms = get_solar_terms_for_year(year)
        # KST 기준 월·일로 {day: name} 매핑 (UTC 날짜를 쓰면 15시 UTC 이후 절기가 하루 밀린다)
        term_map: dict[int, str] = {
            t["datetime_kst"].day: t["name"]
            for t in all_terms
            if t["datetime_kst"].month == month
        }
    except Exception as exc:
        logger.warning("절기 계산 실패 (%d-%d): %s", year, month, exc)
        term_map = {}

    _, last_day = calendar.monthrange(year, month)
    days = []
    for d in range(1, last_day + 1):
        target = date(year, month, d)
        ganji  = get_day_ganji(target)

        # 음력 변환
        lunar_month, lunar_day, is_leap = None, None, False
        if _lunar is not None:
            try:
                _lunar.setSolarDate(year, month, d)
                lunar_month = _lunar.lunarMonth
                lunar_day   = _lunar.lunarDay
                is_leap     = bool(_lunar.isIntercalation)
            except Exception as exc:
                logger.warning("음력 변환 실패 (%d-%d-%d): %s", year, month, d, exc)

        days.append({
            "date":        target.isoformat(),
            "day":         d,
            "weekday":     target.weekday(),   # 0=월 … 6=일
            "ganji":       ganji,
            "lunar_month": lunar_month,
            "lunar_day":   lunar_day,
            "is_leap":     is_leap,
            "solar_term":  term_map.get(d),
        })

    return {"year": year, "month": month, "days": days}
