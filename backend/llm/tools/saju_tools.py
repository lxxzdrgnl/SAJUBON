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
from llm.tools.chart_payloads import (
    payload_wuxing_balance,
    payload_ten_gods,
    payload_sin_sal,
    payload_palja,
    payload_strength,
    payload_twelve_un_seong,
    payload_hap_chung,
    payload_dae_un,
    payload_wol_un,
    payload_yeon_un,
    payload_il_jin,
)

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


# birth_info에는 표시용 name이 섞여 있을 수 있는데 엔진은 이 키를 모른다.
# 엔진 호출부가 16곳이라 접근자 한 곳에서 벗겨 전부 안전하게 만든다.
ENGINE_KEYS = ("birth_date", "birth_time", "gender", "calendar", "is_leap_month")


def engine_args(birth_info: dict) -> dict:
    """엔진(handle_calculate_saju)이 받는 키만 남긴다. name 등 표시용 필드는 제거."""
    return {k: v for k, v in birth_info.items() if k in ENGINE_KEYS}


def _birth_info(config: RunnableConfig) -> dict:
    """RunnableConfig에서 birth_info 추출 (엔진 인자만)."""
    return engine_args(config["configurable"]["birth_info"])


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
    target_year = year or date_type.today().year
    data = await asyncio.to_thread(payload_wol_un, saju, target_year)
    return _envelope(f"{target_year}년 월운 12개월 데이터입니다.", data)


@tool
async def get_dae_un(config: RunnableConfig = None) -> str:
    """대운 전체 목록 (12개)."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    return _envelope("대운 전체 타임라인 데이터입니다.", payload_dae_un(saju))


@tool
async def get_yeon_un(start_year: int | None = None, count: int = 5, config: RunnableConfig = None) -> str:
    """N년치 연운. start_year 생략 시 올해부터."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    start = start_year or date_type.today().year
    data = await asyncio.to_thread(payload_yeon_un, saju, start, count)
    return _envelope(f"{start}년부터 {len(data['years'])}년치 연운 데이터입니다.", data)


@tool
async def get_il_jin(year: int | None = None, month: int | None = None, config: RunnableConfig = None) -> str:
    """특정 월의 일진 달력. 생략 시 이번 달."""
    today = date_type.today()
    y = year or today.year
    m = month or today.month
    data = await asyncio.to_thread(payload_il_jin, y, m)
    return _envelope(f"{y}년 {m}월 일진 달력 데이터입니다.", data)


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

    # 합화(合化) 적용 오행 분포로 강/약 재계산
    # saju["dominant_elements"] / saju["weak_elements"] 는 합화 미적용 raw 값이므로
    # wuxing_count_hap(합화 반영 퍼센트)를 직접 사용해 과다·결핍 판정
    hap_pct: dict[str, float] = saju.get("wuxing_count_hap", {})
    if hap_pct:
        avg_pct = sum(hap_pct.values()) / 5  # 5 오행 평균
        dominant_hap = [e for e, v in hap_pct.items() if v > avg_pct * 1.5]
        weak_hap = [e for e, v in hap_pct.items() if v == 0 or v < avg_pct * 0.5]
    else:
        # fallback: raw dominant/weak (합화 정보 없을 때)
        dominant_hap = saju.get("dominant_elements", [])
        weak_hap = saju.get("weak_elements", [])

    # 합화로 바뀐 글자가 있는지 요약 (wuxing_hap_contributions 활용)
    hap_contributions = saju.get("wuxing_hap_contributions", [])
    changed = [
        f"{c['pillar']}주 {'천간' if c['type'] == 'stem' else '지지'} "
        f"{c['base_element']}→{c['hap_element']}({round(c['hap_ratio']*100)}%)"
        for c in hap_contributions
        if c.get("hap_element") and c["hap_element"] != c["base_element"]
    ]
    hap_note = f" 합화로 {', '.join(changed)} 변환됨." if changed else ""

    parts = []
    if dominant_hap:
        parts.append(f"{'·'.join(dominant_hap)} 기운이 강하고")
    if weak_hap:
        parts.append(f"{'·'.join(weak_hap)} 기운이 약한")
    base_summary = f"오행 분포는 {' '.join(parts)} 구조입니다." if parts else "오행 분포 데이터입니다."

    # 조후(調候) 기후 맥락 한 줄 요약 (엔진이 수치 분포를 별도 계산하지 않으므로 개념 안내)
    climate_vibe = saju.get("meta", {}).get("climate_vibe", {})
    if climate_vibe:
        season_kr = {"spring": "봄", "summer": "여름", "autumn": "가을", "winter": "겨울"}.get(
            climate_vibe.get("season", ""), climate_vibe.get("season", "")
        )
        temp = climate_vibe.get("temperature", "")
        relation = climate_vibe.get("day_element_relation", "")
        johu_note = f" 조후: {season_kr}({temp}) 월지, 일간과 {relation} 관계."
    else:
        johu_note = ""

    summary = base_summary + hap_note + johu_note
    return _envelope(summary, payload_wuxing_balance(saju))


@tool
async def get_ten_gods(config: RunnableConfig = None) -> str:
    """십성(비겁·식상·재성·관성·인성) 분포 분석. '십성', '관성/재성' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    dist = saju.get("ten_gods_distribution", {})
    top = max(dist, key=dist.get) if dist else ""
    summary = f"십성 분포에서 {top}이(가) 가장 두드러집니다." if top else "십성 분포 데이터입니다."
    return _envelope(summary, payload_ten_gods(saju))


@tool
async def get_sin_sal(config: RunnableConfig = None) -> str:
    """신살(神殺) 목록 분석. '신살', '도화살/역마살/천을귀인' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    sin_sals = saju.get("sin_sals", [])
    high = [x["name"] for x in sin_sals if x.get("priority") == "high"]
    rest = [x["name"] for x in sin_sals if x.get("priority") != "high"]
    if sin_sals:
        summary = (
            f"핵심 신살: {'·'.join(high) or '없음'} / 참고 신살: {'·'.join(rest) or '없음'}. "
            "답변에는 질문과 직접 관련된 신살 1~2개만 이름을 부르고 풀이를 붙인다. "
            "전체 목록은 차트가 보여주므로 텍스트로 나열하지 않는다. 삼재는 유파 차이가 커 주된 근거로 쓰지 않는다."
        )
    else:
        summary = "별다른 신살은 없습니다."
    return _envelope(summary, payload_sin_sal(saju))


@tool
async def get_palja(config: RunnableConfig = None) -> str:
    """사주팔자 원국(8글자) 분석. '사주팔자', '원국', '내 사주가 뭐야' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day = saju["day_pillar"]
    summary = f"일간 {day['stem']}({day['stem_element']})을 중심으로 한 사주팔자 원국입니다."
    return _envelope(summary, payload_palja(saju))


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
    return _envelope(summary, payload_strength(saju))


@tool
async def get_twelve_un_seong(config: RunnableConfig = None) -> str:
    """12운성(십이운성) 분석. '12운성', '각 기둥 생로병사', '기둥별 생애단계' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day = saju["day_pillar"]
    data = payload_twelve_un_seong(saju)
    wun_labels = [
        f"{p['stem']}{p['branch']}({p['twelve_wun']})"
        for p in data["pillars_wun"].values()
    ]
    summary = f"일간 {day['stem']}의 12운성: " + ", ".join(wun_labels)
    return _envelope(summary, data)


@tool
async def get_hap_chung(config: RunnableConfig = None) -> str:
    """합충 관계 분석. '합충', '기둥끼리 관계', '충', '삼합/육합', '공망' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    data = payload_hap_chung(saju)
    branch_relations = data["branch_relations"]
    gong_mang = data["gong_mang"]

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
        "twelve_wun":     get_twelve_wun(day_stem, se_un_ganji["branch"]),
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
        "twelve_wun":     get_twelve_wun(day_stem, wol_ganji["branch"]),
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
    """도메인별 길한 시기 — 연 단위 + 앞으로 18개월 월 단위.

    항상 `next_best`(오늘 이후 가장 가까운 좋은 시기)를 채운다. favorable이 비어도
    "좋은 시기가 없다"로 끝내지 않도록 차선(점수 최고)을 제시한다.
    """
    day_stem = saju["day_pillar"]["stem"]
    ys = saju["yong_sin"]
    good_els = {ys.get("primary", "")} | set(ys.get("xi_sin", []))
    bad_els = set(ys.get("ji_sin", []))
    domain_gods = set(_DOMAIN_TEN_GODS.get(domain, []))
    if domain == "연애":
        # 배우자성: 여성은 관성(정관·편관), 남성은 재성(정재·편재)
        domain_gods = {"정관", "편관"} if saju.get("gender") == "female" else {"정재", "편재"}
    today = date_type.today()

    def _score(entry: dict) -> int:
        sc = 0
        for el in (entry.get("stem_element"), entry.get("branch_element")):
            if el in good_els: sc += 1
            if el in bad_els:  sc -= 1
        for tg in (entry.get("stem_ten_god"), entry.get("branch_ten_god")):
            if tg in domain_gods: sc += 1
        return sc

    # 연 단위
    yeon_un = handle_get_yeon_un(start_year=today.year, count=min(years, 10), day_stem=day_stem)
    years_scored = [{**y, "favorability_score": _score(y)} for y in yeon_un]
    favorable = [y for y in years_scored if y["favorability_score"] >= 2]
    neutral = [y for y in years_scored if y["favorability_score"] < 2]

    # 월 단위 — 이번 달부터 18개월
    months: list[dict] = []
    for yr in (today.year, today.year + 1):
        for m in handle_get_wol_un(yr, day_stem):
            if yr == today.year and m["month"] < today.month:
                continue
            months.append({"year": yr, **m, "favorability_score": _score(m)})
    months = months[:18]
    favorable_months = [m for m in months if m["favorability_score"] >= 2][:4]

    # 차선: 가장 가까운 좋은 달 → 없으면 점수 최고 달 → 없으면 점수 최고 해
    if favorable_months:
        nb = favorable_months[0]
        next_best = {"kind": "month", "label": f"{nb['year']}년 {nb['month']}월 {nb['ganji_name']}", **nb}
    elif months:
        nb = max(months, key=lambda m: (m["favorability_score"], -months.index(m)))
        next_best = {"kind": "month", "label": f"{nb['year']}년 {nb['month']}월 {nb['ganji_name']}", **nb}
    else:
        nb = max(years_scored, key=lambda y: y["favorability_score"])
        next_best = {"kind": "year", "label": f"{nb['year']}년 {nb['ganji_name']}", **nb}
    best_year = max(years_scored, key=lambda y: y["favorability_score"]) if years_scored else None

    return {
        "domain": domain,
        "today": today.isoformat(),
        "favorable": favorable,
        "neutral_or_unfavorable": neutral,
        "favorable_months": favorable_months,
        "next_best": next_best,
        "best_year": best_year,
        "guidance": (
            "사용자에게 시기를 말할 때는 next_best(가장 가까운 좋은 시기)와 best_year를 구체적으로 제시한다. "
            "favorable이 비어 있어도 '좋은 시기가 없다'고 답하지 말고 next_best를 차선으로 안내한다. "
            "오늘(today) 이전 시기는 제시하지 않는다."
        ),
    }


def _compute_evaluate_specific_date(saju: dict, target_date: str, action: str) -> dict:
    day_stem = saju["day_pillar"]["stem"]
    yong_sin = saju["yong_sin"].get("primary", [])
    ji_sin = saju["yong_sin"].get("ji_sin", [])

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
