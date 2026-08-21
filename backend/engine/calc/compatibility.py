"""
궁합(宮合) 점수 계산.
일주·오행·지지 관계·십성 4개 항목 가중 합산.
"""

from __future__ import annotations
from engine.data.earthly_branches import SAM_HAP, CHUNG_PAIRS
from engine.data.wuxing import WUXING_GENERATION, WUXING_DESTRUCTION
from engine.calc.ten_gods import calculate_ten_god


# 십성별 관계 우호도 — 정관/정인/식신/정재 높음, 편관/겁재 낮음
_TEN_GOD_HARMONY: dict[str, int] = {
    "비견": 60, "겁재": 45,
    "식신": 80, "상관": 60,
    "편재": 70, "정재": 85,
    "편관": 50, "정관": 85,
    "편인": 60, "정인": 80,
}


def _element_harmony(el1: str, el2: str) -> int:
    """두 오행의 조화도 (0~100)."""
    if el1 == el2:
        return 70
    if WUXING_GENERATION.get(el1) == el2 or WUXING_GENERATION.get(el2) == el1:
        return 85
    if WUXING_DESTRUCTION.get(el1) == el2 or WUXING_DESTRUCTION.get(el2) == el1:
        return 40
    return 60


def _day_pillar_score(saju1: dict, saju2: dict) -> int:
    """일주 간지 조화도."""
    el1 = saju1["day_pillar"]["stem_element"]
    el2 = saju2["day_pillar"]["stem_element"]
    base = _element_harmony(el1, el2)

    # 같은 일주면 -10 (자형)
    if saju1["day_pillar"]["stem"] == saju2["day_pillar"]["stem"] and \
       saju1["day_pillar"]["branch"] == saju2["day_pillar"]["branch"]:
        base -= 10
    return min(100, max(0, base))


def _element_harmony_score(saju1: dict, saju2: dict) -> int:
    """전체 오행 분포 조화도 — 두 사주 합산 분포가 고를수록 높음.

    wuxing_count는 백분율(합 ~100)이라, 균등(이상)분포 대비 편차 비율로 환산한다.
    spread = Σ|v - 이상값| / total  (0=완전균형 ~ 1.6=한 오행 집중).
    """
    w1 = saju1["wuxing_count"]
    w2 = saju2["wuxing_count"]
    combined = {e: w1.get(e, 0) + w2.get(e, 0) for e in ["목", "화", "토", "금", "수"]}
    total = sum(combined.values()) or 1
    ideal = total / 5
    spread = sum(abs(v - ideal) for v in combined.values()) / total
    score = round(100 - spread * 60)
    return max(0, min(100, score))


def _branch_relation_score(saju1: dict, saju2: dict) -> tuple[int, list[str]]:
    """지지 관계 점수 + 충 쌍 목록."""
    branches = [
        saju1["year_pillar"]["branch"], saju1["month_pillar"]["branch"],
        saju1["day_pillar"]["branch"],  saju1["hour_pillar"]["branch"],
        saju2["year_pillar"]["branch"], saju2["month_pillar"]["branch"],
        saju2["day_pillar"]["branch"],  saju2["hour_pillar"]["branch"],
    ]
    branch_set = set(branches)
    score = 70

    # 삼합이 성립하면 +10
    for data in SAM_HAP.values():
        if all(b in branch_set for b in data["branches"]):
            score += 10
            break

    # 충 쌍마다 -10
    conflicts = []
    for a, b in CHUNG_PAIRS:
        if a in branch_set and b in branch_set:
            score -= 10
            conflicts.append(f"{a}-{b}")

    return min(100, max(0, score)), conflicts


def _ten_gods_score(saju1: dict, saju2: dict) -> int:
    """십성 상호 관계 점수 (일간 기준 실제 십성 계산)."""
    # 양방향 평균 — A→B만 보면 입력 순서에 따라 점수가 달라진다 (91 vs 83 같은 비대칭)
    s1, s2 = saju1["day_pillar"]["stem"], saju2["day_pillar"]["stem"]
    fwd = _TEN_GOD_HARMONY.get(calculate_ten_god(s1, s2), 60)
    bwd = _TEN_GOD_HARMONY.get(calculate_ten_god(s2, s1), 60)
    return round((fwd + bwd) / 2)


def _feelgood(x: int) -> int:
    """원점수를 기분 좋은 범위로 상향평준화한다 (단조 증가 → 순위 보존, 평균 ~85).

    궁합 점수는 소비자 경험상 너무 박하면 안 된다. raw 64 → 85로 매핑되며
    잘 맞는 쌍은 90+, 안 맞는 쌍은 60대 후반~70대. 상대 비교는 그대로 유지.
    """
    # 59+0.40x 는 SD 3.4(78~92)로 누구와 봐도 80점대라 변별력이 없었다.
    # 25+0.90x: 평균 ~85, SD ~8, 69~100 — ≥95점 약 10%, ≥90점 약 39%, 75점 미만 12%.
    return round(min(100, max(0, 25 + x * 0.90)))


def check_compatibility(saju1: dict, saju2: dict) -> dict:
    """
    궁합 점수 계산.

    Returns:
        total_score, day_pillar_score, element_harmony_score,
        branch_relation_score, ten_gods_score,
        conflict_branches, complement_elements (하위호환),
        complement_a_to_b, complement_b_to_a
    """
    dp = _day_pillar_score(saju1, saju2)
    eh = _element_harmony_score(saju1, saju2)
    br, conflicts = _branch_relation_score(saju1, saju2)
    tg = _ten_gods_score(saju1, saju2)

    # 가중 평균 (40 : 25 : 20 : 15) 후 상향평준화
    raw_total = int(dp * 0.40 + eh * 0.25 + br * 0.20 + tg * 0.15)
    total = _feelgood(raw_total)

    # 양방향 보완 오행
    weak1 = saju1.get("weak_elements", [])
    weak2 = saju2.get("weak_elements", [])
    dominant1 = saju1.get("dominant_elements", [])
    dominant2 = saju2.get("dominant_elements", [])

    # a→b: 사주1의 약한 오행을 사주2가 보완
    complement_a_to_b = list(set(weak1) & set(dominant2))
    # b→a: 사주2의 약한 오행을 사주1이 보완
    complement_b_to_a = list(set(weak2) & set(dominant1))
    # 하위호환: 기존 complement_elements 유지 (a→b 방향)
    complement = complement_a_to_b

    return {
        "total_score": total,
        "day_pillar_score": _feelgood(dp),
        "element_harmony_score": _feelgood(eh),
        "branch_relation_score": _feelgood(br),
        "ten_gods_score": _feelgood(tg),
        "conflict_branches": conflicts,
        "complement_elements": complement,
        "complement_a_to_b": complement_a_to_b,
        "complement_b_to_a": complement_b_to_a,
    }
