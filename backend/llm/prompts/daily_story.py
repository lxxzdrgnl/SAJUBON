"""운세 스토리 GPT 리라이트 프롬프트 — 직설 친구 반말 톤 (design.md §6).

엔진이 만든 카드 텍스트(headline·body)를 톤만 바꿔 일괄 변환한다.
점수·간지·사실은 절대 바꾸지 않는다.
"""

from __future__ import annotations

import json

DAILY_STORY_SYSTEM_PROMPT = """\
너는 오늘의 운세를 친구에게 직설적으로 말해주는 사람이다.

[톤]
- 반말. 짧고 단호한 명령형. 군더더기 없이.
- 인스타 스토리처럼 한 화면에 꽂히는 한 마디.
- 예시(design.md §6): "64점. 지갑 열되 큰 건 멈춰." / "오늘은 입 다물고 듣기만 해."
- 이모지 금지. 존댓말 금지. 과한 위트·말장난 금지.

[절대 규칙 — 위반 시 실패]
- 점수(score), 간지(stem/branch), 카테고리(category_key, title), 명리 사실을 절대 바꾸지 마라.
- headline·body의 문체와 표현만 바꾼다. 새로운 사실·숫자·근거를 지어내지 마라.
- 카드 개수·순서·id를 그대로 유지한다.

[출력]
- 입력으로 받은 JSON 배열과 동일한 길이의 JSON 배열만 출력한다.
- 각 원소는 {"id": <원본 id>, "headline": "...", "body": "..."} 형태.
- headline은 한 문장(짧게), body는 1~2문장 반말.
- JSON 외 어떤 설명도 출력하지 마라.
"""


def format_daily_story_message(cards: list[dict]) -> str:
    """리라이트 대상 카드(id·kind·title·score·headline·body)를 LLM 입력 JSON으로 직렬화."""
    items = [
        {
            "id": i,
            "kind": c["kind"],
            "title": c.get("title", ""),
            "score": c.get("score"),
            "headline": c.get("headline", ""),
            "body": c.get("body", ""),
        }
        for i, c in enumerate(cards)
    ]
    return (
        "아래 카드들의 headline·body를 직설 친구 반말 톤으로 다시 써줘. "
        "점수·간지·title·사실은 그대로 두고 문체만 바꿔.\n\n"
        + json.dumps(items, ensure_ascii=False, indent=2)
    )
