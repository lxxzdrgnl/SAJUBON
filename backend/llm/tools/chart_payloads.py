"""
차트 payload 순수 함수 모음.

chat tool(saju_tools.py)과 question 파이프라인이 공통으로 사용한다.
각 함수는 handle_calculate_saju가 반환한 saju dict를 받아
프론트 ToolCard가 기대하는 data dict를 반환한다.

time-series 차트(wol_un / yeon_un / il_jin)는 날짜 인자를 추가로 받는다.
"""

from __future__ import annotations

from datetime import date as date_type

from engine.handlers.get_il_jin import handle_get_il_jin
from engine.handlers.get_wol_un import handle_get_wol_un
from engine.handlers.get_yeon_un import handle_get_yeon_un


# ─── 원국(origin) 차트 ─────────────────────────────────────────────────────────


def payload_wuxing_balance(saju: dict) -> dict:
    """오행 균형 차트 payload."""
    return {
        "wuxing_count_hap":          saju["wuxing_count_hap"],
        "wuxing_count":              saju["wuxing_count"],
        "wuxing_chars":              saju["wuxing_chars"],
        "wuxing_hap_contributions":  saju["wuxing_hap_contributions"],
        "dominant_elements":         saju.get("dominant_elements", []),
        "weak_elements":             saju.get("weak_elements", []),
        "day_stem_element":          saju["day_pillar"]["stem_element"],
        # 조후(調候): 월지 기후 맥락 — 엔진 계산값, 수치 조정 분포 없음
        "climate_vibe":              saju.get("meta", {}).get("climate_vibe", {}),
    }


def payload_ten_gods(saju: dict) -> dict:
    """십성 분포 차트 payload."""
    return {
        "ten_gods_distribution": saju.get("ten_gods_distribution", {}),
        "structure_patterns":    saju["structure_patterns"],
    }


def payload_sin_sal(saju: dict) -> dict:
    """신살 목록 차트 payload."""
    return {"sin_sals": saju.get("sin_sals", [])}


def payload_palja(saju: dict) -> dict:
    """사주팔자 원국 차트 payload."""
    day = saju["day_pillar"]
    return {
        "year_pillar":  saju["year_pillar"],
        "month_pillar": saju["month_pillar"],
        "day_pillar":   day,
        "hour_pillar":  saju["hour_pillar"],
        "day_stem":     day["stem"],
        "gyeok_guk":    saju["gyeok_guk"],
    }


def payload_strength(saju: dict) -> dict:
    """일간 강약 + 용신 차트 payload."""
    return {
        "day_master_strength": saju["day_master_strength"],
        "yong_sin":            saju["yong_sin"],
    }


def payload_twelve_un_seong(saju: dict) -> dict:
    """12운성 차트 payload."""
    day = saju["day_pillar"]
    pillars_wun = {}
    for key in ("year_pillar", "month_pillar", "day_pillar", "hour_pillar"):
        p = saju.get(key)
        if p:
            pillars_wun[key] = {
                "stem":       p["stem"],
                "branch":     p["branch"],
                "twelve_wun": p["twelve_wun"],
            }
    return {
        "pillars_wun": pillars_wun,
        "day_stem":    day["stem"],
        "day_element": day["stem_element"],
    }


def payload_hap_chung(saju: dict) -> dict:
    """합충 관계 차트 payload."""
    return {
        "year_pillar":      saju.get("year_pillar"),
        "month_pillar":     saju.get("month_pillar"),
        "day_pillar":       saju.get("day_pillar"),
        "hour_pillar":      saju.get("hour_pillar"),
        "branch_relations": saju.get("branch_relations", {}),
        "gong_mang":        saju.get("gong_mang", {"vacant_branches": [], "affected_pillars": []}),
    }


def payload_dae_un(saju: dict) -> dict:
    """대운 전체 타임라인 차트 payload."""
    return {"dae_un_list": saju["dae_un_list"]}


# ─── 시계열(timing) 차트 ───────────────────────────────────────────────────────


def payload_wol_un(saju: dict, year: int | None = None) -> dict:
    """월운 12개월 차트 payload."""
    day_stem = saju["day_pillar"]["stem"]
    target_year = year or date_type.today().year
    months = handle_get_wol_un(year=target_year, day_stem=day_stem)
    return {"year": target_year, "months": months}


def payload_yeon_un(saju: dict, start_year: int | None = None, count: int = 5) -> dict:
    """연운 N년치 차트 payload."""
    day_stem = saju["day_pillar"]["stem"]
    start = start_year or date_type.today().year
    years = handle_get_yeon_un(start_year=start, count=min(count, 10), day_stem=day_stem)
    return {"start_year": start, "years": years}


def payload_il_jin(year: int | None = None, month: int | None = None) -> dict:
    """일진 달력 차트 payload."""
    today = date_type.today()
    y = year or today.year
    m = month or today.month
    days = handle_get_il_jin(year=y, month=m)
    return {"year": y, "month": m, "days": days}
