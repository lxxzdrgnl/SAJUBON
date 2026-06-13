"""조건부 영어 출력 지시 헬퍼.

language=="en"일 때 시스템 프롬프트 끝에 덧붙일 영어 출력 directive를 반환한다.
ko(또는 기타)이면 빈 문자열을 반환해 기존 한국어 프롬프트를 그대로 유지한다.
"""

from llm.prompts.glossary import SAJU_GLOSSARY, render_glossary


def english_output_directive(language: str) -> str:
    """language가 "en"이면 영어 출력 지시 문자열을 반환하고, 그 외에는 "" 반환."""
    if language != "en":
        return ""

    glossary_text = render_glossary(SAJU_GLOSSARY)

    return (
        "\n\n---\n"
        "LANGUAGE INSTRUCTION (override any prior language instruction below):\n"
        "Write all natural-language fields (headlines, body, summaries) in natural, "
        "fluent English. Keep the same JSON/output structure, and keep ALL numbers, "
        "scores, dates, and ganji (간지) characters EXACTLY as-is — do not translate "
        "personal names or pillar characters. "
        "Render saju terms EXACTLY per this glossary:\n"
        f"{glossary_text}\n"
        "Keep headlines punchy and conclusion-style. "
        "Do NOT apply Korean speech-level (반말/존댓말) instructions to English output."
    )
