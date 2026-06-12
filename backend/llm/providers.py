"""LLM provider — Strategy Pattern. 기본: Gemini 2.0 Flash."""

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
      3. 기본값 "gemini"

    model: provider별 기본 모델을 덮어쓴다 (예: 운세 스토리는 경량 gpt-4o-mini).
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
            model=model or "gpt-4o",
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
