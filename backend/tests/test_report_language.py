"""사주 리포트 영어 배선 테스트 — LLM 호출 없음."""

from __future__ import annotations

import pytest

from llm.prompts.report import SYSTEM_PROMPT, build_system_prompt
from llm.prompts.un_flow import UN_FLOW_SYSTEM_PROMPT, build_un_flow_system_prompt


# ─── 1. build_system_prompt ────────────────────────────────────────────────────

def test_report_ko_returns_base_system_prompt() -> None:
    """ko는 SYSTEM_PROMPT 그대로 (byte-identical)."""
    assert build_system_prompt("ko") == SYSTEM_PROMPT


def test_report_ko_no_english_directive() -> None:
    result = build_system_prompt("ko")
    assert "LANGUAGE INSTRUCTION" not in result
    assert "fluent English" not in result


def test_report_en_starts_with_base_prompt() -> None:
    result = build_system_prompt("en")
    assert result.startswith(SYSTEM_PROMPT)


def test_report_en_contains_english_directive() -> None:
    result = build_system_prompt("en")
    assert "fluent English" in result


def test_report_en_contains_yongsin_glossary() -> None:
    result = build_system_prompt("en")
    assert "Yongsin (favorable element)" in result


def test_report_en_contains_json_instruction() -> None:
    result = build_system_prompt("en")
    assert "JSON" in result


def test_report_default_is_ko() -> None:
    """기본값 "ko"이면 directive 없음."""
    assert build_system_prompt() == SYSTEM_PROMPT


# ─── 2. build_un_flow_system_prompt ───────────────────────────────────────────

def test_un_flow_ko_returns_base() -> None:
    assert build_un_flow_system_prompt("ko") == UN_FLOW_SYSTEM_PROMPT


def test_un_flow_en_contains_directive() -> None:
    result = build_un_flow_system_prompt("en")
    assert "fluent English" in result


def test_un_flow_en_starts_with_base() -> None:
    result = build_un_flow_system_prompt("en")
    assert result.startswith(UN_FLOW_SYSTEM_PROMPT)


def test_un_flow_default_is_ko() -> None:
    assert build_un_flow_system_prompt() == UN_FLOW_SYSTEM_PROMPT


# ─── 3. generate_report / generate_un_flow signature ─────────────────────────

def test_generate_report_accepts_language_param() -> None:
    """generate_report 시그니처에 language 파라미터가 있어야 한다."""
    import inspect
    from llm.writer import generate_report
    sig = inspect.signature(generate_report)
    assert "language" in sig.parameters
    assert sig.parameters["language"].default == "ko"


def test_generate_un_flow_accepts_language_param() -> None:
    import inspect
    from llm.writer import generate_un_flow
    sig = inspect.signature(generate_un_flow)
    assert "language" in sig.parameters
    assert sig.parameters["language"].default == "ko"


# ─── 4. pipeline / service 배선 ───────────────────────────────────────────────

def test_run_saju_report_full_accepts_language() -> None:
    import inspect
    from llm.pipelines.saju_report import run_saju_report_full
    sig = inspect.signature(run_saju_report_full)
    assert "language" in sig.parameters
    assert sig.parameters["language"].default == "ko"


def test_run_un_flow_accepts_language() -> None:
    import inspect
    from llm.pipelines.saju_report import run_un_flow
    sig = inspect.signature(run_un_flow)
    assert "language" in sig.parameters
    assert sig.parameters["language"].default == "ko"
