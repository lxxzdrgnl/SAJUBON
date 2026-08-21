"""
한줄 상담 파이프라인.

흐름:
  1. Guard + 카테고리 분류 (llm.guard)
  2. Engine.calculate_saju()
  3. question-centric RAG + Reranking (llm.reranker)
  4. generate_consultation() — 1탭, 500자
  5. 카테고리 규칙으로 charts / more 선별 (LLM 미사용)
"""

from __future__ import annotations
import asyncio
import functools
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from engine.handlers.calculate_saju import handle_calculate_saju
from engine.handlers.get_wol_un import handle_get_wol_un
from engine.handlers.get_il_jin import handle_get_il_jin
from engine.calc.ten_gods import calculate_ten_god, get_branch_ten_god
from engine.data.heavenly_stems import STEMS_BY_KOREAN
from engine.data.earthly_branches import BRANCHES_BY_KOREAN, CHUNG_PAIRS

_CHUNG_SETS = {frozenset(p) for p in CHUNG_PAIRS}
from engine.handlers.get_yeon_un import handle_get_yeon_un
from llm.guard import guard_and_classify
from llm.reranker import rerank_chunks, build_question_query, CATEGORY_QUERY_HINT, CATEGORY_TAG_MAP
from llm.writer import generate_consultation
from llm.tools.chart_payloads import (
    payload_wuxing_balance,
    payload_ten_gods,
    payload_sin_sal,
    payload_palja,
    payload_strength,
    payload_twelve_un_seong,
    payload_dae_un,
    payload_wol_un,
    payload_yeon_un,
    payload_il_jin,
)
from rag.db import search_multi
from rag.search import handle_get_ilju_profile

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="question-pipeline")

# 시기 분석이 유의미한 카테고리
_TIMING_CATEGORIES = {"love", "career", "money"}
# 택일(擇日) 질문 — 이사·계약·결혼식·개업·면접일처럼 "며칠이 좋나"를 묻는 경우 일진 데이터를 붙인다
_TAEKIL_KW = ("며칠", "몇일", "몇 일", "날짜", "택일", "길일", "좋은 날", "이사", "계약", "결혼식", "상견례", "개업", "오픈", "입주", "잔금", "면접 날")
_PAST_RE = re.compile(r"(작년|재작년|지난해|(\d{4})년|(\d+)년 전)")

# content에 박힌 [[chart:툴이름]] 마커
_CHART_MARKER_RE = re.compile(r"\[\[chart:([a-z_]+)\]\]")


def _charts_from_markers(content: str, saju: dict) -> list[dict]:
    """writer가 content에 박은 [[chart:...]] 마커를 추출해 payload를 빌드한다(리포트와 동일).
    가벼운 질문이라 마커가 없으면 빈 리스트. 최대 2개."""
    today = datetime.now()
    builders = {
        "get_wuxing_balance":  lambda: payload_wuxing_balance(saju),
        "get_ten_gods":        lambda: payload_ten_gods(saju),
        "get_sin_sal":         lambda: payload_sin_sal(saju),
        "get_palja":           lambda: payload_palja(saju),
        "get_strength":        lambda: payload_strength(saju),
        "get_twelve_un_seong": lambda: payload_twelve_un_seong(saju),
        "get_dae_un":          lambda: payload_dae_un(saju),
        "get_wol_un":          lambda: payload_wol_un(saju, today.year),
        "get_yeon_un":         lambda: payload_yeon_un(saju, today.year, 5),
        "get_il_jin":          lambda: payload_il_jin(today.year, today.month),
    }
    out: list[dict] = []
    seen: set[str] = set()
    for m in _CHART_MARKER_RE.finditer(content or ""):
        tool = m.group(1)
        if tool in seen or tool not in builders:
            continue
        seen.add(tool)
        try:
            out.append({"tool": tool, "payload": builders[tool]()})
        except Exception:
            logger.warning("chart payload 생성 실패: %s", tool, exc_info=True)
        if len(out) >= 2:
            break
    return out


def _fallback_chart_tool(question: str, category: str) -> str | None:
    """LLM이 차트를 안 넣었을 때, 질문 유형으로 보장할 차트 1개를 정한다.
    가벼운/일상 질문(general + 키워드 없음)은 None → 차트 없음 유지."""
    q = question
    if "운세" in q and any(k in q for k in ("오늘", "하루", "일진")):
        return "get_il_jin"
    if any(k in q for k in ("이번 달", "이달", "월운")):
        return "get_wol_un"
    if any(k in q for k in ("올해", "연운", "세운")):
        return "get_yeon_un"
    if any(k in q for k in ("대운", "평생", "인생 흐름", "앞으로의 흐름")):
        return "get_dae_un"
    return {
        "money":  "get_wuxing_balance",
        "love":   "get_wol_un",
        "career": "get_ten_gods",
        "health": "get_strength",
    }.get(category)


# ─── 카테고리 → 차트 매핑 ─────────────────────────────────────────────────────
# 각 항목: (tool_name, payload_fn_or_None)
# payload_fn은 saju dict를 첫 인자로 받는 callable.
# None 이면 별도 처리 필요 (timing 차트 등).

def _build_charts_for_category(
    category: str,
    saju: dict,
) -> tuple[list[dict], list[dict]]:
    """
    카테고리 규칙으로 charts(자동 표시)와 more(칩 클릭)를 구성한다.

    Returns:
        (charts, more) — 각각 {"tool": str, "payload": dict} list
    """
    today = datetime.now()

    def _wol_un() -> dict:
        return payload_wol_un(saju, today.year)

    def _yeon_un() -> dict:
        return payload_yeon_un(saju, today.year, 5)

    def _il_jin() -> dict:
        return payload_il_jin(today.year, today.month)

    # tool_name → lazy payload callable
    _origin: dict[str, callable] = {
        "get_wuxing_balance":   lambda: payload_wuxing_balance(saju),
        "get_ten_gods":         lambda: payload_ten_gods(saju),
        "get_sin_sal":          lambda: payload_sin_sal(saju),
        "get_palja":            lambda: payload_palja(saju),
        "get_strength":         lambda: payload_strength(saju),
        "get_twelve_un_seong":  lambda: payload_twelve_un_seong(saju),
        "get_dae_un":           lambda: payload_dae_un(saju),
        "get_wol_un":           _wol_un,
        "get_yeon_un":          _yeon_un,
        "get_il_jin":           _il_jin,
    }

    # 카테고리별 (charts_tools, more_tools)
    _MAP: dict[str, tuple[list[str], list[str]]] = {
        "money":   (
            ["get_wuxing_balance", "get_ten_gods"],
            ["get_wol_un", "get_strength", "get_palja"],
        ),
        "love":    (
            ["get_sin_sal"],
            ["get_wol_un", "get_twelve_un_seong"],
        ),
        "career":  (
            ["get_ten_gods", "get_strength"],
            ["get_wuxing_balance", "get_palja"],
        ),
        # 시기 관련 질문 — guard가 career/love/money 아닌 'general'로 분류하는 경우는
        # 없으므로 timing 전용 카테고리는 별도로 두지 않는다.
        # 대신 career/love/money more에 타이밍 차트를 이미 포함.
        "health":  (
            [],
            ["get_wuxing_balance", "get_strength"],
        ),
        "general": ([], []),
    }

    charts_tools, more_tools = _MAP.get(category, ([], []))

    def _make(tool_name: str) -> dict | None:
        fn = _origin.get(tool_name)
        if fn is None:
            return None
        try:
            return {"tool": tool_name, "payload": fn()}
        except Exception:
            logger.warning("chart payload 생성 실패: %s", tool_name, exc_info=True)
            return None

    charts = [item for name in charts_tools if (item := _make(name)) is not None]
    more   = [item for name in more_tools   if (item := _make(name)) is not None]
    return charts, more


def _build_question_rag(
    saju: dict,
    question: str,
    category: str,
) -> dict:
    """
    question-centric RAG 조립 + Reranking.

    Returns:
        {
          "chunks":        [reranked RAG chunk, ...],  # 상위 4개
          "ilju":          {일주 전체 지식} or None,
          "strength":      str | None,
          "yong_sin_summary": str | None,
        }
    """
    yong_sin = saju.get("yong_sin", {})
    ys_elements = [yong_sin.get("primary")] + yong_sin.get("xi_sin", [])
    ys_elements = [e for e in ys_elements if e]
    ji_elements = yong_sin.get("ji_sin", [])

    # core_keywords: life_domains 태그 + context_ranking top IDs
    life_domains = saju.get("life_domains", {})
    core_kw: list[str] = []
    for tags in life_domains.values():
        core_kw.extend(tags[:2])
    core_kw = core_kw[:3]
    ctx_top = saju.get("context_ranking", {}).get("primary_context", [])
    core_kw += [c.get("id", "") for c in ctx_top[:2]]

    query = build_question_query(question, category, core_kw)

    # 검색: 고민 관련 컬렉션
    raw_results = search_multi(query, ["ten_gods", "sin_sal", "structure_patterns", "ilju"], 3)
    all_chunks: list[dict] = []
    for hits in raw_results.values():
        all_chunks.extend(hits)

    # Reranking
    reranked = rerank_chunks(all_chunks, ys_elements, ji_elements, category)

    # 일주 직접 조회 (CORE)
    dp = saju.get("day_pillar", {})
    day_pillar_str = dp.get("stem", "") + dp.get("branch", "")
    ilju = handle_get_ilju_profile(day_pillar_str) if day_pillar_str else None

    # 신강신약 + 용신 요약
    dms = saju.get("day_master_strength", {})
    ys  = saju.get("yong_sin", {})
    xi  = "·".join(ys.get("xi_sin", []))

    # 세운 + 월운: 시기가 의미 있는 카테고리에만 포함
    today    = datetime.now()
    day_stem = dp.get("stem", "")
    if category in _TIMING_CATEGORIES:
        se_un  = handle_get_yeon_un(today.year, 2, day_stem)
        # 지난 달은 제외하고, 남은 달이 4개 미만이면 내년 월운을 이어 붙인다
        # (8월에 "3월에 고백하라"처럼 지난 시점을 추천하던 문제 방지)
        wol_un = [
            {**m, "year": today.year}
            for m in handle_get_wol_un(today.year, day_stem) if m["month"] >= today.month
        ]
        if len(wol_un) < 4:
            wol_un += [{**m, "year": today.year + 1} for m in handle_get_wol_un(today.year + 1, day_stem)[:6]]
    else:
        se_un  = []
        wol_un = []

    # 택일 질문 → 이번 달 남은 날 + 다음 달 일진 (일간 기준 십성·용신 여부까지 계산해 압축)
    il_jin: list[dict] = []
    if any(kw in question for kw in _TAEKIL_KW):
        good_els = {ys.get("primary", "")} | set(ys.get("xi_sin", []))
        bad_els = set(ys.get("ji_sin", []))
        next_m = (today.year + (today.month // 12), today.month % 12 + 1)
        if any(kw in question for kw in ("다음 달", "다음달", "내달", "담달")):
            months = [next_m]                       # 질문이 다음 달이면 이번 달 날짜는 후보에서 제외
        else:
            months = [(today.year, today.month), next_m]
        for yy, mm in months:
            for d in handle_get_il_jin(yy, mm):
                if d["date"] < today.strftime("%Y-%m-%d"):
                    continue
                s_el = STEMS_BY_KOREAN[d["stem"]]["element"]; b_el = BRANCHES_BY_KOREAN[d["branch"]]["element"]
                il_jin.append({
                    "date": d["date"], "ganji": d["ganji_name"],
                    "stem_ten_god": calculate_ten_god(day_stem, d["stem"]),
                    "branch_ten_god": get_branch_ten_god(day_stem, d["branch"]),
                    "good": (s_el in good_els) + (b_el in good_els) - (s_el in bad_els) - (b_el in bad_els),
                    "chung_with_day": frozenset({d["branch"], dp.get("branch", "")}) in _CHUNG_SETS,
                })

    # 과거 질문 → 해당 연도 세운을 따로 붙인다 (없으면 모델이 '올해 대운'으로 얼버무린다)
    past_years: list[dict] = []
    m = _PAST_RE.search(question)
    if m:
        if m.group(2):
            yr = int(m.group(2))
        elif m.group(3):
            yr = today.year - int(m.group(3))
        elif "재작년" in m.group(1):
            yr = today.year - 2
        else:
            yr = today.year - 1
        if 1900 < yr < today.year:
            past_years = handle_get_yeon_un(yr, 1, day_stem)

    return {
        "chunks":           reranked,
        "ilju":             ilju,
        "il_jin":           il_jin,
        "past_years":       past_years,
        "strength":         dms.get("level_8"),
        "yong_sin_summary": f"용신:{ys.get('primary','')} ({ys.get('logic_type','')}), 희신:{xi}",
        "se_un":            se_un,
        "wol_un":           wol_un,
        "current_month":    today.month,
        "today":            today.strftime("%Y-%m-%d"),
    }


_LEADING_MARKER_RE = re.compile(r"^\s*((?:\[\[chart:[a-z_]+\]\]\s*)+)", re.S)


def _demote_leading_marker(content: str) -> str:
    """content가 차트 마커로 시작하면 첫 문단 뒤로 옮긴다 — 답보다 차트가 먼저 보이는 화면 방지."""
    m = _LEADING_MARKER_RE.match(content or "")
    if not m:
        return content
    markers = m.group(1).strip()
    rest = content[m.end():].lstrip()
    paras = rest.split("\n\n", 1)
    if len(paras) == 1:
        # 한 문단뿐이면 둘째 문장 뒤에 끼운다 (맨 끝 배치 방지)
        ends = [m_.end() for m_ in re.finditer(r"[.!?。]\s+", paras[0])]
        if len(ends) >= 2:
            cut = ends[1]
            return f"{paras[0][:cut].rstrip()}\n\n{markers}\n\n{paras[0][cut:].lstrip()}"
        return f"{paras[0]}\n\n{markers}"
    first, tail = paras
    return f"{first}\n\n{markers}\n\n{tail}"


async def run_question_consultation(
    birth_date: str,
    birth_time: str | None,
    gender: str,
    calendar: str = "solar",
    is_leap_month: bool = False,
    birth_longitude: float | None = None,
    birth_utc_offset: int | None = None,
    question: str = "",
    llm_provider: str | None = None,
    language: str = "ko",
) -> dict:
    """
    한줄 상담 파이프라인.

    Returns:
        {"headline": str, "content": str, "category": str,
         "charts": list[ChartItem-dict], "more": list[ChartItem-dict]}
    """
    loop = asyncio.get_running_loop()

    # 0. Guard + 카테고리 자동 분류 (LLM 1회 호출)
    guard_msg, category, is_instant = await guard_and_classify(question, llm_provider)
    if is_instant:
        logger.info("Instant answer: %s", question[:30])
        if guard_msg and "|||" in guard_msg:
            headline, content = guard_msg.split("|||", 1)
        else:
            headline, content = "잠깐만요", guard_msg or ""
        return {"headline": headline, "content": content, "category": category, "charts": [], "more": []}

    if guard_msg in ("CRISIS", "OFFTOPIC"):
        from llm.guard import CRISIS_RESPONSE, OFFTOPIC_RESPONSE
        fixed = CRISIS_RESPONSE if guard_msg == "CRISIS" else OFFTOPIC_RESPONSE
        logger.info("Guard fixed response (%s): %s", guard_msg, question[:30])
        return {**fixed, "category": category, "charts": [], "more": []}

    is_medical = (guard_msg == "MEDICAL")
    if is_medical:
        guard_msg = None  # 차단 아님 — 파이프라인 계속 실행
        logger.info("Medical question detected, will add disclaimer")

    if guard_msg:
        logger.info("Guard blocked question: %s", question[:30])
        return {
            "headline": "사주는 덕(德)을 쌓는 자에게 길(吉)을 줍니다",
            "content": guard_msg,
            "category": category,
            "charts": [],
            "more": [],
        }
    logger.info("Guard passed, category=%s", category)

    # 1. Engine
    calc_fn = functools.partial(
        handle_calculate_saju,
        birth_date=birth_date,
        birth_time=birth_time,
        gender=gender,
        calendar=calendar,
        is_leap_month=is_leap_month,
        birth_longitude=birth_longitude,
        birth_utc_offset=birth_utc_offset,
    )
    saju: dict = await loop.run_in_executor(_executor, calc_fn)
    logger.info("Question 사주 계산 완료: %s%s",
                saju.get("day_pillar", {}).get("stem", ""),
                saju.get("day_pillar", {}).get("branch", ""))

    # 2. RAG + Reranking (MEDICAL은 RAG 청크 제외 — 일주론+대운만)
    rag_fn = functools.partial(_build_question_rag, saju, question, category)
    rag_ctx: dict = await loop.run_in_executor(_executor, rag_fn)
    if is_medical:
        rag_ctx["chunks"] = []  # 불필요한 청크로 내용 팽창 방지
    logger.info("Question RAG 완료: chunks=%d", len(rag_ctx.get("chunks", [])))

    # 3. Writer
    if is_medical:
        effective_question = (
            f"{question}\n\n[주의사항 — 의료]\n"
            f"1. 수술·치료를 **할지 말지, 언제 할지, 미룰지**에 대한 권고는 절대 하지 마세요. "
            f"'내년 초가 적기', '하반기에 재평가' 같은 시기 지시도 금지입니다.\n"
            f"2. 질문의 의학적 전제가 틀렸다면(예: 과민성대장증후군은 수술로 치료하지 않음) 첫 문장에서 부드럽게 바로잡으세요.\n"
            f"3. 신살(귀문관살·공망 등)을 질병·피로의 원인으로 연결하지 마세요. 신살 이름을 아예 쓰지 마세요.\n"
            f"4. 사주로 말할 수 있는 것은 '이 시기 컨디션·회복력 흐름과 생활 관리 포인트'까지입니다.\n"
            f"5. 마지막 문장은 반드시 '구체적인 치료 결정은 의료진과 상담하세요'로 끝내세요."
        )
    elif category == "money":
        effective_question = (
            f"{question}\n\n[주의사항 — 재물]\n"
            f"1. 특정 자산(코인·주식·부동산)을 사라/팔라, 얼마나(비중·금액) 넣어라, 몇 월부터 늘려라 같은 **투자 실행 지시는 금지**입니다.\n"
            f"2. 사주로 말할 수 있는 것은 '이 사람의 재물 성향(공격/보수)과 이 시기의 재물 흐름(안정/변동)'까지입니다.\n"
            f"3. 시기를 말하더라도 '결정을 내리기 좋은 시기/신중할 시기'로 표현하고, 매수·매도 타이밍으로 쓰지 마세요.\n"
            f"4. 큰 금액이 걸린 질문이면 한 문장으로 '투자 판단은 본인 책임이며 사주는 참고 지표'임을 덧붙이세요."
        )
    else:
        effective_question = question
    output = await generate_consultation(saju, rag_ctx, effective_question, category, llm_provider, language)
    output.content = _demote_leading_marker(output.content)

    # 4. 차트 — writer가 content에 박은 [[chart:...]] 마커를 추출해 payload 빌드(리포트와 동일).
    # MEDICAL은 차트 없음. LLM이 차트를 빠뜨렸어도 질문이 명백히 차트가 필요한 유형이면
    # 폴백 차트 마커를 content 앞에 주입해 보장한다(가벼운 질문은 폴백 None → 차트 없음 유지).
    charts = [] if is_medical else _charts_from_markers(output.content, saju)
    if not is_medical and not charts:
        fb = _fallback_chart_tool(question, category)
        if fb:
            # 첫 문단(답) 뒤에 끼운다 — 맨 앞에 붙이면 화면에서 답보다 차트가 먼저 보인다
            output.content = _demote_leading_marker(f"[[chart:{fb}]]\n\n{output.content}")
            charts = _charts_from_markers(output.content, saju)
    more: list[dict] = []
    logger.info("차트 선별 완료: charts=%d (마커 기반, category=%s)", len(charts), category)

    return {
        "headline": output.headline,
        "content":  output.content,
        "category": category,
        "charts":   charts,
        "more":     more,
    }
