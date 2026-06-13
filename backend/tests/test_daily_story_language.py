"""오늘의 운세 영어 배선 테스트 — LLM 호출 없음."""

from __future__ import annotations

import inspect
import pytest

from llm.prompts.daily_story import DAILY_STORY_SYSTEM_PROMPT, build_daily_story_system_prompt


# ─── 1. build_daily_story_system_prompt ───────────────────────────────────────

def test_daily_ko_returns_base() -> None:
    assert build_daily_story_system_prompt("ko") == DAILY_STORY_SYSTEM_PROMPT


def test_daily_en_starts_with_base() -> None:
    result = build_daily_story_system_prompt("en")
    assert result.startswith(DAILY_STORY_SYSTEM_PROMPT)


def test_daily_en_contains_directive() -> None:
    result = build_daily_story_system_prompt("en")
    assert "fluent English" in result


def test_daily_en_contains_yongsin() -> None:
    result = build_daily_story_system_prompt("en")
    assert "Yongsin (favorable element)" in result


def test_daily_default_is_ko() -> None:
    assert build_daily_story_system_prompt() == DAILY_STORY_SYSTEM_PROMPT


# ─── 2. pipeline 시그니처 ─────────────────────────────────────────────────────

def test_build_daily_story_accepts_language() -> None:
    from llm.pipelines.daily_story import build_daily_story
    sig = inspect.signature(build_daily_story)
    assert "language" in sig.parameters
    assert sig.parameters["language"].default == "ko"


def test_rewrite_accepts_language() -> None:
    from llm.pipelines.daily_story import _rewrite
    sig = inspect.signature(_rewrite)
    assert "language" in sig.parameters
    assert sig.parameters["language"].default == "ko"


# ─── 3. DailyStoryRequest 스키마 ─────────────────────────────────────────────

def test_daily_story_request_has_language() -> None:
    from schemas.daily_story import DailyStoryRequest
    from schemas.saju import SajuCalcRequest
    req = DailyStoryRequest(
        birth_input=SajuCalcRequest(
            birth_date="1990-03-15",
            birth_time="14:30",
            gender="male",
        ),
        date="2026-06-14",
    )
    assert req.language == "ko"


def test_daily_story_request_language_en() -> None:
    from schemas.daily_story import DailyStoryRequest
    from schemas.saju import SajuCalcRequest
    req = DailyStoryRequest(
        birth_input=SajuCalcRequest(
            birth_date="1990-03-15",
            birth_time="14:30",
            gender="male",
        ),
        date="2026-06-14",
        language="en",
    )
    assert req.language == "en"
