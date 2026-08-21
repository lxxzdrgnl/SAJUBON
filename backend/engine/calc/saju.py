"""
사주팔자(四柱八字) 4기둥 계산.
"""

from __future__ import annotations
import functools
from datetime import datetime, timedelta

from engine.data.heavenly_stems import get_stem_by_index, STEMS_BY_KOREAN
from engine.data.earthly_branches import (
    get_branch_by_index,
    get_ji_jang_gan,
    analyze_branch_relations,
    BRANCHES_BY_KOREAN,
)
from engine.data.timezone_history import get_solar_correction_minutes
from engine.calc.solar_terms import get_current_solar_term, get_solar_term_month_index
from engine.calc.calendar_converter import convert_calendar


# ─── 내부 헬퍼 ────────────────────────────────────────────────


def _stem_index(korean: str) -> int:
    return STEMS_BY_KOREAN[korean]["index"]


def _branch_index(korean: str) -> int:
    return BRANCHES_BY_KOREAN[korean]["index"]


def _pillar(stem_idx: int, branch_idx: int) -> dict:
    stem = get_stem_by_index(stem_idx)
    branch = get_branch_by_index(branch_idx)
    return {
        "stem": stem["korean"],
        "branch": branch["korean"],
        "stem_hanja": stem["hanja"],
        "branch_hanja": branch["hanja"],
        "stem_element": stem["element"],
        "branch_element": branch["element"],
        "yin_yang": stem["yin_yang"],
        "ganji_name": stem["korean"] + branch["korean"],
    }


# ─── 4기둥 계산 ───────────────────────────────────────────────


def _calc_year_pillar(local: datetime) -> dict:
    """연주(年柱) 계산. 입춘 이전이면 전년도.

    local: 한국 법정 표준시 벽시계 시각(naive). 절기 비교는 solar_terms 쪽에서 UTC로 변환한다.
    """
    year = local.year
    term = get_current_solar_term(local)

    # 1~2월이고 아직 입춘이 안 지났으면 전년도.
    # 입춘 이전 구간의 절기는 동지·소한·대한 셋이다 (자월 후반 + 축월).
    # "대한"만 보면 1/1~1/20(동지·소한 구간)이 새해 간지로 잘못 잡힌다.
    if local.month <= 2 and term in ("동지", "소한", "대한"):
        year -= 1

    # 갑자(甲子)년 기준: 1984년
    stem_idx = (year - 4) % 10
    branch_idx = (year - 4) % 12
    return _pillar(stem_idx, branch_idx)


def _calc_month_pillar(local: datetime, year_pillar: dict) -> dict:
    """월주(月柱) 계산. local: 법정 표준시 벽시계 시각(naive)."""
    term = get_current_solar_term(local)
    month_idx = get_solar_term_month_index(term)   # 0=인월 ... 11=축월

    branch_idx = (month_idx + 2) % 12   # 인(寅) = index 2

    # 연간에 따른 월간 시작점
    year_stem_idx = _stem_index(year_pillar["stem"])
    month_stem_starts = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]  # 갑~계
    month_stem_start = month_stem_starts[year_stem_idx]

    month_offset = (branch_idx - 2) % 12
    stem_idx = (month_stem_start + month_offset) % 10
    return _pillar(stem_idx, branch_idx)


def _calc_day_pillar(adjusted: datetime) -> dict:
    """일주(日柱) 계산. 기준: 1900-01-01 = 갑술일. adjusted: 진태양시(naive)."""
    base = datetime(1900, 1, 1)
    diff_days = (adjusted - base).days

    stem_idx = (0 + diff_days) % 10    # 갑(0) 시작
    branch_idx = (10 + diff_days) % 12  # 술(10) 시작
    return _pillar(stem_idx, branch_idx)


def _calc_hour_pillar(adjusted: datetime, day_pillar: dict) -> dict:
    """시주(時柱) 계산."""
    h = adjusted.hour

    # 자시(子時): 23~01시
    if h >= 23 or h < 1:
        branch_idx = 0
    else:
        branch_idx = (h + 1) // 2

    day_stem_idx = _stem_index(day_pillar["stem"])
    stem_idx = (day_stem_idx * 2 + branch_idx) % 10
    return _pillar(stem_idx, branch_idx)


# ─── 오행 집계 ────────────────────────────────────────────────


def _count_wuxing(pillars: list[dict]) -> dict[str, int]:
    count: dict[str, int] = {"목": 0, "화": 0, "토": 0, "금": 0, "수": 0}
    for p in pillars:
        count[p["stem_element"]] += 1
        count[p["branch_element"]] += 1
    return count


# ─── 메인 함수 ────────────────────────────────────────────────


@functools.lru_cache(maxsize=256)
def calculate_saju(
    birth_date: str,
    birth_time: str | None,
    gender: str,
    calendar: str = "solar",
    is_leap_month: bool = False,
) -> dict:
    """
    사주팔자 4기둥 계산.

    Args:
        birth_date:    "YYYY-MM-DD"
        birth_time:    "HH:MM"
        gender:        "male" | "female"
        calendar:      "solar" | "lunar"
        is_leap_month: 음력 윤달 여부

    Returns:
        year_pillar, month_pillar, day_pillar, hour_pillar,
        wuxing_count, dominant_elements, weak_elements
    """
    # 음력이면 양력으로 변환
    solar_date = birth_date
    if calendar == "lunar":
        conv = convert_calendar(birth_date, "lunar", "solar", is_leap_month)
        solar_date = conv["converted_date"]

    y, mo, d = map(int, solar_date.split("-"))
    hh, mm = (12, 0) if birth_time is None else map(int, birth_time.split(":"))
    # 법정 표준시(KST, 역사적 변경·DST 포함) 벽시계 시각 — 연주·월주 절기 비교용
    local = datetime(y, mo, d, hh, mm)

    # 진태양시 보정 (서울 경도 126.97° 기준) — 일주·시주 경계용
    correction = get_solar_correction_minutes(local)
    adjusted = local + timedelta(minutes=correction)

    year_p = _calc_year_pillar(local)
    month_p = _calc_month_pillar(local, year_p)
    day_p = _calc_day_pillar(adjusted)
    hour_p = None if birth_time is None else _calc_hour_pillar(adjusted, day_p)

    known_pillars = [year_p, month_p, day_p] + ([hour_p] if hour_p is not None else [])
    wuxing = _count_wuxing(known_pillars)
    n_chars = len(known_pillars) * 2
    avg = n_chars / 5
    dominant = [e for e, c in wuxing.items() if c > avg * 1.5]
    weak = [e for e, c in wuxing.items() if c == 0 or c < avg * 0.5]

    _ji_labels = ["year", "month", "day"] + (["hour"] if hour_p is not None else [])
    branches = [p["branch"] for p in known_pillars]
    branch_relations = analyze_branch_relations(branches, day_p["branch"], _ji_labels, day_stem=day_p["stem"])
    ji_jang_gan = {
        label: get_ji_jang_gan(p["branch"])
        for label, p in zip(_ji_labels, known_pillars)
    }

    return {
        "year_pillar": year_p,
        "month_pillar": month_p,
        "day_pillar": day_p,
        "hour_pillar": hour_p,
        "wuxing_count": wuxing,
        "dominant_elements": dominant,
        "weak_elements": weak,
        "branch_relations": branch_relations,
        "ji_jang_gan": ji_jang_gan,
        "gender": gender,
        "birth_date": birth_date,
        "birth_time": birth_time,
        "calendar": calendar,
        "is_leap_month": is_leap_month,
    }
