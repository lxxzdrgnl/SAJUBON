"""올해의 흐름·대운 해설 생성 단계 단위 테스트 (A2).

- 스키마(YearFlow/YearFlowMonth/DaeUnAnalysis)가 계약대로 존재
- 프롬프트가 12개월·현재/다음 대운 데이터·톤 지시를 포함
- generate_un_flow가 LLM 스텁으로 UnFlowOutput을 파싱
"""

from __future__ import annotations

import pytest
from langchain_core.output_parsers import PydanticOutputParser

from schemas.report import (
    YearFlow, YearFlowMonth, DaeUnAnalysis, DaeUnPeriod, UnFlowOutput,
)
from llm.prompts.un_flow import UN_FLOW_SYSTEM_PROMPT, format_un_flow_message


_SAJU = {
    "meta": {"birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male"},
    "day_pillar": {"stem": "경"},
    "yong_sin": {"primary": "수", "yong_sin_label": "억부", "xi_sin": ["금"], "ji_sin": ["화"]},
    "current_dae_un": {
        "start_age": 33, "end_age": 42, "stem": "을", "branch": "해",
        "ganji_name": "을해", "stem_ten_god": "정재", "branch_ten_god": "식신",
    },
    "dae_un_list": [
        {"start_age": 33, "end_age": 42, "stem": "을", "branch": "해", "ganji_name": "을해"},
        {"start_age": 43, "end_age": 52, "stem": "갑", "branch": "술", "ganji_name": "갑술"},
    ],
}
_MONTHS = [
    {"month": m, "stem": "갑", "branch": "인", "ganji_name": "갑인월",
     "stem_ten_god": "편재", "branch_ten_god": "편재", "twelve_wun": "건록"}
    for m in range(1, 13)
]


class TestUnFlowSchema:
    def test_year_flow_fields(self):
        yf = YearFlow(
            year=2026, first_half="상반기", second_half="하반기",
            months=[YearFlowMonth(month=1, keyword="시작", memo="메모")],
        )
        assert yf.year == 2026
        assert yf.months[0].keyword == "시작"

    def test_dae_un_analysis_fields(self):
        da = DaeUnAnalysis(
            current=DaeUnPeriod(ganji="을해", period="현재 ~2035", text="t"),
            next=DaeUnPeriod(ganji="갑술", period="2036~", text="t2"),
            caution="주의점",
        )
        assert da.current.ganji == "을해"
        assert da.next.ganji == "갑술"
        assert da.caution == "주의점"

    def test_un_flow_output_combines_both(self):
        fields = UnFlowOutput.model_fields
        assert "year_flow" in fields
        assert "dae_un_analysis" in fields


class TestUnFlowPrompt:
    def test_system_prompt_tone(self):
        assert "존댓말" in UN_FLOW_SYSTEM_PROMPT
        assert "이모지" in UN_FLOW_SYSTEM_PROMPT

    def test_system_prompt_keyword_rules(self):
        # 키워드 2~4자 명사형, memo 1문장
        assert "키워드" in UN_FLOW_SYSTEM_PROMPT
        assert "1문장" in UN_FLOW_SYSTEM_PROMPT or "한 문장" in UN_FLOW_SYSTEM_PROMPT

    def test_user_message_includes_months_and_daeun(self):
        parser = PydanticOutputParser(pydantic_object=UnFlowOutput)
        msg = format_un_flow_message(_SAJU, _MONTHS, 2026, parser.get_format_instructions())
        assert "2026" in msg
        assert "을해" in msg  # 현재 대운
        assert "갑술" in msg  # 다음 대운
        # 12개월 표기
        assert msg.count("월") >= 12


@pytest.mark.asyncio
async def test_generate_un_flow_with_stub(monkeypatch):
    """LLM 스텁 → UnFlowOutput 파싱."""
    from llm import writer as writer_mod

    stub_json = (
        '{"year_flow": {"year": 2026, "first_half": "상반기 요약", '
        '"second_half": "하반기 요약", "months": ['
        + ",".join(
            f'{{"month": {m}, "keyword": "키워드{m}", "memo": "메모{m}"}}'
            for m in range(1, 13)
        )
        + ']}, "dae_un_analysis": {"current": {"ganji": "을해", "period": "현재 ~2035", '
        '"text": "현재 대운 해설"}, "next": {"ganji": "갑술", "period": "2036~", '
        '"text": "다음 대운 해설"}, "caution": "주의점"}}'
    )

    class _StubResp:
        content = stub_json

    class _StubLLM:
        async def ainvoke(self, messages):
            return _StubResp()

    monkeypatch.setattr(writer_mod, "get_llm", lambda *a, **k: _StubLLM())

    out = await writer_mod.generate_un_flow(_SAJU, _MONTHS, 2026)
    assert out.year_flow.year == 2026
    assert len(out.year_flow.months) == 12
    assert out.dae_un_analysis.current.ganji == "을해"
    assert out.dae_un_analysis.next.ganji == "갑술"
