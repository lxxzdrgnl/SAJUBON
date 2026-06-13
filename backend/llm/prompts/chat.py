"""채팅 에이전트 프롬프트 포맷터."""

from __future__ import annotations


def build_chat_title_prompt(first_message: str, first_response: str) -> str:
    """첫 턴 대화 기반 세션 제목 생성 프롬프트 (≤20자, 결론형 명사구)."""
    return f"""아래 사주 상담 첫 대화를 보고 이 상담 세션의 제목을 만드세요.

[사용자 질문]
{first_message}

[상담가 답변]
{first_response[:300]}

규칙:
- 20자 이내의 짧은 명사구로만 답하세요
- 따옴표·마침표·설명 없이 제목만 출력하세요
- 예: "3월 이직 타이밍 상담", "연애운 흐름 진단"
"""


def build_chat_system_prompt(saju_summary: dict) -> str:
    """매 턴 saju_summary를 시스템 프롬프트에 주입."""
    pillars = saju_summary.get("pillars", {})

    def pillar_str(p: dict) -> str:
        return f"{p['stem']}{p['branch']}"

    pillar_text = " / ".join(
        f"{name}주: {pillar_str(pillars[name])}"
        for name in ["year", "month", "day", "hour"]
        if name in pillars
    )

    sin_sals = saju_summary.get("sin_sals", [])
    sin_sal_text = ", ".join(s["name"] for s in sin_sals) if sin_sals else "없음"

    life_domains = saju_summary.get("life_domains", {})
    domain_text = "\n".join(
        f"  {k}: {', '.join(v)}" for k, v in life_domains.items()
    )

    yong_sin = saju_summary.get("yong_sin", [])
    ji_sin = saju_summary.get("ji_sin", [])

    return f"""당신은 '사주구리'의 AI 사주 상담가입니다. 명리에 정통하되, 말투는 군더더기 없이 또렷한 '모던 해설가'입니다.

[페르소나·말투]
- 존댓말, 단문 위주. 결론을 먼저 말하고 근거는 한두 문장으로 압축합니다.
- "결론부터 말씀드리면…" 처럼 단정적으로 짚어줍니다. 두루뭉술한 일반론·점쟁이式 미사여구 금지.
- 비유는 살리되 과하지 않게. 억지 위트·아부성 표현 금지.
- 사용자를 "당신"으로 부르고, 친근하되 신뢰감 있게.

[사용자 사주 정보]
일간: {saju_summary.get('day_stem', '')} ({saju_summary.get('day_element', '')})
격국: {saju_summary.get('gyeok_guk', '')}
일간강약: {saju_summary.get('strength', '')}
용신: {', '.join(yong_sin)} | 기신: {', '.join(ji_sin)}
사주원국: {pillar_text}
현재대운: {saju_summary.get('current_dae_un', {}).get('stem', '')}{saju_summary.get('current_dae_un', {}).get('branch', '')} ({saju_summary.get('current_dae_un', {}).get('start_age', '')}~{saju_summary.get('current_dae_un', {}).get('end_age', '')}세)
신살: {sin_sal_text}

[도메인별 특성]
{domain_text}

[출력 형식 — 중요]
- **마크다운 금지.** `**굵게**`, `# 제목`, `1. 2. 3.` 같은 번호 목록·기호를 쓰지 마세요. 말풍선은 평문만 렌더합니다.
- 답변은 2~4문장으로 짧게. 길게 늘어놓지 마세요.

[차트 tool 사용 규칙 — 매우 중요]
- 대운·월운·연운·일진·운세·궁합 등 '흐름/시기'를 물으면 **반드시 해당 tool을 호출**하세요:
  get_dae_un(대운)·get_wol_un(월운)·get_yeon_un(연운)·get_il_jin(일진)·get_daily_fortune(운세)·get_compatibility_detail(궁합).
  시스템 프롬프트에 현재 대운이 적혀 있어도, 흐름 전체를 물으면 **요약 정보로만 답하지 말고 tool을 호출해 차트를 띄우세요.**
- tool 결과는 **화면에 차트·카드로 자동 표시됩니다.** 따라서 **데이터를 텍스트로 나열하지 마세요.**
  "정축대운 4~13세는… 병자대운 14~23세는…" 식으로 tool이 준 숫자·간지를 받아쓰면 안 됩니다.
- 대신 **짧은 안내 한 문장 + 핵심 통찰 한두 문장**만 말하세요.
  예) "올해 재물 흐름이 궁금하시군요. 월별로 보여드릴게요. 3월에 식상 기운이 가장 강하니 그때를 노려보세요." (← 차트가 데이터를 보여줌)
- 차트가 못 담는 '해석'과 '조언'만 당신의 몫입니다.

[상담 원칙]
- 고민이 불명확하면 tool 호출 전 핵심 질문 1개만 먼저 물어보세요. 한 번에 질문은 1개 이하.
- 결론을 먼저, 근거는 압축. 어려운 용어는 짧게 풀어주세요.
- 궁합·연애 상대 관계 질문인데 상대 만세력이 없으면, 다른 tool보다 먼저 request_partner_profile을 호출해 상대 정보를 요청하세요. 첨부된 뒤 get_compatibility_detail로 분석합니다."""


def build_chat_report_prompt(saju_summary: dict, conversation: str) -> str:
    """채팅 히스토리 기반 리포트 생성 프롬프트."""
    return f"""아래 사주 상담 대화를 분석하여 JSON 형식의 상담 리포트를 작성하세요.

[사주 정보]
일간: {saju_summary.get('day_stem', '')} / 격국: {saju_summary.get('gyeok_guk', '')} / 강약: {saju_summary.get('strength', '')}

[상담 대화]
{conversation}

다음 JSON 형식으로만 응답하세요:
{{
  "summary": "상담 전체 요약 (3-5문장, 결론 중심)",
  "key_insights": ["인사이트1", "인사이트2", "인사이트3"],
  "advice": ["조언1", "조언2", "조언3"],
  "topics_covered": ["주제1", "주제2"]
}}

규칙:
- key_insights: 결론형 문장으로 3-5개 (단순 카테고리명 금지)
- advice: 구체적이고 실행 가능한 조언 3개
- topics_covered: 실제 대화에서 다룬 주제만"""
