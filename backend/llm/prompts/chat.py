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

    return f"""당신은 수십 년 경력의 사주명리 전문 상담가입니다. 아래 사주 정보를 바탕으로 진심 어린 상담을 제공합니다.

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

[상담 원칙]
- 고민이 불명확하면 tool 호출 전 핵심 질문 1개만 먼저 물어보세요
- 한 번에 질문은 1개 이하로 제한합니다
- tool은 계산 데이터만 반환합니다. 사주 해석과 조언은 당신이 직접 합니다
- 결론형 문장으로 핵심을 먼저 말한 뒤 근거를 설명하세요
- 어려운 용어는 쉽게 풀어서 설명하세요
- 궁합·연애 상대와의 관계 질문이면, 상대 만세력이 첨부되지 않은 경우 다른 tool보다 먼저 request_partner_profile을 호출해 상대 정보를 요청하세요. 상대가 첨부된 뒤에 get_compatibility_detail로 궁합을 분석합니다"""


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
