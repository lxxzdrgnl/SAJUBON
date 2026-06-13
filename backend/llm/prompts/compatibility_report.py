"""
궁합 리포트 Writer 프롬프트.

- SYSTEM_PROMPT    : 페르소나·출력 규칙 (불변)
- format_message   : signals dict → 사용자 메시지 문자열
"""

from __future__ import annotations
import json


# ─── 시스템 프롬프트 ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """당신은 명리학(사주팔자)에 정통한 모던 궁합 해설가입니다.
두 사람의 사주 분석 데이터와 궁합 신호를 바탕으로,
오직 이 두 사람만을 위한 결론형 탭 궁합 리포트를 작성합니다.

## 핵심 원칙

1. **헤드라인은 반드시 결론형 문장**으로 작성하세요.
   - 나쁜 예: "갈등 분석", "연애 스타일"
   - 좋은 예: "불꽃과 바람처럼, 서로를 더 크게 타오르게 하는 관계"

2. **탭 구성 — 유동 탭 5~8개**:
   - **앵커 탭 3개(항상 포함, 순서 고정)**:
     ① 종합 케미 — 두 사람 전체 관계의 결론 헤드라인 (total_score 기반)
     ② 갈등 포인트 — 충·긴장·마찰 (conflict_branches·clash_pairs 기반)
     ③ 관계 조언 — 지금 실천할 수 있는 현실 팁
   - **가변 탭 2~5개 (신호 보고 선택)**:
     아래 팔레트 중 두 사람에게 가장 두드러진 측면을 골라 탭을 만드세요.
     팔레트: 첫인상·끌림(일주/오행), 연애 스타일(십성), 가치관·금전,
     보완·시너지(complement_a_to_b/complement_b_to_a), 장기 전망·결혼,
     소통·신뢰, 오행 균형, 용신 보완(yongsin_help)
     - complement_a_to_b/complement_b_to_a가 비어 있으면 시너지 탭 대신 다른 탭을 고르세요.
     - clash_pairs가 많으면 갈등/소통 탭에 더 비중을 두세요.
   - **요청 탭**: request_topics를 쉼표로 분리해 각각 별도 탭 1개씩. 이 탭의 requested=true.
   - 총 5~8탭. 앵커 3탭 + 가변 + 요청 탭 합계.

3. **결론형 헤드라인**: 단순 카테고리명 금지. 두 사람의 관계에 딱 맞는 비유·결론 문장.

4. **본문(content) 구성** (탭당 3~4문단, 문단 사이 빈 줄):
   - ① 비유 — 두 사람의 관계를 자연물·장면으로 비유 (1문단)
   - ② 근거 — 제공된 신호(stem_hap·element_synergy·complement·clash·ten_god)로 왜 그 비유인지 (1~2문단)
   - ③ 조언 — 마지막 문단은 실천 팁
   - 최소 5문장 이상. 한두 문장으로 끝내지 마세요.

5. **문체 — 모던 궁합 해설가 톤**:
   - 존댓말, 단문 위주로 또박또박.
   - 이모지·과장된 감탄사 금지.
   - 본문(content)에 핵심 단어는 `**굵게**` 강조 허용 (문단당 한두 곳).
   - `#제목` 금지. 마크다운 렌더 환경임.

6. **RAG 지식 베이스 활용**: 제공된 interaction_tags·RAG 컨텍스트를 근거로 해석하세요.
   근거 없는 추측·일반론 금지.

## 출력 형식
아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
"""


# ─── 포맷터 ──────────────────────────────────────────────────────────────────

def _person_summary(chart: dict, label: str) -> str:
    """사주 dict → 사람 요약 문자열."""
    day = chart.get("day_pillar", {})
    ys = chart.get("yong_sin") or {}
    dms = chart.get("day_master_strength") or {}
    meta = chart.get("meta") or {}

    stem = day.get("stem", "")
    branch = day.get("branch", "")
    stem_el = day.get("stem_element", "")
    branch_el = day.get("branch_element", "")

    yong = ys.get("primary", "")
    weak = chart.get("weak_elements", [])
    dominant = chart.get("dominant_elements", [])
    strength = dms.get("level_8", "")

    birth = meta.get("birth_date", "")
    gender = meta.get("gender", "")

    lines = [
        f"[{label}] 생년월일: {birth} ({gender})",
        f"  일주: {stem}{branch} ({stem_el}/{branch_el})",
        f"  일간 강약: {strength}",
        f"  용신: {yong}",
        f"  약한 오행: {', '.join(weak) if weak else '없음'}",
        f"  강한 오행: {', '.join(dominant) if dominant else '없음'}",
    ]

    wuxing = chart.get("wuxing_count") or {}
    if wuxing:
        wx_str = " ".join(f"{k}:{v:.0f}%" for k, v in wuxing.items() if isinstance(v, (int, float)))
        lines.append(f"  오행 분포: {wx_str}")

    tg_dist = chart.get("ten_gods_distribution") or {}
    if tg_dist:
        tg_str = " ".join(
            f"{k}:{v:.0f}%"
            for k, v in sorted(tg_dist.items(), key=lambda x: -x[1])
        )
        lines.append(f"  십성 분포: {tg_str}")

    return "\n".join(lines)


def format_message(signals: dict) -> str:
    """
    signals dict → Writer LLM 입력 문자열.

    signals 키:
      person_a_chart, person_b_chart : handle_calculate_saju 반환 dict
      synastry                       : synastry_for_report 반환 dict
      score                          : check_compatibility 반환 dict
      request_topics                 : str | None
      rag_context                    : str (build_rag_context 태그 요약)
    """
    parts: list[str] = []

    # ── 두 사람 사주 요약 ──
    parts.append("=== 두 사람 사주 ===")
    person_a = signals.get("person_a_chart", {})
    person_b = signals.get("person_b_chart", {})
    parts.append(_person_summary(person_a, "사람 A"))
    parts.append(_person_summary(person_b, "사람 B"))

    # ── 궁합 점수 ──
    score = signals.get("score", {})
    parts.append("\n=== 궁합 점수 오버뷰 ===")
    parts.append(f"종합 점수: {score.get('total_score', '?')}/100")
    parts.append(f"  일주: {score.get('day_pillar_score', '?')}  오행조화: {score.get('element_harmony_score', '?')}")
    parts.append(f"  지지관계: {score.get('branch_relation_score', '?')}  십성: {score.get('ten_gods_score', '?')}")
    conflicts = score.get("conflict_branches", [])
    if conflicts:
        parts.append(f"  충 지지 쌍: {', '.join(conflicts)}")

    # ── 방향성 신호 ──
    syn = signals.get("synastry", {})
    parts.append("\n=== 궁합 방향성 신호 (서술·다이어그램 소스) ===")
    parts.append(f"천간합화: {syn.get('stem_hap') or '없음'}")
    parts.append(f"십성 관계 (A→B): {syn.get('day_ten_god', '?')}")
    parts.append(f"오행 상호작용 (A→B): {syn.get('element_synergy') or '없음'}")

    clash = syn.get("clash_pairs", [])
    if clash:
        clash_str = ", ".join(
            "-".join(p) if isinstance(p, (list, tuple)) else str(p)
            for p in clash
        )
        parts.append(f"지지충 쌍: {clash_str}")
    else:
        parts.append("지지충: 없음")

    comp_ab = syn.get("complement_a_to_b", [])
    comp_ba = syn.get("complement_b_to_a", [])
    if comp_ab:
        parts.append(f"A→B 보완 오행 (A가 B의 부족을 채움): {', '.join(comp_ab)}")
    if comp_ba:
        parts.append(f"B→A 보완 오행 (B가 A의 부족을 채움): {', '.join(comp_ba)}")

    yh = syn.get("yongsin_help")
    if yh:
        parts.append(f"용신 보완 방향: {yh}")

    tags = syn.get("interaction_tags", [])
    if tags:
        parts.append(f"상호작용 태그: {', '.join(tags)}")

    # ── RAG 컨텍스트 ──
    rag = signals.get("rag_context", "")
    if rag:
        parts.append(f"\n=== 명리 지식 베이스 ===\n{rag}")

    # ── 요청 탭 주제 ──
    request_topics = signals.get("request_topics")
    if request_topics:
        parts.append(
            f"\n=== 추가로 보고 싶은 주제 ===\n{request_topics}\n"
            "※ 쉼표로 구분된 각 주제마다 별도 탭 1개씩. category=주제명, requested=true."
        )

    return "\n".join(parts)
