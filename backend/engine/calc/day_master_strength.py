"""
일간(日干) 강약 점수화.

판단 기준:
  1. 월령 득실 (±40) — 가장 중요
  2. 비겁 개수   (±25)
  3. 인성 개수   (+20)
  4. 재관식상    (−15)
"""

from __future__ import annotations
from engine.data.earthly_branches import BRANCHES_BY_KOREAN
from engine.data.wuxing import WUXING_GENERATION
from engine.calc.ten_gods import calculate_ten_gods_distribution

_SUPPORT_GODS: set[str] = {"비견", "겁재", "정인", "편인"}

_LEVEL_8_THRESHOLDS = [
    (90, "극왕"), (80, "태강"), (68, "신강"), (55, "중화신강"),
    (45, "중화신약"), (32, "신약"), (20, "태약"),
]


def _get_level_8(score: int) -> str:
    for threshold, label in _LEVEL_8_THRESHOLDS:
        if score >= threshold:
            return label
    return "극약"


# 월지(月支)와 일간(日干) 오행의 관계 → 월령 득실
def _month_branch_relation(day_element: str, month_branch: str) -> str:
    """월지 오행이 일간을 생하면 strong, 극하면 weak, 그 외 medium."""
    branch_el = BRANCHES_BY_KOREAN[month_branch]["element"]
    # 득령: 월지가 인성(나를 생) 또는 비겁(같은 오행)
    if WUXING_GENERATION.get(branch_el) == day_element or branch_el == day_element:
        return "strong"
    # 식상 월(내가 생하는 오행): 설기 — 실령이되 재·관 월보다 완만
    if WUXING_GENERATION.get(day_element) == branch_el:
        return "medium"
    # 재성 월(내가 극) · 관성 월(나를 극): 실령
    return "weak"


def _branch_ten_god_category(day_stem: str, branch: str) -> str:
    """지지 정기(正氣) 기준 십성 반환."""
    from engine.calc.ten_gods import get_branch_ten_god
    return get_branch_ten_god(day_stem, branch)


def analyze_day_master_strength(saju: dict, ten_gods_dist: dict, branch_relations: dict | None = None) -> dict:
    """
    일간 강약 종합 분석.

    Returns:
        level: very_strong | strong | medium | weak | very_weak
        score: 0-100
        analysis: 이유 문자열
    """
    score = 50
    reasons: list[str] = []
    factors: dict[str, int] = {}

    day_element = saju["day_pillar"]["stem_element"]
    month_branch = saju["month_pillar"]["branch"]

    # 십성 분포 총 가중치 = 천간 3×1.0 + 월지 1.5 + 지지 3×0.5 = 6.0 (시주 없으면 4.5)
    _total_w = sum(ten_gods_dist.values()) or 1.0

    # 1. 월령 득실 (+8 / 식상월 −5 / 재관월 −8) — 월지는 생조 비율(가중 1.5)에도 들어가므로 과중 방지
    wol_relation = _month_branch_relation(day_element, month_branch)
    if wol_relation == "strong":
        score += 8; factors["wol_ryeong"] = 8
        reasons.append("월령을 득하여 강함")
    elif wol_relation == "medium":
        score -= 5;  factors["wol_ryeong"] = -5
        reasons.append("식상 월령으로 설기되어 약함")
    else:
        score -= 8; factors["wol_ryeong"] = -8
        reasons.append("월령을 실하여 약함")

    # 2. 생조 비율 — (비겁+인성)/전체, 기대값 0.4를 중심으로 ±(연속형)
    #    (예전엔 '비겁≥4·재관식상≥6' 같은 절대 개수 임계값이라 총가중치 6 기준에서 대부분 감점만 받았다)
    bigeop  = ten_gods_dist.get("비견", 0) + ten_gods_dist.get("겁재", 0)
    inseong = ten_gods_dist.get("정인", 0) + ten_gods_dist.get("편인", 0)
    seolgi  = sum(ten_gods_dist.get(g, 0) for g in ["정재", "편재", "정관", "편관", "식신", "상관"])
    support_ratio = (bigeop + inseong) / _total_w
    support_pts = round(40 * (support_ratio - 0.40))
    score += support_pts; factors["support"] = support_pts
    factors["bigeop"] = round(bigeop, 2); factors["inseong"] = round(inseong, 2); factors["seolgi"] = round(seolgi, 2)
    if support_ratio >= 0.6:
        reasons.append("비겁·인성이 많아 생조가 강함")
    elif support_ratio >= 0.4:
        reasons.append("생조와 설기가 균형")
    elif support_ratio >= 0.2:
        reasons.append("재관식상이 많아 설기됨")
    else:
        reasons.append("생조가 거의 없어 매우 약함")

    # 3. 득지·득시 (일지·시지 본기가 비겁·인성)
    _day_stem_tmp = saju["day_pillar"]["stem"]
    if _branch_ten_god_category(_day_stem_tmp, saju["day_pillar"]["branch"]) in _SUPPORT_GODS:
        score += 6; factors["deuk_ji"] = 6; reasons.append("득지")
    if saju.get("hour_pillar") is not None and \
       _branch_ten_god_category(_day_stem_tmp, saju["hour_pillar"]["branch"]) in _SUPPORT_GODS:
        score += 4; factors["deuk_si"] = 4; reasons.append("득시")

    raw_score = score
    score = max(0, min(100, score))

    # 5단계는 8단계 라벨과 정합되게 (42점=신약인데 medium으로 잡혀 용신이 어긋나던 문제)
    if score >= 80:   level = "very_strong"   # 극왕·태강
    elif score >= 68: level = "strong"        # 신강
    elif score >= 45: level = "medium"        # 중화신강·중화신약
    elif score >= 20: level = "weak"          # 신약·태약
    else:             level = "very_weak"     # 극약

    # ── 득령/득지/득시/득세 ──────────────────────────────────────
    day_stem   = saju["day_pillar"]["stem"]
    day_branch = saju["day_pillar"]["branch"]

    deuk_ryeong = wol_relation == "strong"
    deuk_ji  = _branch_ten_god_category(day_stem, day_branch) in _SUPPORT_GODS
    if saju.get("hour_pillar") is not None:
        hour_branch = saju["hour_pillar"]["branch"]
        deuk_si = _branch_ten_god_category(day_stem, hour_branch) in _SUPPORT_GODS
    else:
        deuk_si = False  # 시주 미입력 시 득시 판단 불가

    # ── 득세: 삼합/방합/반합만 반영, 육합·천간합 제외, 월지 기여분 제외 ──
    # branch_relations 없으면 원국 ten_gods_dist 사용
    if branch_relations:
        # 기둥 순서 + branch→pillar 매핑
        _pillar_order = [p for p in ["year", "month", "day", "hour"] if saju.get(f"{p}_pillar") is not None]
        _branch_to_pillars: dict[str, list[str]] = {}
        for _p in _pillar_order:
            _branch_to_pillars.setdefault(saju[f"{_p}_pillar"]["branch"], []).append(f"{_p}_pillar")

        # 합화 결과 오행의 천간 존재 여부
        _HAP_EL_STEMS: dict[str, set] = {
            "목": {"갑", "을"}, "화": {"병", "정"},
            "토": {"무", "기"}, "금": {"경", "신"}, "수": {"임", "계"},
        }
        _all_stems = {saju[_k]["stem"] for _k in ["year_pillar", "month_pillar", "day_pillar", "hour_pillar"] if saju.get(_k)}

        # 삼합(삼합/방합/반합)만 override 구성 — 육합/천간합 제외
        _sam_hap_overrides: dict[str, tuple[str, float]] = {}
        for _sam in branch_relations.get("sam_hap", []):
            _result_el = _sam.get("element", "")
            _hap_subtype = _sam.get("type", "삼합")
            _base = 0.30 if _hap_subtype == "반합" else (0.45 if _hap_subtype == "방합" else 0.50)
            _has_stem = bool(_HAP_EL_STEMS.get(_result_el, set()) & _all_stems)
            if _has_stem:
                _base += 0.30
            for _br in _sam.get("branches", []):
                for _pk in _branch_to_pillars.get(_br, []):
                    if _result_el == saju[_pk]["branch_element"]:
                        continue
                    _ratio = _base
                    if _pk == "month_pillar":
                        _full_combo = _hap_subtype in ("삼합", "방합")
                        _ratio = min(_ratio, 0.80 if (_full_combo and _has_stem) else 0.50)
                    _ratio = min(_ratio, 1.0)
                    if _ratio > _sam_hap_overrides.get(_pk, ("", 0.0))[1]:
                        _sam_hap_overrides[_pk] = (_result_el, _ratio)

        _deuk_se_dist = calculate_ten_gods_distribution(saju, _sam_hap_overrides, {})
    else:
        _deuk_se_dist = ten_gods_dist

    _bigeop_d  = _deuk_se_dist.get("비견", 0) + _deuk_se_dist.get("겁재", 0)
    _inseong_d = _deuk_se_dist.get("정인", 0) + _deuk_se_dist.get("편인", 0)
    _seolgi_d  = sum(_deuk_se_dist.get(g, 0) for g in ["정재", "편재", "정관", "편관", "식신", "상관"])

    # 월지 기여분 제외 (得令에서 이미 반영)
    _month_br_tg = _branch_ten_god_category(day_stem, month_branch)
    _month_br_weight = 1.5 if _month_br_tg in _SUPPORT_GODS else 0.0
    deuk_se = (_bigeop_d + _inseong_d - _month_br_weight) >= _seolgi_d

    return {
        "level": level,
        "level_8": _get_level_8(score),
        "score": score,
        "raw_score": raw_score,
        "score_range": [0, 100],
        "factors": factors,
        "analysis": ". ".join(reasons),
        "wol_ryeong": wol_relation,
        "deuk_ryeong": deuk_ryeong,
        "deuk_ji":     deuk_ji,
        "deuk_si":     deuk_si,
        "deuk_se":     deuk_se,
    }
