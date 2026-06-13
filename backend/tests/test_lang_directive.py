"""영어 출력 지시 헬퍼 테스트 — LLM 호출 없음."""

import pytest

from llm.prompts.lang import english_output_directive


def test_ko_returns_empty_string() -> None:
    assert english_output_directive("ko") == ""


def test_empty_string_returns_empty_string() -> None:
    assert english_output_directive("") == ""


def test_other_locale_returns_empty_string() -> None:
    assert english_output_directive("ja") == ""
    assert english_output_directive("zh") == ""


def test_en_returns_non_empty_string() -> None:
    result = english_output_directive("en")
    assert isinstance(result, str)
    assert len(result) > 0


def test_en_contains_english_keyword() -> None:
    result = english_output_directive("en")
    assert "English" in result


def test_en_contains_structure_keyword() -> None:
    result = english_output_directive("en")
    assert "structure" in result


def test_en_contains_numbers_keyword() -> None:
    result = english_output_directive("en")
    assert "numbers" in result


def test_en_contains_ganji_keyword() -> None:
    result = english_output_directive("en")
    assert "ganji" in result


def test_en_contains_yongsin_gloss() -> None:
    """spec §4: glossary가 지시문에 주입되어야 하며 Yongsin (favorable element) 포함."""
    result = english_output_directive("en")
    assert "Yongsin (favorable element)" in result


def test_en_contains_daeun_gloss() -> None:
    result = english_output_directive("en")
    assert "Daeun (luck pillars)" in result


def test_en_does_not_instruct_banmal() -> None:
    """반말 지시가 영어 출력에 적용되지 않도록 명시적으로 금지해야 함."""
    result = english_output_directive("en")
    # 지시문에 반말/존댓말 관련 '적용하지 마라'는 내용이 있어야 함
    lower = result.lower()
    # 반말 또는 speech-level 관련 금지 문구 확인
    assert "반말" in result or "speech-level" in lower, (
        "Directive must explicitly prohibit applying Korean speech-level instructions"
    )


def test_en_contains_glossary_section() -> None:
    """지시문에 glossary 섹션(용어 → 영어 매핑)이 포함되어야 함."""
    result = english_output_directive("en")
    assert "→" in result, "Directive should contain glossary arrow mappings"


def test_en_contains_day_master() -> None:
    result = english_output_directive("en")
    assert "Day Master" in result


def test_en_contains_five_elements() -> None:
    result = english_output_directive("en")
    assert "Five Elements" in result


def test_en_contains_json_structure_preservation() -> None:
    """JSON 구조 보존 지시가 포함되어야 함."""
    result = english_output_directive("en")
    assert "JSON" in result


def test_en_contains_headline_instruction() -> None:
    """헤드라인 스타일 지시가 포함되어야 함."""
    result = english_output_directive("en")
    lower = result.lower()
    assert "headline" in lower or "punchy" in lower
