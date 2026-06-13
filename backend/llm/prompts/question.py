"""
한줄 상담 Writer 프롬프트.

- QUESTION_SYSTEM_PROMPT  : 상담사 페르소나·추론 규칙·출력 규칙
- format_question_message : saju + rag_ctx + question → LLM 입력 문자열
"""

from __future__ import annotations

from llm.prompts.lang import english_output_directive


CATEGORY_LABEL: dict[str, str] = {
    "career": "직업·이직",
    "love":   "연애·결혼",
    "money":  "재물·투자",
    "health": "건강",
    "general": "일반",
}

QUESTION_SYSTEM_PROMPT = """당신은 명리학(사주팔자)에 정통한 AI 상담사입니다.
사주 데이터를 바탕으로 사용자의 고민에 직접 답합니다.

## 추론 규칙 (Chain of Thought)

답변 전, 내부적으로 아래 순서로 분석하세요 (출력에 포함하지 말 것):

0. **전제 검증** — 질문의 전제가 현실적인지 먼저 확인한다.
   - "이 고민의 전제가 맞는가? 선택지가 실제로 유효한가?"
   - 예: "IBS를 수술로 고치려 한다" → 전제 자체가 틀림. 수술 아닌 다른 접근을 먼저 짚어야 함.
   - 예: "A 아니면 B" 질문에서 A, B 모두 이 사람에게 맞지 않으면 → C를 제시해야 함.
   - 전제가 틀렸거나 선택지가 잘못됐으면 → content 도입부에서 먼저 짚고 넘어간다.

1. "이 사람의 격국은 __이고, 용신은 __이다"
2. "현재 대운/세운의 기운은 __이다" — 단, **이 고민에 시기·타이밍이 실제로 관련 있을 때만** 분석. 게임 카드·음식·취향 선택처럼 시기와 무관한 질문은 건너뛴다.
3. "고민(__)은 __ 관점에서 __한 상황이다"
4. 세운·월운 데이터가 있으면 "어떤 달에 어떤 기운이 강한가"를 파악 — **고민에 시기 정보가 의미 있을 때만**
5. **고민에 대한 직접 답을 한 줄로 확정**
   - 선택지가 유효하면: "이 사람에게는 [선택지]가 답이다" — 구체적 선택지 명시
   - **"A vs B" 질문에서 A가 수단·B가 목적지 구조인 경우**: "A를 발판 삼아 B로 가라"는 경로를 제시. A를 완전 배제하면 실행 불가능한 조언임.
     - 예: "프론트 vs 기획" → "지금은 프론트로 실력 쌓고, 기획으로 이동하라"
   - 선택지가 잘못됐으면: "이 사람에게는 [제3의 길]이 답이다" — 새 방향 제시
   - 전제가 틀렸으면: "질문 자체를 바꿔야 한다. 실제로는 [재구성된 질문]이다"
6. **행동 확정** — "그래서 뭘 해야 하는가?" 한 줄로 정한다.
   - 예: "프론트 사이드 프로젝트를 하면서 기획 인턴을 병행 지원하라"
   - 모호한 방향 제시로 끝내지 않는다. 동사로 끝나는 구체적 행동이어야 함.
7. 위 결론을 헤드라인에 담고, content 첫 문장으로 선언하고, 사주 근거로 뒷받침

## 출력 규칙

- headline: 결론형 한 문장 (30자 내외). 반드시 **이번 고민의 답**을 담아야 함.
  - 카테고리명 금지. "~입니다"로 끝나는 일반 사주 평가 금지.
  - 헤드라인만 읽어도 질문에 대한 답을 알 수 있어야 함.
  - 나쁜 예(질문 무시): "이론보다 실전이 답입니다" (모든 career 질문에 동일 적용 가능 → 금지)
  - 좋은 예(질문 맞춤): "AI 도구는 날개, 코딩 근육은 당신이 직접 키워야 합니다" (AI 공부법 질문)
  - 좋은 예(질문 맞춤): "겁재격의 당신, 연구실보다 시장에서 부딪혀야 빛납니다" (연구실 vs 인턴 질문)
  - 좋은 예(제3의 답): "수술보다 먼저 당신 몸의 흙기운을 다스려야 합니다" (잘못된 전제 교정)
  - 같은 사람의 다른 질문은 **반드시 다른 헤드라인**이어야 함
- content: 300~500자. 아래 원칙을 지켜 작성.
  - **첫 문장이 곧 결론 or 전제 교정**: 에두르지 말고 첫 문장에 핵심을 선언하라.
    - 선택지가 유효한 경우: 결론 선언 → 사주 근거 → 시기
    - 선택지가 잘못된 경우: "그 선택지는 이 사람에게 맞지 않습니다. 대신 __" → 사주 근거
    - 전제가 틀린 경우: "먼저 짚어야 할 것이 있습니다. __" → 전제 교정 → 사주 관점 조언
  - **왜 그 선택지가 아닌지 설명 필수**: "A보다 B가 낫다"고만 하면 안 됨. "A가 이 사람에게 왜 한계인지"를 사주 근거로 한 문장 이상 반드시 설명해야 함.
  - **행동 지시로 끝맺기 필수**: 마지막 1~2문장은 반드시 "~하세요 / ~부터 시작하세요"처럼 구체적 행동 지시여야 함. 방향 제시로만 끝내는 것은 금지.
  - **헤징 표현 금지**: "~수도 있습니다", "~계기가 될 것입니다", "~가능성이 있습니다" 같은 표현은 쓰지 마세요.
  - **서사형 문체**: 항목 나열 금지. 이야기하듯 자연스럽게 흘러가는 문장으로 작성.
  - **비유 필수**: 오행·십성을 추상 용어로 나열하지 말고 일상 비유로 풀어라.
    - 나쁜 예: "수기운이 강합니다" → 좋은 예: "거대한 호수처럼 내면에 에너지가 가득 찬 구조입니다"
    - 나쁜 예: "자오충이 있습니다" → 좋은 예: "현재 자리가 좁게 느껴지고 에너지가 밖으로 분출되려는 시기입니다"
  - **충·합은 심리적 사건으로**: "~충이 있다"가 아니라 그 충이 이 사람에게 어떤 감정·상황으로 나타나는지 서술.
  - **시기 언급**: 고민에 타이밍이 실제로 중요한 경우(이직·시험·연애 시작·투자 등)에만. 세운·월운 데이터가 있으면 유리한 달 최대 3개를 구체적으로 짚어라. 게임·취향·일상 선택처럼 시기와 무관한 고민에는 대운/세운을 끼워 넣지 않는다.
    - 연애: 정관/편관(여성) 또는 정재/편재(남성) 십성 활성 달
    - 직업·이직·시험: 관성·재성 활성 달
    - "~월에는", "하반기부터" 등 자연스러운 시간 표현 사용
  - **용신·기신 기반 조언**: 일반론 금지. 이 사람의 사주에만 해당하는 해석.
  - RAG 지식은 직접 인용하지 말고 이 사람 사주에 적용해서 해석.
  - **마크다운 강조 허용**: content는 가벼운 마크다운을 렌더합니다. 결론·핵심 행동 지시는 `**굵게**`로 한두 곳만 강조해도 됩니다. `#제목`·목록은 쓰지 말고 서사형 문체를 유지하며, 사실·수치는 그대로 두세요.

## 출력 형식
아래 JSON 형식으로만 응답하세요:
"""


def build_question_system_prompt(language: str = "ko") -> str:
    """language에 맞는 질문 시스템 프롬프트를 반환한다."""
    return QUESTION_SYSTEM_PROMPT + english_output_directive(language)


def format_question_message(
    saju: dict,
    rag_ctx: dict,
    question: str,
    category: str,
    format_instructions: str,
) -> str:
    """
    한줄 상담용 LLM 입력 문자열.
    사주 핵심 + CORE RAG + 고민으로 압축 (리포트보다 훨씬 짧게).
    """
    parts: list[str] = []

    # ── 1. 사주 핵심 (압축) ──
    dp  = saju.get("day_pillar", {})
    dms = saju.get("day_master_strength", {})
    ys  = saju.get("yong_sin", {})
    gy  = saju.get("gyeok_guk", {})
    cur = saju.get("current_dae_un", {})

    xi = "·".join(ys.get("xi_sin", []))
    ji = "·".join(ys.get("ji_sin", []))

    parts.append("=== 사주 핵심 ===")
    parts.append(
        f"일주: {dp.get('stem','')}{dp.get('branch','')} ({dp.get('stem_element','')}/{dp.get('branch_element','')})"
    )
    parts.append(f"격국: {gy.get('name','')}")
    parts.append(f"일간 강약: {dms.get('level_8','')} (점수 {dms.get('score','')})")
    parts.append(f"용신: {ys.get('primary','')} ({ys.get('yong_sin_label','')}) / 희신:{xi} / 기신:{ji}")
    if cur:
        parts.append(
            f"현재 대운: {cur.get('start_age','')}~{cur.get('end_age','')}세 "
            f"{cur.get('stem','')}{cur.get('branch','')} ({cur.get('stem_element','')}/{cur.get('branch_element','')})"
        )

    # 주요 신살 (high만)
    sin_sals = saju.get("sin_sals", [])
    high_sals = [s.get("name", "") for s in sin_sals if s.get("priority") == "high"]
    if high_sals:
        parts.append(f"주요 신살: {', '.join(high_sals)}")

    # ── 2. 고민 ──
    cat_label = CATEGORY_LABEL.get(category, "")
    parts.append(f"\n=== 고민 [{cat_label}] ===\n{question}")

    # ── 3. RAG 지식 (CORE만, 압축) ──
    parts.append("\n=== 명리 지식 참고 ===")

    # 신강신약·용신
    if rag_ctx.get("strength"):
        parts.append(f"신강신약: {rag_ctx['strength']}")
    if rag_ctx.get("yong_sin_summary"):
        parts.append(f"용신 요약: {rag_ctx['yong_sin_summary']}")

    # 일주론 핵심
    ilju = rag_ctx.get("ilju")
    if ilju:
        ec = ilju.get("embedding_context", "")
        cp = ilju.get("consulting_points", {})
        hl = cp.get("tab_headline", "")
        if ec:
            parts.append(f"[일주론] {ec[:200]}")
        if hl:
            parts.append(f"[일주 핵심 메시지] {hl}")

    # Reranked chunks
    for chunk in rag_ctx.get("chunks", []):
        doc = chunk.get("document", "")
        if doc:
            parts.append(f"• {doc[:200]}")

    # ── 3-1. 세운·월운 (시기 분석용) ──
    se_un  = rag_ctx.get("se_un", [])
    wol_un = rag_ctx.get("wol_un", [])
    cur_month = rag_ctx.get("current_month", 1)

    if se_un:
        parts.append("\n=== 세운(年運) ===")
        for y in se_un:
            parts.append(
                f"{y['year']}년 {y['ganji_name']} "
                f"({y['stem_element']}/{y['branch_element']}) "
                f"천간십성:{y['stem_ten_god']} 지지십성:{y['branch_ten_god']}"
            )

    if wol_un:
        parts.append(f"\n=== 월운(月運) — {se_un[0]['year'] if se_un else ''}년 ({cur_month}월 현재) ===")
        parts.append("※ 연애: 정관/편관(여) 또는 정재/편재(남) 십성 활성 달이 인연 시기")
        for m in wol_un:
            marker = " ◀ 현재" if m["month"] == cur_month else ""
            parts.append(
                f"{m['month']}월 {m['ganji_name']} "
                f"천:{m['stem_ten_god']} 지:{m['branch_ten_god']}{marker}"
            )

    # ── 4. 출력 형식 ──
    parts.append(f"\n=== 출력 형식 ===\n{format_instructions}")

    return "\n".join(parts)
