"""사주 에이전트 LangChain tool 래퍼 모음."""

from __future__ import annotations

import asyncio
import json
from datetime import date as date_type
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig

from engine.handlers.calculate_saju import handle_calculate_saju
from engine.handlers.get_daily_fortune import handle_get_daily_fortune
from engine.handlers.get_wol_un import handle_get_wol_un
from engine.handlers.get_dae_un import handle_get_dae_un
from engine.handlers.get_yeon_un import handle_get_yeon_un
from engine.handlers.get_il_jin import handle_get_il_jin
from engine.handlers.convert_calendar import handle_convert_calendar
from engine.handlers.check_compatibility import handle_check_compatibility
from rag.search import handle_search_by_context
from engine.calc.ten_gods import calculate_ten_god, get_branch_ten_god
from engine.calc.se_un import calc_year_ganji, calc_month_ganji, get_element_interaction
from engine.calc.twelve_wun import get_twelve_wun

# request_partner_profile tool이 반환하는 시그널 문자열.
# SSE 레이어(routers/chat.py)가 이 tool 호출을 감지해 request_partner 이벤트를 방출한다.
REQUEST_PARTNER_SIGNAL = "상대 만세력 첨부 요청됨"

# 차트 렌더 대상 tool — on_tool_end에서 payload(data)를 tool_result SSE로 방출한다.
# 이 목록의 tool은 모두 {"summary": str, "data": dict} JSON 문자열을 반환해야 한다.
CHART_TOOL_NAMES = frozenset({
    "get_dae_un",
    "get_wol_un",
    "get_yeon_un",
    "get_daily_fortune",
    "get_il_jin",
    "get_compatibility_detail",
    "get_wuxing_balance",
    "get_ten_gods",
    "get_sin_sal",
    "get_palja",
    "get_strength",
    "get_twelve_un_seong",
    "get_hap_chung",
})


def _envelope(summary: str, data: dict) -> str:
    """차트 tool 공통 반환 형식.

    agent 추론은 summary 텍스트를, 프론트(SSE tool_result)는 data를 쓴다.
    """
    return json.dumps({"summary": summary, "data": data}, ensure_ascii=False, default=str)


def _birth_info(config: RunnableConfig) -> dict:
    """RunnableConfig에서 birth_info 추출."""
    return config["configurable"]["birth_info"]


def _partner_info(config: RunnableConfig) -> dict | None:
    """RunnableConfig에서 첨부된 상대 사주 추출 (없으면 None)."""
    return (config or {}).get("configurable", {}).get("partner_info")


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


@tool
async def search_rag(query: str, domain: str = "general", config: RunnableConfig = None) -> str:
    """명리 지식 RAG 검색. domain: career/love/money/health/general"""
    results = await asyncio.to_thread(
        handle_search_by_context,
        context_ranking={"primary": [query], "secondary": []},
        life_domains={domain: [query]},
        concern=query,
    )
    return json.dumps(results, ensure_ascii=False)


@tool
async def get_daily_fortune(target_date: str | None = None, config: RunnableConfig = None) -> str:
    """오늘 또는 특정 날짜의 일진 운세. target_date: YYYY-MM-DD (생략 시 오늘)"""
    birth_info = _birth_info(config)
    result = await asyncio.to_thread(
        handle_get_daily_fortune,
        birth_date=birth_info["birth_date"],
        birth_time=birth_info.get("birth_time"),
        gender=birth_info["gender"],
        calendar=birth_info.get("calendar", "solar"),
        target_date=target_date,
    )
    day_label = target_date or "오늘"
    return _envelope(f"{day_label}의 일진 운세 데이터입니다.", result)


@tool
async def get_wol_un(year: int | None = None, config: RunnableConfig = None) -> str:
    """특정 연도의 월운 12개. year 생략 시 올해."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day_stem = saju["day_pillar"]["stem"]
    target_year = year or date_type.today().year
    result = await asyncio.to_thread(handle_get_wol_un, year=target_year, day_stem=day_stem)
    return _envelope(f"{target_year}년 월운 12개월 데이터입니다.", {"year": target_year, "months": result})


@tool
async def get_dae_un(config: RunnableConfig = None) -> str:
    """대운 전체 목록 (12개)."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    return _envelope("대운 전체 타임라인 데이터입니다.", {"dae_un_list": saju["dae_un_list"]})


@tool
async def get_yeon_un(start_year: int | None = None, count: int = 5, config: RunnableConfig = None) -> str:
    """N년치 연운. start_year 생략 시 올해부터."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day_stem = saju["day_pillar"]["stem"]
    start = start_year or date_type.today().year
    result = await asyncio.to_thread(handle_get_yeon_un, start_year=start, count=min(count, 10), day_stem=day_stem)
    return _envelope(f"{start}년부터 {len(result)}년치 연운 데이터입니다.", {"start_year": start, "years": result})


@tool
async def get_il_jin(year: int | None = None, month: int | None = None, config: RunnableConfig = None) -> str:
    """특정 월의 일진 달력. 생략 시 이번 달."""
    today = date_type.today()
    y = year or today.year
    m = month or today.month
    result = await asyncio.to_thread(handle_get_il_jin, year=y, month=m)
    return _envelope(f"{y}년 {m}월 일진 달력 데이터입니다.", {"year": y, "month": m, "days": result})


@tool
async def explain_past_event(target_date: str, config: RunnableConfig = None) -> str:
    """과거 특정 날짜/연도의 세운·월운 역산. target_date: YYYY-MM-DD 또는 YYYY"""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day_stem = saju["day_pillar"]["stem"]

    if len(target_date) == 4:  # YYYY
        year = int(target_date)
        result = await asyncio.to_thread(handle_get_yeon_un, start_year=year, count=1, day_stem=day_stem)
        return json.dumps({"type": "year", "data": result}, ensure_ascii=False)
    else:  # YYYY-MM-DD
        y, m, _ = map(int, target_date.split("-"))
        year_data = await asyncio.to_thread(handle_get_yeon_un, start_year=y, count=1, day_stem=day_stem)
        wol_data = await asyncio.to_thread(handle_get_wol_un, year=y, day_stem=day_stem)
        month_data = next((w for w in wol_data if w["month"] == m), None)
        return json.dumps({"type": "month", "year": year_data[0] if year_data else None, "month": month_data}, ensure_ascii=False)


@tool
async def convert_calendar(
    target_date: str,
    from_calendar: str = "solar",
    to_calendar: str = "lunar",
    config: RunnableConfig = None,
) -> str:
    """양력↔음력 변환. from_calendar/to_calendar: solar | lunar"""
    result = await asyncio.to_thread(
        handle_convert_calendar,
        date=target_date,
        from_calendar=from_calendar,
        to_calendar=to_calendar,
    )
    return json.dumps(result, ensure_ascii=False)


# ─── 원국 시각 카드 tool — 만세력 분석 데이터를 차트로 띄운다 ──────────────────────
# 각 tool은 handle_calculate_saju 전체 결과 중 해당 카드가 쓰는 필드만 추려
# _envelope(summary, data)로 반환한다. data 키는 SajuCalcResponse 필드와 동일.


@tool
async def get_wuxing_balance(config: RunnableConfig = None) -> str:
    """오행(목화토금수) 기운 균형 분석. '오행', '기운 균형', '부족한 기운' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    dominant = saju.get("dominant_elements", [])
    weak = saju.get("weak_elements", [])
    parts = []
    if dominant:
        parts.append(f"{'·'.join(dominant)} 기운이 강하고")
    if weak:
        parts.append(f"{'·'.join(weak)} 기운이 약한")
    summary = f"오행 분포는 {' '.join(parts)} 구조입니다." if parts else "오행 분포 데이터입니다."
    data = {
        "wuxing_count_hap":          saju["wuxing_count_hap"],
        "wuxing_count":              saju["wuxing_count"],
        "wuxing_chars":              saju["wuxing_chars"],
        "wuxing_hap_contributions":  saju["wuxing_hap_contributions"],
        "dominant_elements":         dominant,
        "weak_elements":             weak,
        "day_stem_element":          saju["day_pillar"]["stem_element"],
    }
    return _envelope(summary, data)


@tool
async def get_ten_gods(config: RunnableConfig = None) -> str:
    """십성(비겁·식상·재성·관성·인성) 분포 분석. '십성', '관성/재성' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    dist = saju.get("ten_gods_distribution", {})
    top = max(dist, key=dist.get) if dist else ""
    summary = f"십성 분포에서 {top}이(가) 가장 두드러집니다." if top else "십성 분포 데이터입니다."
    data = {
        "ten_gods_distribution": dist,
        "structure_patterns":    saju["structure_patterns"],
    }
    return _envelope(summary, data)


@tool
async def get_sin_sal(config: RunnableConfig = None) -> str:
    """신살(神殺) 목록 분석. '신살', '도화살/역마살/천을귀인' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    sin_sals = saju.get("sin_sals", [])
    names = "·".join(s["name"] for s in sin_sals)
    summary = f"사주에 {names} 신살이 있습니다." if names else "별다른 신살은 없습니다."
    return _envelope(summary, {"sin_sals": sin_sals})


@tool
async def get_palja(config: RunnableConfig = None) -> str:
    """사주팔자 원국(8글자) 분석. '사주팔자', '원국', '내 사주가 뭐야' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day = saju["day_pillar"]
    summary = f"일간 {day['stem']}({day['stem_element']})을 중심으로 한 사주팔자 원국입니다."
    data = {
        "year_pillar":  saju["year_pillar"],
        "month_pillar": saju["month_pillar"],
        "day_pillar":   day,
        "hour_pillar":  saju["hour_pillar"],
        "day_stem":     day["stem"],
        "gyeok_guk":    saju["gyeok_guk"],
    }
    return _envelope(summary, data)


@tool
async def get_strength(config: RunnableConfig = None) -> str:
    """일간 강약과 용신·기신 분석. '신강/신약', '용신', '내 기운이 강한가' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    strength = saju["day_master_strength"]
    yong = saju["yong_sin"]
    summary = (
        f"일간은 {strength.get('level_8', strength.get('level', ''))}이며 "
        f"용신은 {yong.get('primary', '')}입니다."
    )
    data = {
        "day_master_strength": strength,
        "yong_sin":            yong,
    }
    return _envelope(summary, data)


@tool
async def get_twelve_un_seong(config: RunnableConfig = None) -> str:
    """12운성(십이운성) 분석. '12운성', '각 기둥 생로병사', '기둥별 생애단계' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day = saju["day_pillar"]
    pillars_wun = {}
    for key in ("year_pillar", "month_pillar", "day_pillar", "hour_pillar"):
        p = saju.get(key)
        if p:
            pillars_wun[key] = {
                "stem": p["stem"],
                "branch": p["branch"],
                "twelve_wun": p["twelve_wun"],
            }
    wun_labels = [f"{p['stem']}{p['branch']}({p['twelve_wun']})" for p in pillars_wun.values()]
    summary = (
        f"일간 {day['stem']}의 12운성: "
        + ", ".join(wun_labels)
    )
    data = {
        "pillars_wun": pillars_wun,
        "day_stem": day["stem"],
        "day_element": day["stem_element"],
    }
    return _envelope(summary, data)


@tool
async def get_hap_chung(config: RunnableConfig = None) -> str:
    """합충 관계 분석. '합충', '기둥끼리 관계', '충', '삼합/육합', '공망' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    branch_relations = saju.get("branch_relations", {})
    gong_mang = saju.get("gong_mang", {"vacant_branches": [], "affected_pillars": []})

    # 활성 관계 종류 요약 (비어있지 않은 키)
    active_keys = [k for k, v in branch_relations.items() if v]
    summary_parts = []
    if active_keys:
        summary_parts.append("·".join(active_keys) + " 관계가 있습니다")
    if gong_mang.get("affected_pillars"):
        affected = "·".join(gong_mang["affected_pillars"])
        summary_parts.append(f"{affected}주에 공망")
    summary = (
        "합충 관계: " + ", ".join(summary_parts)
        if summary_parts
        else "특별한 합충 관계가 없습니다."
    )

    data = {
        "year_pillar":   saju.get("year_pillar"),
        "month_pillar":  saju.get("month_pillar"),
        "day_pillar":    saju.get("day_pillar"),
        "hour_pillar":   saju.get("hour_pillar"),
        "branch_relations": branch_relations,
        "gong_mang":     gong_mang,
    }
    return _envelope(summary, data)


# ─── Domain-to-ten-god mapping ─────────────────────────────────────────────
_DOMAIN_TEN_GODS: dict[str, list[str]] = {
    "연애": ["정관", "편관", "정재", "편재"],
    "재물": ["정재", "편재", "식신", "상관"],
    "직업": ["정관", "편관", "정인"],
    "이사": ["편관", "식신"],
    "general": [],
}

_SAM_JAE_MAP: dict[str, list[str]] = {
    "인": ["신", "유", "술"], "오": ["신", "유", "술"], "술": ["신", "유", "술"],
    "사": ["해", "자", "축"], "유": ["해", "자", "축"], "축": ["해", "자", "축"],
    "신": ["인", "묘", "진"], "자": ["인", "묘", "진"], "진": ["인", "묘", "진"],
    "해": ["사", "오", "미"], "묘": ["사", "오", "미"], "미": ["사", "오", "미"],
}


def _compute_current_luck_overview(saju: dict) -> dict:
    today = date_type.today()
    day_stem = saju["day_pillar"]["stem"]
    day_el = saju["day_pillar"]["stem_element"]
    yong_sin = saju["yong_sin"].get("primary", [])

    se_un_ganji = calc_year_ganji(today.year)
    se_un = {
        **se_un_ganji,
        "year": today.year,
        "stem_ten_god":   calculate_ten_god(day_stem, se_un_ganji["stem"]),
        "branch_ten_god": get_branch_ten_god(day_stem, se_un_ganji["branch"]),
        "twelve_wun":     get_twelve_wun(se_un_ganji["stem"], se_un_ganji["branch"]),
        "interaction_with_day_master": get_element_interaction(se_un_ganji["stem_element"], day_el),
        "interaction_with_yong_sin":   get_element_interaction(
            se_un_ganji["stem_element"], yong_sin[0] if yong_sin else ""
        ),
    }

    wol_ganji = calc_month_ganji(today.year, today.month)
    wol_un = {
        **wol_ganji,
        "month": today.month,
        "stem_ten_god":   calculate_ten_god(day_stem, wol_ganji["stem"]),
        "branch_ten_god": get_branch_ten_god(day_stem, wol_ganji["branch"]),
        "twelve_wun":     get_twelve_wun(wol_ganji["stem"], wol_ganji["branch"]),
        "interaction_with_day_master": get_element_interaction(wol_ganji["stem_element"], day_el),
    }

    return {
        "current_dae_un": saju["current_dae_un"],
        "se_un": se_un,
        "wol_un": wol_un,
        "yong_sin": yong_sin,
        "ji_sin": saju["yong_sin"].get("taboo", []),
    }


def _compute_find_favorable_periods(saju: dict, domain: str, years: int = 5) -> dict:
    day_stem = saju["day_pillar"]["stem"]
    yong_sin = saju["yong_sin"].get("primary", [])
    start = date_type.today().year
    yeon_un = handle_get_yeon_un(start_year=start, count=min(years, 10), day_stem=day_stem)

    domain_gods = _DOMAIN_TEN_GODS.get(domain, [])
    favorable, neutral = [], []
    for y in yeon_un:
        score = 0
        if y.get("stem_element") in yong_sin or y.get("branch_element") in yong_sin:
            score += 1
        if domain_gods and y.get("stem_ten_god") in domain_gods:
            score += 1
        entry = {**y, "favorability_score": score}
        (favorable if score >= 1 else neutral).append(entry)

    return {"domain": domain, "favorable": favorable, "neutral_or_unfavorable": neutral}


def _compute_evaluate_specific_date(saju: dict, target_date: str, action: str) -> dict:
    day_stem = saju["day_pillar"]["stem"]
    yong_sin = saju["yong_sin"].get("primary", [])
    ji_sin = saju["yong_sin"].get("taboo", [])

    y, m, _ = map(int, target_date.split("-"))
    il_jin_list = handle_get_il_jin(y, m)
    target_day = next((x for x in il_jin_list if x.get("date") == target_date), None)
    if not target_day:
        return {"error": f"날짜를 찾을 수 없습니다: {target_date}"}

    return {
        "date": target_date,
        "ganji": target_day.get("ganji_name", ""),
        "stem": target_day.get("stem", ""),
        "branch": target_day.get("branch", ""),
        "stem_element": target_day.get("stem_element", ""),
        "branch_element": target_day.get("branch_element", ""),
        "stem_ten_god": calculate_ten_god(day_stem, target_day["stem"]) if target_day.get("stem") else "",
        "branch_ten_god": get_branch_ten_god(day_stem, target_day["branch"]) if target_day.get("branch") else "",
        "favorable": (
            target_day.get("stem_element") in yong_sin or
            target_day.get("branch_element") in yong_sin
        ),
        "unfavorable": (
            target_day.get("stem_element") in ji_sin or
            target_day.get("branch_element") in ji_sin
        ),
        "action": action,
    }


def _compute_check_current_sin_sal_timing(saju: dict) -> dict:
    today = date_type.today()
    year_ganji = calc_year_ganji(today.year)
    month_ganji = calc_month_ganji(today.year, today.month)
    year_branch = year_ganji["branch"]

    year_pillar_branch = saju["year_pillar"]["branch"]
    in_sam_jae = year_branch in _SAM_JAE_MAP.get(year_pillar_branch, [])

    active = []
    for sal in saju.get("sin_sals", []):
        if sal["name"] == "역마살":
            _YEOKMA = {"인": "신", "신": "인", "사": "해", "해": "사"}
            for pillar_key in ["year_pillar", "month_pillar"]:
                p_branch = saju.get(pillar_key, {}).get("branch", "")
                if _YEOKMA.get(p_branch) == year_branch:
                    active.append({**sal, "triggered_by": f"{today.year}년 세운", "reason": "역마충 발동"})
                    break

    return {
        "year": today.year,
        "month": today.month,
        "in_sam_jae": in_sam_jae,
        "active_sin_sals": active,
        "current_year_branch": year_branch,
        "current_month_branch": month_ganji["branch"],
    }


@tool
async def get_current_luck_overview(config: RunnableConfig = None) -> str:
    """현재 대운+세운+월운 교차 분석. '지금 어떤 시기예요?' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    result = _compute_current_luck_overview(saju)
    return json.dumps(result, ensure_ascii=False)


@tool
async def find_favorable_periods(
    domain: str = "general",
    years: int = 5,
    config: RunnableConfig = None,
) -> str:
    """도메인별 길한 시기. domain: 연애/재물/직업/이사/general. years: 조회 연수(최대10)"""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    result = _compute_find_favorable_periods(saju, domain=domain, years=years)
    return json.dumps(result, ensure_ascii=False)


@tool
async def evaluate_specific_date(
    target_date: str,
    action: str = "일반",
    config: RunnableConfig = None,
) -> str:
    """특정 날짜 길흉 판단. target_date: YYYY-MM-DD, action: 계약/이사/결혼 등"""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    result = _compute_evaluate_specific_date(saju, target_date=target_date, action=action)
    return json.dumps(result, ensure_ascii=False)


@tool
async def check_current_sin_sal_timing(config: RunnableConfig = None) -> str:
    """현재 삼재 여부 및 활성화된 신살 확인. '지금 삼재인가요?' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    result = _compute_check_current_sin_sal_timing(saju)
    return json.dumps(result, ensure_ascii=False)


# ─── 궁합 + 상대 프로필 요청 ───────────────────────────────────────────────────

_SCORE_LABEL = [
    (85, "천생연분에 가까운 궁합"),
    (70, "서로를 북돋는 좋은 궁합"),
    (55, "노력으로 빛나는 궁합"),
    (0,  "다름을 이해해야 하는 궁합"),
]


def _score_label(total: int) -> str:
    for threshold, label in _SCORE_LABEL:
        if total >= threshold:
            return label
    return "다름을 이해해야 하는 궁합"


@tool
async def request_partner_profile(config: RunnableConfig = None) -> str:
    """궁합 상담 시 상대방의 만세력이 아직 없을 때 호출. 사용자에게 상대 생년월일시 입력을 요청한다."""
    return REQUEST_PARTNER_SIGNAL


@tool
async def get_compatibility_detail(config: RunnableConfig = None) -> str:
    """본인과 첨부된 상대방의 궁합 점수 상세 분석.

    상대 만세력이 첨부돼 있어야 한다. 없으면 상대 정보가 필요하다는 신호를 반환한다.
    """
    partner = _partner_info(config)
    if not partner:
        return _envelope(
            "상대 정보가 필요합니다. request_partner_profile로 상대 만세력을 먼저 요청하세요.",
            {"need_partner": True},
        )

    birth_info = _birth_info(config)
    partner_name = partner.get("name") or "상대방"
    person2 = {k: v for k, v in partner.items() if k != "name"}

    result = await asyncio.to_thread(handle_check_compatibility, birth_info, person2)
    label = _score_label(result["total_score"])
    summary = (
        f"{partner_name}와의 궁합 총점은 {result['total_score']}점으로 '{label}'입니다. "
        f"(일주 {result['day_pillar_score']} / 오행조화 {result['element_harmony_score']} / "
        f"지지관계 {result['branch_relation_score']} / 십성 {result['ten_gods_score']})"
    )
    data = {**result, "partner_name": partner_name, "score_label": label, "need_partner": False}
    return _envelope(summary, data)
