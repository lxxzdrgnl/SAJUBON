"""한줄 상담 영어 배선 테스트 — LLM 호출 없음."""

from __future__ import annotations

import inspect
import pytest

from llm.prompts.question import QUESTION_SYSTEM_PROMPT, build_question_system_prompt


# ─── 1. build_question_system_prompt ──────────────────────────────────────────

def test_question_ko_returns_base() -> None:
    assert build_question_system_prompt("ko") == QUESTION_SYSTEM_PROMPT


def test_question_en_starts_with_base() -> None:
    result = build_question_system_prompt("en")
    assert result.startswith(QUESTION_SYSTEM_PROMPT)


def test_question_en_contains_directive() -> None:
    result = build_question_system_prompt("en")
    assert "fluent English" in result


def test_question_en_contains_yongsin() -> None:
    result = build_question_system_prompt("en")
    assert "Yongsin (favorable element)" in result


def test_question_default_is_ko() -> None:
    assert build_question_system_prompt() == QUESTION_SYSTEM_PROMPT


# ─── 2. QuestionRequest 스키마 ────────────────────────────────────────────────

def test_question_request_has_language_field() -> None:
    from schemas.question import QuestionRequest
    req = QuestionRequest(
        birth_date="1990-03-15",
        birth_time="14:30",
        gender="male",
        question="올해 이직 운이 있을까요?",
    )
    assert req.language == "ko"


def test_question_request_language_en() -> None:
    from schemas.question import QuestionRequest
    req = QuestionRequest(
        birth_date="1990-03-15",
        birth_time="14:30",
        gender="male",
        question="올해 이직 운이 있을까요?",
        language="en",
    )
    assert req.language == "en"


# ─── 3. pipeline 시그니처 ─────────────────────────────────────────────────────

def test_run_question_consultation_accepts_language() -> None:
    from llm.pipelines.question import run_question_consultation
    sig = inspect.signature(run_question_consultation)
    assert "language" in sig.parameters
    assert sig.parameters["language"].default == "ko"


# ─── 4. generate_consultation 시그니처 ────────────────────────────────────────

def test_generate_consultation_accepts_language() -> None:
    from llm.writer import generate_consultation
    sig = inspect.signature(generate_consultation)
    assert "language" in sig.parameters
    assert sig.parameters["language"].default == "ko"
