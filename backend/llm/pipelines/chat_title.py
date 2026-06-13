"""채팅 세션 제목 자동 생성 — 첫 턴 후 경량 LLM 1회 호출."""

from __future__ import annotations

from llm.prompts.chat import build_chat_title_prompt
from llm.providers import get_llm

_MAX_LEN = 20


async def generate_chat_title(first_message: str, first_response: str) -> str:
    """첫 사용자 질문·답변으로 ≤20자 세션 제목을 생성한다.

    경량 LLM 1회 호출. 테스트는 이 함수를 스텁한다.
    """
    llm = get_llm(temperature=0.3)
    prompt = build_chat_title_prompt(first_message, first_response)
    resp = await llm.ainvoke(prompt)
    title = (resp.content or "").strip().strip('"').strip("'").strip()
    title = title.splitlines()[0] if title else ""
    return title[:_MAX_LEN] if title else "사주 상담"
