"""궁합 리포트 영어 배선 테스트 — LLM 호출 없음."""

from __future__ import annotations

import inspect
import pytest

from llm.prompts.compatibility_report import SYSTEM_PROMPT, build_compatibility_system_prompt
from llm.reports.compatibility import CompatibilityReportModule
from llm.reports.runner import run_report


# ─── 1. build_compatibility_system_prompt ─────────────────────────────────────

def test_compat_ko_returns_base() -> None:
    assert build_compatibility_system_prompt("ko") == SYSTEM_PROMPT


def test_compat_en_starts_with_base() -> None:
    result = build_compatibility_system_prompt("en")
    assert result.startswith(SYSTEM_PROMPT)


def test_compat_en_contains_english_directive() -> None:
    result = build_compatibility_system_prompt("en")
    assert "fluent English" in result


def test_compat_en_contains_yongsin() -> None:
    result = build_compatibility_system_prompt("en")
    assert "Yongsin (favorable element)" in result


def test_compat_default_is_ko() -> None:
    assert build_compatibility_system_prompt() == SYSTEM_PROMPT


# ─── 2. CompatibilityReportModule.system_prompt ───────────────────────────────

def test_module_system_prompt_ko() -> None:
    module = CompatibilityReportModule()
    result = module.system_prompt("ko")
    assert result == SYSTEM_PROMPT
    assert "fluent English" not in result


def test_module_system_prompt_en() -> None:
    module = CompatibilityReportModule()
    result = module.system_prompt("en")
    assert "fluent English" in result
    assert result.startswith(SYSTEM_PROMPT)


def test_module_system_prompt_default_is_ko() -> None:
    module = CompatibilityReportModule()
    assert module.system_prompt() == SYSTEM_PROMPT


# ─── 3. run_report 시그니처 ───────────────────────────────────────────────────

def test_run_report_accepts_language() -> None:
    sig = inspect.signature(run_report)
    assert "language" in sig.parameters
    assert sig.parameters["language"].default == "ko"


# ─── 4. pipeline 시그니처 ─────────────────────────────────────────────────────

def test_compatibility_pipeline_passes_language() -> None:
    """run_compatibility_report 함수 소스에 language 전달이 있는지 확인."""
    import inspect as ins
    from llm.pipelines.compatibility_report import run_compatibility_report
    src = ins.getsource(run_compatibility_report)
    assert "language" in src
