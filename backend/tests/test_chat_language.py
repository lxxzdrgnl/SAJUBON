"""챗 영어 배선 테스트 — LLM 호출 없음."""

from __future__ import annotations

import inspect
import pytest


# ─── 1. build_chat_system_prompt ─────────────────────────────────────────────

def test_chat_ko_no_directive() -> None:
    from llm.prompts.chat import build_chat_system_prompt
    result = build_chat_system_prompt({}, language="ko")
    assert "fluent English" not in result
    assert "LANGUAGE INSTRUCTION" not in result


def test_chat_en_contains_directive() -> None:
    from llm.prompts.chat import build_chat_system_prompt
    result = build_chat_system_prompt({}, language="en")
    assert "fluent English" in result


def test_chat_en_contains_yongsin() -> None:
    from llm.prompts.chat import build_chat_system_prompt
    result = build_chat_system_prompt({}, language="en")
    assert "Yongsin (favorable element)" in result


def test_chat_default_is_ko() -> None:
    from llm.prompts.chat import build_chat_system_prompt
    result_default = build_chat_system_prompt({})
    result_ko = build_chat_system_prompt({}, language="ko")
    assert result_default == result_ko
    assert "fluent English" not in result_default


# ─── 2. ChatSessionCreate 스키마 ──────────────────────────────────────────────

def test_chat_session_create_has_language() -> None:
    from schemas.chat import ChatSessionCreate
    req = ChatSessionCreate(
        birth_date="1990-03-15",
        gender="male",
    )
    assert req.language == "ko"


def test_chat_session_create_language_en() -> None:
    from schemas.chat import ChatSessionCreate
    req = ChatSessionCreate(
        birth_date="1990-03-15",
        gender="male",
        language="en",
    )
    assert req.language == "en"


# ─── 3. ChatState에 language 필드 ─────────────────────────────────────────────

def test_chat_state_has_language() -> None:
    from llm.pipelines.chat import ChatState
    annotations = ChatState.__annotations__
    assert "language" in annotations


# ─── 4. create_chat_session 시그니처 ──────────────────────────────────────────

def test_create_chat_session_accepts_language() -> None:
    from services.chat import create_chat_session
    sig = inspect.signature(create_chat_session)
    assert "language" in sig.parameters
    assert sig.parameters["language"].default == "ko"
