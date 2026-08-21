"""
대운(大運) 계산 — 만세력 공식.
3일=1년, 1일=4개월, 1시진(2시간)=10일
"""

from __future__ import annotations
from datetime import datetime
from engine.data.heavenly_stems import STEMS_BY_KOREAN
from engine.data.earthly_branches import BRANCHES_BY_KOREAN
from engine.calc.solar_terms import get_next_solar_term, get_previous_solar_term, to_utc


def _is_forward(saju: dict) -> bool:
    """순행/역행 결정: 양남음녀 → 순행, 음남양녀 → 역행."""
    yin_yang = saju["year_pillar"]["yin_yang"]
    gender = saju["gender"]
    return (yin_yang == "양" and gender == "male") or \
           (yin_yang == "음" and gender == "female")


def _manselyeok_age(days: int, hours: int, minutes: int) -> int:
    """만세력 공식으로 대운 시작 나이 계산.
    3일=1년, 1일=4개월, 1시진(2h)=10일(=1/30개월×10=1/3개월) → 1시간=1/6개월
    ∴ total_days(소수 포함) / 3 = 년수
    """
    total_days = days + (hours + minutes / 60) / 24
    years = total_days / 3
    return max(1, min(10, round(years)))


def _pillar(stem_idx: int, branch_idx: int) -> dict:
    from engine.data.heavenly_stems import get_stem_by_index
    from engine.data.earthly_branches import get_branch_by_index
    stem = get_stem_by_index(stem_idx)
    branch = get_branch_by_index(branch_idx)
    return {
        "stem": stem["korean"],
        "branch": branch["korean"],
        "stem_element": stem["element"],
        "branch_element": branch["element"],
        "ganji_name": stem["korean"] + branch["korean"],
    }


def calculate_dae_un(saju: dict, count: int = 8) -> list[dict]:
    """
    대운 목록 계산.

    Returns:
        [{start_age, end_age, stem, branch, stem_element, branch_element}, ...]
    """
    y, mo, d = map(int, saju["birth_date"].split("-"))
    hh, mm = (12, 0) if saju.get("birth_time") is None else map(int, saju["birth_time"].split(":"))
    # 법정 KST 벽시계 시각 → 절기 비교를 위해 UTC로 변환 (solar_terms.to_utc가 역사적 오프셋 반영)
    birth_dt = to_utc(datetime(y, mo, d, hh, mm))

    forward = _is_forward(saju)

    # 절기까지 일수 계산
    if forward:
        target = get_next_solar_term(birth_dt, jeol_only=True)   # 대운수는 12절(節) 기준, 중기 제외
        delta = target["datetime"] - birth_dt
    else:
        target = get_previous_solar_term(birth_dt, jeol_only=True)
        delta = birth_dt - target["datetime"]

    total_seconds = int(delta.total_seconds())
    total_minutes = total_seconds // 60
    total_hours_all = total_minutes // 60
    days = total_hours_all // 24
    rem_hours = total_hours_all % 24
    rem_minutes = total_minutes % 60

    start_age = _manselyeok_age(days, rem_hours, rem_minutes)

    # 월주 기준 순행/역행
    month_stem_idx = STEMS_BY_KOREAN[saju["month_pillar"]["stem"]]["index"]
    month_branch_idx = BRANCHES_BY_KOREAN[saju["month_pillar"]["branch"]]["index"]

    result = []
    for i in range(count):
        if forward:
            s_idx = (month_stem_idx + i + 1) % 10
            b_idx = (month_branch_idx + i + 1) % 12
        else:
            s_idx = (month_stem_idx - i - 1 + 10) % 10
            b_idx = (month_branch_idx - i - 1 + 12) % 12

        p = _pillar(s_idx, b_idx)
        result.append({
            "start_age": start_age + i * 10,
            "end_age": start_age + (i + 1) * 10 - 1,
            **p,
        })

    return result
