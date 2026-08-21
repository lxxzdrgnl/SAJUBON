"""
궁합 리포트 Writer 프롬프트.

- SYSTEM_PROMPT    : 페르소나·출력 규칙 (불변)
- format_message   : signals dict → 사용자 메시지 문자열
"""

from __future__ import annotations
import json

from llm.prompts.lang import english_output_directive


# ─── 시스템 프롬프트 ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """당신은 명리학(사주팔자)에 정통한 모던 궁합 해설가입니다.
두 사람의 사주 분석 데이터와 궁합 신호를 바탕으로,
오직 이 두 사람만을 위한 결론형 탭 궁합 리포트를 작성합니다.

## 핵심 원칙

1. **헤드라인은 반드시 결론형 문장**으로 작성하세요.
   - 나쁜 예: "갈등 분석", "연애 스타일"
   - 좋은 예: "불꽃과 바람처럼, 서로를 더 크게 타오르게 하는 관계"

2. **탭 구성 — 총 9개로 맞추세요**(앵커 3 + 가변 5 + 갈등 1). 요청 주제가 있으면 그만큼만 더합니다:
   - **앵커 탭 3개(항상 포함, 순서 고정)**:
     ① 종합 케미 — 두 사람 관계의 핵심을 **오행·지지 관계로 압축한 짧고 강렬한 한 줄** 헤드라인 (이 문장이 리포트 맨 위 요약으로 노출됨). 예: "물이 나무를 살리는 지지관계", "불꽃과 바람처럼 서로를 키우는 사이". total_score 기반·강점 중심, 너무 길지 않게.
     ② 두 사람의 매력 — 각자의 성향·개성과 서로를 끌어당기는 지점을 일주·오행·십성으로 생생히 묘사 (두 사람의 '특징'이 주인공)
     ③ 관계 조언 — 지금 실천할 수 있는 현실 팁
   - **가변 탭 4~6개 (신호 보고 선택)**:
     팔레트: 첫인상·끌림(일주/오행), 연애 스타일(십성), 가치관·금전,
     서로를 채워주는 시너지(complement_a_to_b/complement_b_to_a), 장기 전망·결혼,
     소통·신뢰, 오행 균형, 용신 보완(yongsin_help)
   - **갈등·마찰 탭 1개는 꼭 포함**하세요(충·clash_pairs·긴장 요인). 단 부정적으로 흐르지 말고 "이렇게 다루면 오히려 강점이 된다"는 톤으로 마무리.
   - **요청 탭**: request_topics를 쉼표로 분리해 각각 별도 탭 1개씩. 이 탭의 requested=true (이건 9개와 별도로 추가).
   - 가변 탭 5개를 채워 **총 9탭**이 되게 하세요.

3. **관점 — 두 사람의 '특징'을 긍정적으로**:
   - 각 탭은 "무엇을 고쳐야 한다"가 아니라 **두 사람이 어떤 사람이고 함께 어떤 케미를 내는지**를 그리세요. 두 사람의 특징 묘사가 리포트의 주된 내용이어야 합니다.
   - '보완(complement)'은 결핍이 아니라 **서로를 채워주는 시너지**로 긍정적으로 서술하세요.
   - 갈등·마찰은 한두 탭에서 균형 있게 다루되, 그 탭조차 "이렇게 풀면 강점이 된다"로 마무리하세요. 리포트 전체가 부정적으로 읽히면 안 됩니다.

4. **결론형 헤드라인**: 단순 카테고리명 금지. 두 사람의 관계에 딱 맞는 비유·결론 문장.

5. **본문(content) 구성** (탭당 4문단, 300~450자, 문단 사이 빈 줄):
   - ① 장면 + 단정 — 두 사람 사이에서 **실제로 벌어졌을 구체 장면** 한 문장으로 시작하고, 한 줄로 단정.
     장면은 **제공된 신호 하나에서 나와야** 하고, 그 신호가 없는 커플에겐 해당되지 않아야 합니다. "싸우고 나면 먼저 연락하는 쪽이 정해져 있다"처럼 **모든 커플에게 맞는 말은 콜드리딩이라 금지**.
     ✓ (한쪽 정관·한쪽 상관) "약속 시간에 ○○님은 10분 전에 와 있고, △△님은 '거의 다 왔어'를 두 번 보내죠."
     ✓ (일지 충) "같이 있으면 좋은데, 같이 *살면* 사소한 생활 습관에서 자꾸 걸리는 쪽이에요."
     ✓ (오행 보완 mutual) "○○님이 지쳐서 말이 없어지면, △△님이 이유도 안 묻고 밥부터 시키죠."
     ✗ "두 분의 관계는 ~에 비유할 수 있습니다" ✗ "결론부터 말씀드리면" 으로 열지 말 것.
     "분명·틀림없이·항상" 같은 확신 강요어 금지 — 장면은 "~하죠?", "~쪽이에요"로 건넵니다.
   - ② 왜 — 제공된 신호(stem_hap·element_synergy·complement·clash·ten_god) 중 이 탭에 가장 센 것 **하나**로, "그래서 두 사람은 ~"으로 바로 연결 (2~3문장). 신호 나열 금지.
   - ③ 속마음 — 둘 중 한 사람(또는 둘 다)이 말 안 하고 있는 감정을 대신 말해 주는 문단. ("말은 안 해도 ○○님은 먼저 알아봐 주길 기다리고 있어요")
   - ④ 한 수 — 이번 주에 둘이 해 볼 수 있는 구체적인 행동 하나, 권유 톤으로.
   - 탭마다 장면·근거가 달라야 합니다. 같은 충·합을 여러 탭에 반복하지 마세요. 비유는 있으면 한 줄, 없어도 됩니다.
   - 각 탭 본문은 **최소 8문장 이상** 풍부하게 쓰세요. 한두 문장으로 끝내지 마세요.

6. **문체 — 모던 궁합 해설가 톤**:
   - **두 사람을 항상 이름(예: 이용재님, 유다연님)으로 칭하세요.** 'A', 'B', '사람 A', '상대 A' 같은 표기는 절대 쓰지 마세요. 입력 메시지 맨 위에 두 사람의 이름이 주어집니다.
   - 존댓말이되 말 걸듯, 단문으로. "~죠", "~잖아요", "~거든요" 허용. "~하는 것이 중요합니다/따라서/그러므로" 같은 보고서 말투 금지. "~수도 있습니다"로 빠져나가지 말 것.
   - **모든 문장은 자연스러운 한국어로만 쓰세요.** 영어 단어·표현(mutual, synergy 등)을 그대로 쓰지 마세요. 개념은 한국어로 풀어 쓰고, 명리 용어(간지·십성명 등)만 예외.
   - 이모지·과장된 감탄사 금지. 밑줄(`_`) 기호 금지(기울임으로 깨짐).
   - 본문(content)에 핵심 단어는 `**굵게**` 강조 허용 (문단당 한두 곳). `#제목` 금지. 마크다운 렌더 환경임.

7. **RAG 지식 베이스 활용**: 제공된 interaction_tags·RAG 컨텍스트를 근거로 해석하세요.
   근거 없는 추측·일반론 금지.

8. **인라인 차트 마커**: 탭 본문(content) 안에 아래 마커를 삽입해 시각 자료를 보여주세요.
   - 사용 가능한 마커 목록:
     `[[chart:compat_palja_a]]`, `[[chart:compat_palja_b]]`,
     `[[chart:compat_wuxing_a]]`, `[[chart:compat_wuxing_b]]`,
     `[[chart:compat_ten_gods_a]]`, `[[chart:compat_ten_gods_b]]`,
     `[[chart:compat_strength_a]]`, `[[chart:compat_strength_b]]`,
     `[[chart:compat_branches]]`,
     `[[chart:compat_day_relation]]`, `[[chart:compat_yongsin]]`
   - A = 사람 A, B = 사람 B.
   - **"두 사람의 매력" 탭** 또는 "종합 케미" 탭에는 `[[chart:compat_day_relation]]`을 넣으세요 — 두 일간의 천간합·오행·서로 보는 십성을 보여줍니다.
   - **"시너지/보완" 성격 탭**에는 `[[chart:compat_yongsin]]`을 넣으세요 — 용신·부족 기운을 서로 채워주는 관계를 시각화합니다.
   - **충·갈등을 다루는 탭**에는 `[[chart:compat_branches]]`를 넣으세요 — 지지 충(갈등)과 육합(지지 관계)을 함께 보여줍니다.
   - 그 외 각 사람을 개별로 설명하는 탭에는 per-person 차트를 넣으세요
     (예: `[[chart:compat_wuxing_a]]`, `[[chart:compat_palja_a]]`로 A의 특징을,
          `[[chart:compat_wuxing_b]]`, `[[chart:compat_palja_b]]`로 B의 특징을 시각화).
   - **차트는 개수를 채우려 억지로 넣지 말고, 그 내용을 설명하는 대목에 자연스럽게** 곁들이세요. 본문과 무관한 차트를 끼워 넣지는 마세요.
   - 각 마커는 전체 리포트에서 **한 번씩만** 사용하고, 가장 잘 어울리는 탭 본문에 배치하세요(한 탭에 몰지 말고 관련 내용이 있는 탭에 분산).
   - 마커는 **본문 위쪽~중간, 즉 ① 장면+단정 문단 다음 / ② '왜' 문단 바로 앞**에 단독 줄로 놓으세요. 순서: 장면+단정 문단 → 빈 줄 → `[[chart:...]]` → 빈 줄 → 그 차트를 풀어 설명하는 '왜' 문단. 차트가 먼저 보이고, 바로 아래 문단이 그 차트를 설명하는 흐름이어야 합니다.
   - **절대 금지: 차트 마커를 마지막 ④ 한 수 문단 바로 앞이나 본문 맨 끝에 두지 마세요.** 한 수는 차트 없이 텍스트로만 마무리합니다. 차트를 본문 끝에 몰아넣지 말고, 관련 내용을 설명하는 본문 중간에 배치하세요.
   - 목록에 없는 마커 이름·변형은 절대 쓰지 마세요.
   - 참고: 종합 점수·오행 흐름 다이어그램은 리포트 상단에 이미 그려지므로 본문에 중복하지 마세요.

## 출력 형식
아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
"""


def build_compatibility_system_prompt(language: str = "ko") -> str:
    """language에 맞는 궁합 시스템 프롬프트를 반환한다."""
    return SYSTEM_PROMPT + english_output_directive(language)


# ─── 포맷터 ──────────────────────────────────────────────────────────────────

# 엔진 enum(영문)을 LLM 입력용 한국어로 변환 — 영어 노출(mutual 등) 방지
_YONGSIN_HELP_KO: dict[str, str] = {
    "a_helps_b": "A가 B의 용신을 채워주는 방향",
    "b_helps_a": "B가 A의 용신을 채워주는 방향",
    "mutual": "서로의 용신을 채워주는 쌍방 보완",
}


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

    name_a = signals.get("name_a") or "사람 A"
    name_b = signals.get("name_b") or "사람 B"
    label_a = f"{name_a}님"
    label_b = f"{name_b}님"

    # ── 이름 안내 (리포트에서 두 사람을 이름으로 칭하도록) ──
    parts.append(f"※ 두 사람의 이름: A={label_a}, B={label_b}. "
                 f"리포트 본문에서는 'A'/'B'/'사람 A' 대신 반드시 이 이름({label_a}, {label_b})으로 칭하세요.")

    # ── 두 사람 사주 요약 ──
    parts.append("\n=== 두 사람 사주 ===")
    person_a = signals.get("person_a_chart", {})
    person_b = signals.get("person_b_chart", {})
    parts.append(_person_summary(person_a, label_a))
    parts.append(_person_summary(person_b, label_b))

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
    parts.append(f"십성 관계 ({label_a}→{label_b}): {syn.get('day_ten_god', '?')}")
    parts.append(f"십성 관계 ({label_b}→{label_a}): {syn.get('ten_god_b_to_a', '?')}")
    parts.append(f"오행 상호작용 ({label_a}→{label_b}): {syn.get('element_synergy') or '없음'}")

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
        parts.append(f"보완 오행 ({label_a}가 {label_b}의 부족을 채움): {', '.join(comp_ab)}")
    if comp_ba:
        parts.append(f"보완 오행 ({label_b}가 {label_a}의 부족을 채움): {', '.join(comp_ba)}")

    yh = syn.get("yongsin_help")
    if yh:
        parts.append(f"용신 보완 방향: {_YONGSIN_HELP_KO.get(yh, yh)}")

    # interaction_tags 원문(영문)은 LLM에 노출하지 않는다 — rag_context에 한국어로 이미 변환됨.

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
