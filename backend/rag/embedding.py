"""
Embedding Provider — Strategy Pattern.

환경변수 EMBEDDING_PROVIDER 하나로 구현체를 교체.
  - "openai"  : OpenAI text-embedding-3-small (기본값)
  - "gemini"  : Google Gemini (Strategy Pattern용 — 기본 경로에서는 쓰지 않음)

사용:
    ef = get_embedding_function()
    collection = client.get_or_create_collection("col", embedding_function=ef)
"""

from __future__ import annotations
import os
from abc import ABC, abstractmethod
from chromadb import EmbeddingFunction, Embeddings


# ─── Abstract Base ─────────────────────────────────────────────────────────

class BaseEmbeddingProvider(ABC):
    @abstractmethod
    def get_function(self) -> EmbeddingFunction:
        """ChromaDB에 전달할 EmbeddingFunction 반환."""
        ...


# ─── OpenAI ────────────────────────────────────────────────────────────────

class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    def get_function(self) -> EmbeddingFunction:
        from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction
        return OpenAIEmbeddingFunction(
            api_key=os.environ["OPENAI_API_KEY"],
            model_name=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
        )


# ─── Gemini ────────────────────────────────────────────────────────────────

class _GeminiEmbeddingFunction(EmbeddingFunction):
    """ChromaDB 호환 Gemini Embedding Function (google-genai 신규 SDK)."""

    def __init__(self, api_key: str, model: str):
        import logging
        from google import genai
        self._client = genai.Client(api_key=api_key)
        self._model = model
        self._logger = logging.getLogger(__name__)

    def __call__(self, input: list[str]) -> Embeddings:
        import time
        max_retries = 5
        for attempt in range(max_retries):
            try:
                result = self._client.models.embed_content(
                    model=self._model,
                    contents=input,
                )
                return [e.values for e in result.embeddings]
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    wait = 40 * (attempt + 1)
                    self._logger.warning(
                        "Gemini embedding rate limit. %d초 대기 후 재시도 (%d/%d)",
                        wait, attempt + 1, max_retries,
                    )
                    time.sleep(wait)
                else:
                    raise
        raise RuntimeError("Gemini embedding: max retries exceeded")


class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    def get_function(self) -> EmbeddingFunction:
        return _GeminiEmbeddingFunction(
            api_key=os.environ["GEMINI_API_KEY"],
            model=os.getenv("EMBEDDING_MODEL", "gemini-embedding-001"),
        )


# ─── Factory ───────────────────────────────────────────────────────────────

_PROVIDERS: dict[str, type[BaseEmbeddingProvider]] = {
    "openai": OpenAIEmbeddingProvider,
    "gemini": GeminiEmbeddingProvider,
}


def get_embedding_function() -> EmbeddingFunction:
    """
    EMBEDDING_PROVIDER 환경변수에 따라 EmbeddingFunction 반환.
    기본값: "openai"
    """
    name = os.getenv("EMBEDDING_PROVIDER", "openai").lower()
    cls = _PROVIDERS.get(name)
    if cls is None:
        raise ValueError(f"Unknown EMBEDDING_PROVIDER: {name!r}. Choose from {list(_PROVIDERS)}")
    return cls().get_function()
