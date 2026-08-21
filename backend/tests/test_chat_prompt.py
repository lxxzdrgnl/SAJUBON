"""채팅 시스템 프롬프트 회귀 테스트.

두 가지 실사용 버그를 막는다:
  1. 오늘 날짜가 프롬프트에 없어 모델이 "이번 달"을 엉뚱한 달·간지로 지어내던 문제
     (실제로 2026년 8월에 "이번 4월은 기사월"이라 답했다 — 기사월은 2024년 값)
  2. "내 연애운 봐줘"에 상대 만세력을 요구하던 문제
     (궁합과 연애운을 한 규칙으로 묶어놔서 request_partner_profile이 강제됐다)
"""

from datetime import date

from llm.prompts.chat import build_chat_system_prompt

SUMMARY = {
    "day_stem": "임",
    "day_element": "수",
    "gyeok_guk": "겁재격",
    "strength": "신강",
    "yong_sin": ["목"],
    "ji_sin": ["금"],
    "pillars": {
        "year": {"stem": "신", "branch": "사"},
        "month": {"stem": "병", "branch": "신"},
        "day": {"stem": "임", "branch": "자"},
        "hour": {"stem": "병", "branch": "오"},
    },
    "current_dae_un": {"stem": "계", "branch": "사", "start_age": 21, "end_age": 30},
    "sin_sals": [{"name": "홍염살", "type": "길신", "priority": 1}],
    "life_domains": {"love": ["연애"]},
}


class TestTodayInjection:
    """[오늘 기준] 블록 — 시점 환각 방지."""

    def test_오늘_날짜가_프롬프트에_들어간다(self):
        p = build_chat_system_prompt(SUMMARY, today=date(2026, 8, 21))
        assert "2026년 8월 21일" in p

    def test_세운_월운_간지가_실제값으로_주입된다(self):
        # 2026-08-21 = 병오년, 입추(8/7) 지났으므로 병신월
        p = build_chat_system_prompt(SUMMARY, today=date(2026, 8, 21))
        assert "병오년" in p
        assert "병신월" in p

    def test_월운은_절기_기준이라_양력달과_어긋날_수_있다(self):
        # 8월 초(입추 전)는 아직 을미월 — 양력 '8월'이라고 신월로 굳으면 안 된다
        p = build_chat_system_prompt(SUMMARY, today=date(2026, 8, 3))
        assert "을미월" in p

    def test_연초_경계에서_전년도_간지_사이클을_쓴다(self):
        # 1월 초는 자월이고 전년도(을사년) 사이클 — 무자월
        p = build_chat_system_prompt(SUMMARY, today=date(2026, 1, 2))
        assert "무자월" in p

    def test_간지_추측_금지_지시가_있다(self):
        p = build_chat_system_prompt(SUMMARY, today=date(2026, 8, 21))
        assert "추측" in p


class TestLoveVsCompatibility:
    """궁합(상대 필요) vs 연애운(상대 불필요) 분리."""

    def test_연애운은_상대_없이_답하라고_지시한다(self):
        p = build_chat_system_prompt(SUMMARY)
        assert "내 연애운" in p
        assert "상대 정보가 필요 없습니다" in p

    def test_연애운에서_상대요청_tool_호출을_금지한다(self):
        p = build_chat_system_prompt(SUMMARY)
        # "request_partner_profile과 get_compatibility_detail을 호출하지 마세요"
        assert "호출하지 마세요" in p

    def test_연상_연하_유형질문은_궁합이_아니라고_명시한다(self):
        p = build_chat_system_prompt(SUMMARY)
        assert "연상" in p

    def test_애매하면_연애운으로_답하라는_기본값이_있다(self):
        p = build_chat_system_prompt(SUMMARY)
        assert "애매하면" in p

    def test_상대_없이_궁합tool_호출을_금지한다(self):
        p = build_chat_system_prompt(SUMMARY)
        assert "상대가 이미 첨부돼 있을 때만" in p

    def test_연애운_분석에_쓸_도구가_명시돼_있다(self):
        p = build_chat_system_prompt(SUMMARY)
        for tool in ("get_ten_gods", "get_sin_sal", "get_wol_un", "find_favorable_periods"):
            assert tool in p, f"연애운 도구 {tool} 안내 누락"


class TestAskBackSuppression:
    """되묻기 억제 + 복합 질문 전부 답하기."""

    def test_되묻기는_최후수단이라고_명시한다(self):
        p = build_chat_system_prompt(SUMMARY)
        assert "최후의 수단" in p

    def test_tool로_요청한_턴에_글로_또_묻지_말라고_한다(self):
        p = build_chat_system_prompt(SUMMARY)
        assert "글로 다시 묻지 마세요" in p

    def test_복합질문은_전부_답하라고_한다(self):
        p = build_chat_system_prompt(SUMMARY)
        assert "질문이 여러 개면 전부 답하세요" in p


def test_영어_모드에서도_오늘_기준이_유지된다():
    p = build_chat_system_prompt(SUMMARY, language="en", today=date(2026, 8, 21))
    assert "2026년 8월 21일" in p
    assert "병신월" in p
