"""Writer 프롬프트·스키마 개편 단위 테스트 (A1).

- TabContent에 category/requested 필드가 추가되었는지
- 프롬프트가 추가 주제(여러 개 → 각각 별도 탭) 지시·3단 구성·모던 해설가 톤을 포함하는지
- PydanticOutputParser가 category/requested를 파싱하는지
"""

from __future__ import annotations

from langchain_core.output_parsers import PydanticOutputParser

from schemas.report import TabContent, WriterOutput
from llm.prompts.report import SYSTEM_PROMPT, format_user_message


# ── 최소 사주/RAG 컨텍스트 스텁 ──
_SAJU = {
    "meta": {"birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male"},
    "day_master_strength": {"level_8": "신강", "score": 60},
    "yong_sin": {"primary": "수", "yong_sin_label": "억부", "xi_sin": ["금"], "ji_sin": ["화"]},
    "gyeok_guk": {"name": "정관격", "description": "설명"},
    "wuxing_count": {"목": 20, "화": 20, "토": 20, "금": 20, "수": 20},
    "wuxing_count_hap": {},
    "day_pillar": {"stem": "경", "branch": "오"},
}
_RAG = {"context": [], "concern": []}


class TestTabSchema:
    def test_tabcontent_has_category_and_requested(self):
        tab = TabContent(category="재물", headline="결론형 문장", content="본문")
        assert tab.category == "재물"
        assert tab.requested is False  # 기본값

    def test_requested_defaults_false(self):
        fields = TabContent.model_fields
        assert "category" in fields
        assert "requested" in fields
        assert fields["requested"].default is False


class TestParserRoundTrip:
    def test_parser_parses_category_and_requested(self):
        parser = PydanticOutputParser(pydantic_object=WriterOutput)
        raw = (
            '{"tabs": [{"category": "이직 시기", "headline": "지금이 적기입니다", '
            '"content": "본문", "requested": true}]}'
        )
        out = parser.parse(raw)
        assert out.tabs[0].category == "이직 시기"
        assert out.tabs[0].requested is True


class TestPromptInstructions:
    def test_system_prompt_mentions_additional_topics(self):
        # "고민" 단어 대신 "추가로 보고 싶은 주제" 류 표현
        assert "추가로 보고 싶은 주제" in SYSTEM_PROMPT

    def test_system_prompt_mentions_comma_separated_topics(self):
        # 쉼표 구분 여러 주제 → 각각 별도 탭
        assert "쉼표" in SYSTEM_PROMPT

    def test_system_prompt_mentions_three_part_structure(self):
        for kw in ("비유", "근거", "조언"):
            assert kw in SYSTEM_PROMPT

    def test_system_prompt_mentions_paragraph_count(self):
        # 공감형 구조: 탭당 4문단(장면+단정 → 왜 → 속마음 → 한 수), 300~450자
        assert "4문단" in SYSTEM_PROMPT
        assert "300~450자" in SYSTEM_PROMPT

    def test_system_prompt_mentions_modern_tone(self):
        assert "결론부터 말씀드리면" in SYSTEM_PROMPT
        assert "존댓말" in SYSTEM_PROMPT

    def test_system_prompt_forbids_emoji(self):
        assert "이모지" in SYSTEM_PROMPT

    def test_user_message_includes_topics_when_present(self):
        parser = PydanticOutputParser(pydantic_object=WriterOutput)
        msg = format_user_message(_SAJU, _RAG, "이직 시기, 부모님 건강", parser.get_format_instructions())
        assert "이직 시기" in msg
        assert "부모님 건강" in msg
