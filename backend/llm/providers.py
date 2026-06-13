"""LLM provider — Strategy Pattern. 기본: OpenAI gpt-4.1-nano (무거운 작업은 gpt-4.1-mini로 오버라이드)."""

from __future__ import annotations
from langchain_core.language_models import BaseChatModel
from core.config import settings


def get_llm(
    provider: str | None = None,
    temperature: float = 0.7,
    model: str | None = None,
) -> BaseChatModel:
    """
    설정된 provider에 따라 LLM 인스턴스를 반환.

    provider 우선순위:
      1. 인수로 명시 (테스트·교체 용도)
      2. settings.llm_provider (.env LLM_PROVIDER)
      3. 기본값 "openai"

    model: provider별 기본 모델을 덮어쓴다 (예: 리포트는 gpt-4.1-mini).
    gemini 분기는 Strategy Pattern용으로 남겨두되 기본 경로에서는 쓰지 않는다.
    """
    p = (provider or settings.llm_provider).lower()

    if p == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model or "gemini-2.0-flash",
            google_api_key=settings.gemini_api_key or None,
            temperature=temperature,
        )

    if p == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model or "gpt-4.1-nano",
            api_key=settings.openai_api_key or None,
            temperature=temperature,
        )

    if p == "claude":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model="claude-sonnet-4-6",
            api_key=settings.anthropic_api_key or None,
            temperature=temperature,
        )

    raise ValueError(f"Unsupported LLM provider: '{p}'. Choose from: gemini, openai, claude")
