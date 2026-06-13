"""올해의 흐름·대운 해설 프롬프트.

- UN_FLOW_SYSTEM_PROMPT : 페르소나·출력 규칙
- format_un_flow_message : saju + 월운 12개 + 대상 연도 → 사용자 메시지 문자열

Writer(generate_report)와 같은 모던 해설가 톤을 유지하되, 출력은 올해의 흐름
(상/하반기 + 월별 키워드·메모)과 대운 비교(현재/다음 + 주의점)에 한정한다.
"""

from __future__ import annotations


UN_FLOW_SYSTEM_PROMPT = """당신은 명리학(사주팔자)에 정통한 모던 해설가입니다.
사주 원국과 올해의 월운(月運) 12개, 현재·다음 대운(大運) 데이터를 바탕으로
'올해의 흐름'과 '대운 비교'를 작성합니다.

## 작성 규칙

1. **올해의 흐름 (year_flow)**
   - first_half: 상반기(1~6월) 전체 분위기를 2~3문장으로 요약하세요.
   - second_half: 하반기(7~12월)를 2~3문장으로 요약하세요.
   - months: 1월부터 12월까지 12개를 모두 채우세요.
     - keyword: 그 달의 분위기를 압축한 키워드. **2~4자 명사형** 표현으로 쓰세요 (예: "전환점", "결실", "정비").
     - memo: 그 달에 대한 **한 문장** 조언. 단문으로 끝맺으세요.

2. **대운 비교 (dae_un_analysis)**
   - current: 현재 대운의 간지·기간과 지금 흐름을 1문단으로 해설하세요.
   - next: 다음 대운의 간지·기간과 앞으로의 변화를 1문단으로 해설하세요.
   - caution: 대운 전환에서 주의할 점을 1문단으로 짚으세요.

3. **근거(속으로만)**: 용신·희신·기신과 월운/대운의 십성·오행 관계를 *판단 근거*로 삼되,
   근거 없는 일반론·추측은 피하세요. 단, 그 용어를 **본문에 날것으로 노출하지 마세요.**

4. **쉬운 말 — 가장 중요**: 명리를 모르는 일반 독자가 한 번에 이해하도록 **일상어**로 쓰세요.
   - 십성·오행 용어(겁재·편재·비견·편관·식상·정관·상관·인성 등)를 그대로 나열하지 말고,
     그 *의미*를 삶의 언어로 풀어 쓰세요. 예) "겁재·편재가 함께 하여" → "경쟁 속에서 재물 기회가 오가는 흐름",
     "비견과 편관의 조합" → "스스로를 증명하고 책임을 짊어지는 시기".
   - 용어를 꼭 써야 한다면 괄호로 짧게 풀이하세요. 예) "재물운(편재)".
   - 무엇이 좋아지고/조심할지를 **구체적인 생활 맥락**(일·돈·관계·건강)으로 연결하세요.

5. **문체 — 모던 해설가 톤**: 존댓말, 단문 위주. 비유는 살리되 과하지 않게.
   이모지·억지 위트·과장된 감탄사는 절대 쓰지 마세요.

## 출력 형식
아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
"""


def _yong_sin_line(saju: dict) -> str:
    ys = saju.get("yong_sin", {})
    xi = "·".join(ys.get("xi_sin", []))
    ji = "·".join(ys.get("ji_sin", []))
    return (
        f"용신: {ys.get('primary', '')} ({ys.get('yong_sin_label', '')})"
        f" / 희신: {xi} / 기신: {ji}"
    )


def _dae_un_line(label: str, d: dict | None) -> str:
    if not d:
        return f"{label}: (없음)"
    return (
        f"{label}: {d.get('ganji_name', '')} "
        f"({d.get('start_age', '')}~{d.get('end_age', '')}세)"
        f" 천간십성:{d.get('stem_ten_god', '')} 지지십성:{d.get('branch_ten_god', '')}"
    )


def _next_dae_un(saju: dict) -> dict | None:
    """current_dae_un 다음 구간을 dae_un_list에서 찾는다."""
    cur = saju.get("current_dae_un") or {}
    dae_list = saju.get("dae_un_list") or []
    cur_start = cur.get("start_age")
    for i, d in enumerate(dae_list):
        if d.get("start_age") == cur_start and i + 1 < len(dae_list):
            return dae_list[i + 1]
    return None


def format_un_flow_message(
    saju: dict,
    months: list[dict],
    year: int,
    format_instructions: str,
) -> str:
    """사주 + 월운 12개 + 대상 연도를 LLM 입력 문자열로 변환."""
    parts: list[str] = []

    meta = saju.get("meta", {})
    day_pillar = saju.get("day_pillar", {})

    parts.append("=== 기본 정보 ===")
    parts.append(
        f"생년월일시: {meta.get('birth_date', '')} {meta.get('birth_time', '')}"
        f" ({meta.get('gender', '')})"
    )
    parts.append(f"일간: {day_pillar.get('stem', '')}")
    parts.append(_yong_sin_line(saju))

    # 대운
    parts.append("\n=== 대운 ===")
    parts.append(_dae_un_line("현재 대운", saju.get("current_dae_un")))
    parts.append(_dae_un_line("다음 대운", _next_dae_un(saju)))

    # 월운 12개
    parts.append(f"\n=== {year}년 월운(月運) 12개 ===")
    for m in months:
        parts.append(
            f"{m.get('month', '')}월: {m.get('ganji_name', '')}"
            f" 천간십성:{m.get('stem_ten_god', '')}"
            f" 지지십성:{m.get('branch_ten_god', '')}"
            f" 12운성:{m.get('twelve_wun', '')}"
        )

    parts.append(f"\n=== 출력 형식 ===\n{format_instructions}")
    return "\n".join(parts)
