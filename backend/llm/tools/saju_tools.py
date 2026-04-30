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
from rag.search import handle_search_by_context


def _birth_info(config: RunnableConfig) -> dict:
    """RunnableConfig에서 birth_info 추출."""
    return config["configurable"]["birth_info"]


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
    return json.dumps(result, ensure_ascii=False)


@tool
async def get_wol_un(year: int | None = None, config: RunnableConfig = None) -> str:
    """특정 연도의 월운 12개. year 생략 시 올해."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day_stem = saju["day_pillar"]["stem"]
    target_year = year or date_type.today().year
    result = await asyncio.to_thread(handle_get_wol_un, year=target_year, day_stem=day_stem)
    return json.dumps(result, ensure_ascii=False)


@tool
async def get_dae_un(config: RunnableConfig = None) -> str:
    """대운 전체 목록 (12개)."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    return json.dumps(saju["dae_un_list"], ensure_ascii=False)


@tool
async def get_yeon_un(start_year: int | None = None, count: int = 5, config: RunnableConfig = None) -> str:
    """N년치 연운. start_year 생략 시 올해부터."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day_stem = saju["day_pillar"]["stem"]
    start = start_year or date_type.today().year
    result = await asyncio.to_thread(handle_get_yeon_un, start_year=start, count=min(count, 10), day_stem=day_stem)
    return json.dumps(result, ensure_ascii=False)


@tool
async def get_il_jin(year: int | None = None, month: int | None = None, config: RunnableConfig = None) -> str:
    """특정 월의 일진 달력. 생략 시 이번 달."""
    today = date_type.today()
    result = await asyncio.to_thread(
        handle_get_il_jin,
        year=year or today.year,
        month=month or today.month,
    )
    return json.dumps(result, ensure_ascii=False, default=str)


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
