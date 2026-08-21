"""운세 스토리 파이프라인 — 엔진 조립 + GPT 리라이트 (직설 친구 반말).

흐름:
  1. 기존 daily 엔진 핸들러 → DailyFortuneResponse 데이터
  2. 결정론 조립 → 카드 11장 (intro·overall·category×6·caution·action·summary)
  3. GPT 리라이트 1회 — headline·body만 반말로 일괄 변환 (점수·간지·사실 불변)
  4. 실패·키 없음 → 엔진 템플릿 원문 + rewritten=False (스토리는 항상 뜬다)
"""

from __future__ import annotations

import json
import logging

from core.config import settings
from llm.prompts.daily_story import (
    DAILY_STORY_SYSTEM_PROMPT,
    format_daily_story_message,
    build_daily_story_system_prompt,
)
from llm.providers import get_llm
from schemas.daily import DailyFortuneRequest
from schemas.daily_story import CATEGORY_KEYS, DailyStoryResponse, StoryCard
from services.saju import get_daily_fortune

logger = logging.getLogger(__name__)

# 카테고리 키 → 스토리 카드 title (질문 라벨)
_CATEGORY_TITLES = {
    "exam": "오늘의 시험운",
    "money": "오늘의 금전운",
    "love": "오늘의 애정운",
    "career": "오늘의 직장운",
    "health": "오늘의 건강운",
    "social": "오늘의 대인운",
}


def _keyword_from_top(fortunes: dict, top_key: str, avg: int) -> str:
    """오늘의 강점 키워드 — 총점 밴드 + 최고점 카테고리 반영."""
    if avg < 50:
        # 저점 구간: 강점보다 회복/안정 키워드
        low_mapping = {
            "exam": "인내",
            "money": "절약",
            "love": "이해",
            "career": "집중",
            "health": "휴식",
            "social": "배려",
        }
        return low_mapping.get(top_key, "안정")
    mapping = {
        "exam": "집중",
        "money": "재물",
        "love": "설렘",
        "career": "도약",
        "health": "활력",
        "social": "인연",
    }
    return mapping.get(top_key, "오늘")


def _overall_oneliner(overall_text: str) -> str:
    """총운 본문에서 첫 문장(또는 최대 40자)을 뽑아 요약 카드 헤드라인으로 사용."""
    text = (overall_text or "").strip()
    if not text:
        return ""
    # 첫 마침표·느낌표·물음표 기준으로 자름
    for end in (".", "!", "?", "。", "！", "？"):
        idx = text.find(end)
        if 0 < idx <= 50:
            return text[: idx + 1]
    # 구두점 없으면 40자 이하 전체, 초과 시 40자 + "…"
    return text if len(text) <= 40 else text[:40] + "…"


def assemble_story(data: dict, profile_name: str) -> tuple[list[dict], dict[str, int], str]:
    """엔진 데이터(dict) → 카드 11장 + scores + keyword (결정론)."""
    fortunes = data["fortunes"]
    scores = {k: int(fortunes[k]["score"]) for k in CATEGORY_KEYS}
    avg = round(sum(scores.values()) / len(scores))
    top_key = max(scores, key=scores.get)
    keyword = _keyword_from_top(fortunes, top_key, avg)

    ganji = data["day_ganji"]
    ganji_str = f"{ganji['stem']}{ganji['branch']}"

    cards: list[dict] = []

    # intro — 일진
    cards.append({
        "kind": "intro",
        "category_key": None,
        "title": "오늘의 일진",
        "score": None,
        "headline": f"오늘은 {ganji_str}일",
        # 일상어 요약(day_summary)을 본문으로. 명리 근거(basis)는 signals 칩/facts로 따로 전달된다
        "body": data.get("day_summary") or data.get("basis", ""),
    })

    # overall — headline은 짧은 한 마디로, body는 원문 풀어쓰기용 소스로 넘김
    cards.append({
        "kind": "overall",
        "category_key": None,
        "title": "오늘의 총운",
        "score": avg,
        "headline": "",          # 리라이트에서 avg 기반 단언형 한 마디 생성
        "body": data.get("overall", ""),
    })

    # category × 6
    for key in CATEGORY_KEYS:
        f = fortunes[key]
        cards.append({
            "kind": "category",
            "category_key": key,
            "title": _CATEGORY_TITLES[key],
            "score": int(f["score"]),
            "headline": f.get("headline") or f.get("label", ""),
            "body": f.get("text", ""),
        })

    # caution — headline은 리라이트에서 body 기반 구체적 한 마디로 생성
    cards.append({
        "kind": "caution",
        "category_key": None,
        "title": "오늘의 주의",
        "score": None,
        "headline": "",          # 리라이트에서 구체적 주의 한 마디 생성
        "body": data.get("caution", ""),
    })

    # action — 오늘의 한 수 (신호 우선순위 기반 구체 행동 + 길시)
    action = data.get("action", {}) or {}
    cards.append({
        "kind": "action",
        "category_key": None,
        "title": "오늘의 한 수",
        "score": None,
        "headline": action.get("headline", ""),
        "body": action.get("body", ""),
    })

    # summary — headline은 총운 첫 문장(keyword 중복 방지), body는 총운 전체
    overall_text = data.get("overall", "")
    cards.append({
        "kind": "summary",
        "category_key": None,
        "title": "오늘의 요약",
        "score": avg,
        "headline": _overall_oneliner(overall_text),
        "body": overall_text,
    })

    return cards, scores, keyword


async def _rewrite(cards: list[dict], language: str = "ko", facts: list[str] | None = None) -> bool:
    """카드 headline·body를 반말 톤으로 리라이트 — 작은 청크로 쪼개 **병렬** 호출.

    한 번에 11장을 리라이트하면 느려 타임아웃이 나므로, 3장씩 동시에 호출해
    벽시계 시간을 크게 줄인다. 성공 시 cards를 제자리 수정.

    Returns: 한 청크라도 리라이트에 성공했는지 (실패 청크는 원본 유지).
    """
    if not settings.openai_api_key:
        logger.info("OPENAI_API_KEY 없음 — 스토리 리라이트 폴백 (템플릿 사용)")
        return False

    import asyncio

    from langchain_core.messages import HumanMessage, SystemMessage

    # nano는 장면(공감 훅)을 못 만들고 템플릿을 그대로 다듬어 돌려준다 → mini (카드 11장, 3장씩 병렬이라 비용 부담 작음)
    llm = get_llm("openai", temperature=0.8, model="gpt-4.1-mini")
    system_prompt = build_daily_story_system_prompt(language)

    async def rewrite_chunk(chunk: list[dict], chunk_facts: list[str]) -> bool:
        """청크(카드 dict 참조 리스트)를 제자리 리라이트. format_daily_story_message가
        부여하는 id는 청크 내 0-based이므로 chunk[idx]에 그대로 적용된다."""
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=format_daily_story_message(chunk, facts=chunk_facts)),
            ]
            resp = await llm.ainvoke(messages)
            raw = resp.content if hasattr(resp, "content") else str(resp)
            items = _parse_rewrite(raw, expected=len(chunk))
        except Exception as exc:  # noqa: BLE001 — graceful degrade
            logger.warning("스토리 리라이트 청크 실패 — 해당 청크 원본 유지: %s", exc)
            return False
        for item in items:
            idx = item.get("id")
            if isinstance(idx, int) and 0 <= idx < len(chunk):
                if item.get("headline"):
                    chunk[idx]["headline"] = item["headline"]
                if item.get("body"):
                    chunk[idx]["body"] = item["body"]
        return True

    size = 3
    chunks = [cards[i : i + size] for i in range(0, len(cards), size)]
    # 같은 신호("지지 묘가 도화")가 모든 카드에 반복되지 않게, 청크마다 다른 신호 하나씩만 준다.
    facts = facts or []
    chunk_facts = [[facts[i % len(facts)]] if facts else [] for i in range(len(chunks))]
    results = await asyncio.gather(*(rewrite_chunk(c, f) for c, f in zip(chunks, chunk_facts)))
    return any(results)


def _parse_rewrite(raw: str, expected: int) -> list[dict]:
    """LLM 출력에서 JSON 배열을 추출·파싱한다. 코드펜스/잡텍스트 허용."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("리라이트 출력에 JSON 배열 없음")
    items = json.loads(text[start : end + 1])
    if not isinstance(items, list) or len(items) == 0:
        raise ValueError("리라이트 출력이 비어 있음")
    return items


async def build_daily_story(
    req: DailyFortuneRequest,
    *,
    profile_name: str,
    date: str,
    language: str = "ko",
) -> DailyStoryResponse:
    """엔진 조립 + 리라이트 → DailyStoryResponse (record_id 미설정 — Service가 채움)."""
    data = get_daily_fortune(req).model_dump()
    cards, scores, keyword = assemble_story(data, profile_name)

    facts = [sg["desc"] for sg in data.get("signals", [])]
    rewritten = await _rewrite(cards, language, facts=facts)

    # 리라이트 실패·누락 시 빈 headline 폴백 (UI 빈 칸 방지)
    _labels = {f.get("label", "") for f in data["fortunes"].values()}
    for c in cards:
        if c["kind"] == "category" and c.get("headline", "").strip() in _labels:
            # 리라이트가 라벨("시험운")을 그대로 둔 경우 → 엔진 폴백 헤드라인으로
            c["headline"] = data["fortunes"][c["category_key"]].get("headline") or c["headline"]
        if not c.get("headline"):
            if c["kind"] == "caution":
                c["headline"] = "오늘 조심할 것"
            elif c["kind"] == "overall":
                c["headline"] = "무리만 안 하면 무난한 하루"

    return DailyStoryResponse(
        date=date,
        day_ganji=data["day_ganji"],
        profile_name=profile_name,
        cards=[StoryCard(**c) for c in cards],
        scores=scores,
        keyword=keyword,
        record_id=None,
        rewritten=rewritten,
    )
