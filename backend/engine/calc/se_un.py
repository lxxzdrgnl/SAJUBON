"""
세운(歲運)·월운(月運)·시운(時運) 간지 계산.
"""

from __future__ import annotations
from engine.data.heavenly_stems import get_stem_by_index
from engine.data.earthly_branches import get_branch_by_index
from engine.data.wuxing import WUXING_GENERATION, WUXING_DESTRUCTION


def _pillar(stem_idx: int, branch_idx: int) -> dict:
    stem = get_stem_by_index(stem_idx)
    branch = get_branch_by_index(branch_idx)
    return {
        "stem": stem["korean"],
        "branch": branch["korean"],
        "stem_element": stem["element"],
        "branch_element": branch["element"],
        "yin_yang": stem["yin_yang"],
    }


def calc_year_ganji(year: int) -> dict:
    """특정 연도의 세운 간지."""
    stem_idx = (year - 4) % 10
    branch_idx = (year - 4) % 12
    p = _pillar(stem_idx, branch_idx)
    p["ganji_name"] = f"{p['stem']}{p['branch']}년"
    return p


def calc_month_ganji(year: int, month: int) -> dict:
    """양력 N월을 대표하는 월운 간지.

    양력 한 달은 그 달 초(4~8일경)의 절입일에 시작하는 절기월과 거의 겹친다.
    따라서 양력 N월 → 그 달에 시작하는 절기월로 매핑한다:
      1월=축(丑) · 2월=인(寅) · … · 8월=신(申) · … · 12월=자(子)  즉 지지 index = month % 12.
    양력 1월의 축월은 전년도 간지 사이클에 속하므로 월간 기준 연도를 year-1로 잡는다.

    (월 단위 근사이므로 절입일 이전 며칠은 전월 간지가 맞다. 특정 '날짜'의 정확한
     월운이 필요하면 calc_month_ganji_for_date()를 쓸 것.)
    """
    eff_year = year - 1 if month == 1 else year
    year_stem_idx = (eff_year - 4) % 10
    month_stem_starts = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]  # 갑~계년의 인월 월간
    start = month_stem_starts[year_stem_idx]

    branch_idx = month % 12               # 1월→축(1) … 8월→신(8) … 12월→자(0)
    m_offset = (branch_idx - 2) % 12      # 인월 기준 오프셋
    stem_idx = (start + m_offset) % 10
    p = _pillar(stem_idx, branch_idx)
    p["ganji_name"] = f"{p['stem']}{p['branch']}월"
    return p


def calc_month_ganji_for_date(dt) -> dict:
    """특정 '날짜'의 월운 간지 — 절기(節氣) 기준 정확 계산.

    '오늘의 월운'처럼 절입일 경계가 중요한 곳에서 쓴다.
    (calc_month_ganji는 양력 월 단위 근사라 절입일 전후 며칠이 어긋난다.)
    """
    from engine.calc.solar_terms import get_current_solar_term, get_solar_term_month_index

    # naive면 KST 벽시계 시각으로 간주 (UTC 변환은 solar_terms 내부에서 처리)
    term = get_current_solar_term(dt)
    branch_idx = (get_solar_term_month_index(term) + 2) % 12   # 0=인월 → 지지 index 2

    # 연간(年干)은 입춘 기준 — 입춘 전이면 전년도 사이클.
    # 입춘 이전 구간의 절기는 동지·소한·대한 셋이다 (saju._calc_year_pillar와 동일 조건).
    # "동지"를 빼면 1/1~1/5(자월)의 월간이 한 해 어긋난다.
    eff_year = dt.year
    if dt.month <= 2 and term in ("동지", "소한", "대한"):
        eff_year -= 1

    month_stem_starts = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]
    start = month_stem_starts[(eff_year - 4) % 10]
    stem_idx = (start + (branch_idx - 2) % 12) % 10
    p = _pillar(stem_idx, branch_idx)
    p["ganji_name"] = f"{p['stem']}{p['branch']}월"
    return p


def calc_hour_ganji(day_stem: str, hour: int) -> dict:
    """특정 시간의 시운 간지."""
    from engine.data.heavenly_stems import STEMS_BY_KOREAN
    day_stem_idx = STEMS_BY_KOREAN[day_stem]["index"]
    if hour >= 23 or hour < 1:
        branch_idx = 0
    else:
        branch_idx = (hour + 1) // 2
    stem_idx = (day_stem_idx * 2 + branch_idx) % 10
    p = _pillar(stem_idx, branch_idx)
    p["ganji_name"] = f"{p['stem']}{p['branch']}시"
    return p


def get_element_interaction(from_el: str, to_el: str) -> str:
    """두 오행의 관계 설명."""
    if from_el == to_el:
        return f"비화: {from_el}과 동일 오행"
    if WUXING_GENERATION.get(from_el) == to_el:
        return f"{from_el}생{to_el}: 용신을 생하는 기운"
    if WUXING_GENERATION.get(to_el) == from_el:
        return f"{to_el}생{from_el}: 일간을 설기하는 기운"
    if WUXING_DESTRUCTION.get(from_el) == to_el:
        return f"{from_el}극{to_el}: 용신을 극하는 기운"
    if WUXING_DESTRUCTION.get(to_el) == from_el:
        return f"{to_el}극{from_el}: 일간을 극하는 기운"
    return "중립"
