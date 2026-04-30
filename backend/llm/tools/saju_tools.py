"""사주 에이전트 LangChain tool 래퍼 모음."""

from __future__ import annotations


def extract_summary(saju: dict) -> dict:
    """엔진 전체 결과에서 채팅 state 저장용 요약 추출."""
    pillars = {}
    for p in ["year", "month", "day", "hour"]:
        pillar = saju.get(f"{p}_pillar")
        if pillar:
            pillars[p] = {"stem": pillar["stem"], "branch": pillar["branch"]}

    return {
        "day_stem":    saju["day_pillar"]["stem"],
        "day_element": saju["day_pillar"]["stem_element"],
        "gyeok_guk":   saju["gyeok_guk"].get("name", ""),
        "yong_sin":    saju["yong_sin"].get("primary", []),
        "ji_sin":      saju["yong_sin"].get("taboo", []),
        "strength":    saju["day_master_strength"]["level"],
        "pillars":     pillars,
        "current_dae_un": {
            "stem":      saju["current_dae_un"]["stem"],
            "branch":    saju["current_dae_un"]["branch"],
            "start_age": saju["current_dae_un"]["start_age"],
            "end_age":   saju["current_dae_un"]["end_age"],
        },
        "wuxing_pct":            saju["wuxing_count"],
        "ten_gods_distribution": saju["ten_gods_distribution"],
        "structure_patterns":    saju["structure_patterns"],
        "sin_sals": [
            {"name": s["name"], "type": s["type"], "priority": s["priority"]}
            for s in saju["sin_sals"]
        ],
        "behavior_profile": saju["behavior_profile"],
        "life_domains":     saju["life_domains"],
        "branch_relations": {
            k: saju["branch_relations"].get(k, [])
            for k in ("sam_hap", "chung", "yuk_hap")
        },
    }
