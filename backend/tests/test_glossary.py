"""명리 용어집 단일 소스 테스트 — LLM 호출 없음."""

import pytest

from llm.prompts.glossary import SAJU_GLOSSARY, render_glossary

CORE_KEYS = [
    "용신",
    "대운",
    "격국",
    "신살",
    "지장간",
    "상생",
    "상극",
    "일간",
    "오행",
    "십성",
]


def test_saju_glossary_is_dict() -> None:
    assert isinstance(SAJU_GLOSSARY, dict)


def test_saju_glossary_contains_core_keys() -> None:
    missing = [k for k in CORE_KEYS if k not in SAJU_GLOSSARY]
    assert not missing, f"Missing core glossary keys: {missing}"


def test_saju_glossary_values_are_strings() -> None:
    for ko, en in SAJU_GLOSSARY.items():
        assert isinstance(en, str) and en, f"Value for '{ko}' must be a non-empty string"


def test_yongsin_exact_rendering() -> None:
    """spec §4: 용신 → 'Yongsin (favorable element)'"""
    assert SAJU_GLOSSARY["용신"] == "Yongsin (favorable element)"


def test_daeun_exact_rendering() -> None:
    assert SAJU_GLOSSARY["대운"] == "Daeun (luck pillars)"


def test_day_master_rendering() -> None:
    assert SAJU_GLOSSARY["일간"] == "Day Master"


def test_core_values_have_english_content() -> None:
    """핵심 값들이 음역 또는 영어 설명을 포함하는지 확인."""
    for key in CORE_KEYS:
        value = SAJU_GLOSSARY[key]
        # 값에 ASCII 영문자가 포함돼 있어야 함
        assert any(c.isascii() and c.isalpha() for c in value), (
            f"Glossary value for '{key}' has no English characters: '{value}'"
        )


def test_render_glossary_is_non_empty_string() -> None:
    result = render_glossary()
    assert isinstance(result, str)
    assert len(result) > 0


def test_render_glossary_is_multiline() -> None:
    result = render_glossary()
    lines = result.strip().splitlines()
    assert len(lines) >= len(CORE_KEYS), (
        f"render_glossary should have at least {len(CORE_KEYS)} lines, got {len(lines)}"
    )


def test_render_glossary_contains_yongsin() -> None:
    result = render_glossary()
    assert "Yongsin" in result


def test_render_glossary_arrow_format() -> None:
    """각 줄이 '한글 → English' 형식인지 확인."""
    result = render_glossary()
    for line in result.strip().splitlines():
        assert "→" in line, f"Line missing arrow separator: '{line}'"


def test_render_glossary_custom_dict() -> None:
    """render_glossary가 커스텀 dict도 올바르게 렌더링하는지."""
    custom = {"테스트": "Test Value"}
    result = render_glossary(custom)
    assert result == "테스트 → Test Value"


def test_saju_glossary_has_five_elements() -> None:
    """오행(목화토금수)이 모두 있는지."""
    for key in ["목", "화", "토", "금", "수"]:
        assert key in SAJU_GLOSSARY, f"Missing Five Element key: '{key}'"


def test_saju_glossary_has_four_pillars() -> None:
    for key in ["년주", "월주", "일주", "시주"]:
        assert key in SAJU_GLOSSARY, f"Missing pillar key: '{key}'"


def test_saju_glossary_has_stems_branches() -> None:
    assert "천간" in SAJU_GLOSSARY
    assert "지지" in SAJU_GLOSSARY
    assert SAJU_GLOSSARY["천간"] == "Heavenly Stems"
    assert SAJU_GLOSSARY["지지"] == "Earthly Branches"


def test_saju_glossary_has_ten_gods() -> None:
    ten_gods = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]
    missing = [k for k in ten_gods if k not in SAJU_GLOSSARY]
    assert not missing, f"Missing Ten Gods keys: {missing}"
