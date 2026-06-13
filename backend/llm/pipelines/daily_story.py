"""운세 스토리 파이프라인 — 엔진 조립 + GPT 리라이트 (직설 친구 반말).

흐름:
  1. 기존 daily 엔진 핸들러 → DailyFortuneResponse 데이터
  2. 결정론 조립 → 카드 11장 (intro·overall·category×6·caution·color·summary)
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
        "body": data.get("basis", ""),
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
            "headline": f.get("label", ""),
            "body": f.get("text", ""),
        })

    # caution
    cards.append({
        "kind": "caution",
        "category_key": None,
        "title": "오늘의 주의",
        "score": None,
        "headline": "오늘 조심할 것",
        "body": data.get("caution", ""),
    })

    # color
    color = data.get("clothing_color", {}) or {}
    cards.append({
        "kind": "color",
        "category_key": None,
        "title": "오늘의 색",
        "score": None,
        "headline": color.get("color", ""),
        "body": color.get("reason", ""),
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


async def _rewrite(cards: list[dict]) -> bool:
    """카드 headline·body를 반말 톤으로 일괄 리라이트. 성공 시 cards를 제자리 수정.

    Returns: rewritten 성공 여부 (실패 시 cards 원본 유지).
    """
    if not settings.openai_api_key:
        logger.info("OPENAI_API_KEY 없음 — 스토리 리라이트 폴백 (템플릿 사용)")
        return False

    from langchain_core.messages import HumanMessage, SystemMessage

    try:
        llm = get_llm("openai", temperature=0.8, model="gpt-4.1-nano")
        messages = [
            SystemMessage(content=DAILY_STORY_SYSTEM_PROMPT),
            HumanMessage(content=format_daily_story_message(cards)),
        ]
        resp = await llm.ainvoke(messages)
        raw = resp.content if hasattr(resp, "content") else str(resp)
        rewritten_items = _parse_rewrite(raw, expected=len(cards))
    except Exception as exc:  # noqa: BLE001 — graceful degrade
        logger.warning("스토리 리라이트 실패 — 템플릿 폴백: %s", exc)
        return False

    # 제자리 적용 — headline·body만. title·score·간지는 불변.
    for item in rewritten_items:
        idx = item["id"]
        if 0 <= idx < len(cards):
            if item.get("headline"):
                cards[idx]["headline"] = item["headline"]
            if item.get("body"):
                cards[idx]["body"] = item["body"]
    return True


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
) -> DailyStoryResponse:
    """엔진 조립 + 리라이트 → DailyStoryResponse (record_id 미설정 — Service가 채움)."""
    data = get_daily_fortune(req).model_dump()
    cards, scores, keyword = assemble_story(data, profile_name)

    rewritten = await _rewrite(cards)

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
