"""
사주 리포트 Writer 프롬프트.

- SYSTEM_PROMPT        : 페르소나·출력 규칙 (불변)
- format_user_message  : saju + rag_ctx + concern → 사용자 메시지 문자열
"""

from __future__ import annotations
import json

from llm.prompts.lang import english_output_directive


# ─── 시스템 프롬프트 ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """당신은 명리학(사주팔자)에 정통한 모던 해설가입니다.
주어진 사주 분석 데이터와 명리 지식 베이스(RAG 청크)를 바탕으로,
오직 이 사람만을 위한 결론형 리포트를 작성합니다.

## 핵심 원칙

1. **헤드라인은 반드시 결론형 문장**으로 작성하세요.
   - 나쁜 예: "재물운 분석", "성격 분야"
   - 좋은 예: "30대 중반, 바위 틈에서 물이 솟구치듯 재물이 터질 팔자"

2. **RAG 지식 베이스를 계층 순서로 활용**하세요.
   - CORE(용신·신강신약·일주론) → DYNAMICS(합충·대운) → CONTEXT(신살·도메인) → QUERY(요청 힌트) 순으로 우선순위를 부여하세요.
   - QUERY 레이어의 힌트는 직접 인용하지 말고 해석의 단서로만 사용하세요.
   - 근거 없는 추측이나 일반론은 피하세요.

3. **기본 탭은 아래 10개 카테고리를 각각 정확히 1개씩, 총 10개** 생성하세요. 누락·병합 금지.
   1) 성격  2) 직업  3) 재물  4) 연애  5) 건강
   6) 학업  7) 가족  8) 대인관계  9) 시기 흐름  10) 총평
   - 각 탭의 `category`는 위 표기 그대로, 결론형 `headline`, 본문 `content`를 담고 `requested`는 false로 두세요.
   - 탭마다 독자적인 통찰이 있어야 하며, **10개 탭을 모두 빠짐없이** 충실한 분량으로 작성하세요.

4. **추가로 보고 싶은 주제가 입력되면** 기본 10개 탭에 더해 별도 탭을 만드세요.
   - 입력은 쉼표로 구분된 여러 주제일 수 있습니다. 쉼표로 나뉜 각 주제마다 **별도의 탭 1개씩** 생성하세요.
     (예: "이직 시기, 부모님 건강" → "이직 시기" 탭 1개 + "부모님 건강" 탭 1개)
   - 이렇게 만든 탭은 `category`를 해당 주제명으로 설정하고 `requested`를 true로 두세요.
   - 요청 주제 탭의 헤드라인에는 그 주제에 대한 직접적인 통찰을 담으세요.

5. **본문은 3단으로 구성**하세요 (탭당 5~6문단, 각 문단 2~3문장, 문단 사이는 빈 줄로 구분).
   - ① 비유 — 일간·오행을 자연물/장면에 빗댄 스토리텔링으로 시작 (1~2문단)
   - ② 근거 — 용신·격국·십성·신살 등 명리 데이터로 그 비유가 왜 성립하는지 구체적으로 설명 (2~3문단)
   - ③ 조언 — 마지막 문단은 지금 실천할 수 있는 현실적인 조언으로 마무리 (1문단)
   - 각 탭 본문은 충분히 읽을 거리가 되도록 **최소 8문장 이상** 풍부하게 쓰세요. 한두 문장으로 끝내지 마세요.

6. **문체 — 모던 해설가 톤**:
   - 존댓말, 단문 위주로 또박또박 쓰세요.
   - 비유는 살리되 과하지 않게, "결론부터 말씀드리면" 같은 단정 화법으로 핵심을 먼저 제시하세요.
   - 이모지·억지 위트·과장된 감탄사는 절대 쓰지 마세요.
   - **모든 문장은 자연스러운 한국어로만 쓰세요.** 영어 단어·영어 표현(예: action deficit, over-experience 등)을 섞지 마세요. 개념은 반드시 한국어로 풀어 쓰고, 명리 용어(간지·한자 용어·십성명 등)만 예외로 그대로 쓰세요.
   - 본문(content)은 가벼운 마크다운을 렌더합니다. 문단 안에서 핵심 단어·결론은 `**굵게**`로 강조해도 됩니다. 단 과하게 남발하지 말고 문단당 한두 곳만, `#제목`은 쓰지 마세요. 밑줄(`_`) 기호는 쓰지 마세요(기울임으로 깨집니다). 사실·수치·간지는 그대로 두세요.

7. **원국 차트 마커 — 어울리는 차트를 가장 맞는 탭 본문에 끼워 넣으세요.**
   이 리포트에는 화면에 그려지는 원국 차트가 함께 제공됩니다. 각 차트를 본문 안에 마커로 표시하면 그 자리에 차트가 렌더됩니다.
   - 사용할 수 있는 마커와 차트:
     - `[[chart:get_palja]]` — 사주팔자(원국 사주 네 기둥)
     - `[[chart:get_wuxing_balance]]` — 오행 분포·균형(합화 반영)
     - `[[chart:get_strength]]` — 일간 강약·용신
     - `[[chart:get_ten_gods]]` — 십성 분포
     - `[[chart:get_sin_sal]]` — 신살
     - `[[chart:get_twelve_un_seong]]` — 십이운성(기둥별 생애 단계)
     - `[[chart:get_hap_chung]]` — 합충(기둥 간 끌림·충돌)
   - **사주팔자·오행·강약/용신·십성 4개는 반드시 포함**하고, 신살·십이운성·합충은 그 주제를 다루는 탭이 있으면 해당 탭에 함께 넣으세요(서사에 도움이 될 때 꺼내 쓰세요).
   - **각 마커는 전체 리포트에서 정확히 한 번씩만**, 그 차트가 가장 잘 어울리는 단 하나의 탭 본문에 넣으세요. 한 탭에 몰아넣지 말고 서로 다른 탭으로 분산하세요.
   - 어울리는 탭 가이드(예시일 뿐): 사주팔자→성격/총평, 오행→성격/건강, 강약·용신→총평, 십성→성격/대인관계, 신살→해당 신살이 영향 주는 도메인, 십이운성→시기 흐름/성격, 합충→대인관계/시기 흐름.
   - 마커는 **본문 위쪽~중간, 즉 ① 비유 문단 다음 / ② 근거 문단 바로 앞**에 단독 줄로 놓으세요. 순서: 비유 문단 → 빈 줄 → `[[chart:...]]` → 빈 줄 → 그 차트를 풀어 설명하는 근거 문단. 차트가 먼저 보이고, 바로 아래 문단이 그 차트를 설명하는 흐름이어야 합니다.
   - **절대 금지: 차트 마커를 마지막 ③ 조언 문단 바로 앞이나 본문 맨 끝에 두지 마세요.** 조언은 차트 없이 텍스트로만 마무리합니다. 차트를 본문 끝에 몰아넣지 말고, 관련 내용을 설명하는 본문 중간에 배치하세요.
   - 마커는 위 형식 그대로(이중 대괄호, 정확한 tool 이름)만 쓰고, 목록에 없는 차트 이름이나 변형은 만들지 마세요.
   - **반드시 아래 예시의 문단 배치를 그대로 따르세요** (한 탭 content 예시 — 차트가 비유 다음·근거 앞 중간에 오고, 조언은 차트 없이 끝맺음):
     ```
     맑고 깊은 호수에 햇살이 비치면, 표면은 차가워 보여도 그 아래에는 따스한 물결이 일렁입니다. 임자일주인 당신은 겉으로는 침착하지만 내면에는 따뜻한 온기를 감추고 사는 사람입니다.

     [[chart:get_palja]]

     일간 임수는 깊은 바다와 같아 넓고 깊은 사유의 세계를 품습니다. 위 사주팔자 구성에서 중화신강과 겁재격, 정인·편인의 조화가 논리적이면서 독립적인 사고력을 부여합니다.

     이런 내적 깊이를 행동으로 옮기려면, 생각을 글이나 창작으로 표현하는 훈련이 필요합니다. 마음속 파도를 세상과 나눌 통로를 만들 때 진정한 영향력이 생깁니다.
     ```

## 출력 형식
아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
"""


def build_system_prompt(language: str = "ko") -> str:
    """language에 맞는 시스템 프롬프트를 반환한다.

    - "ko"(기본) → SYSTEM_PROMPT 그대로 (byte-identical)
    - "en"       → SYSTEM_PROMPT + 영어 출력 지시 suffix
    """
    return SYSTEM_PROMPT + english_output_directive(language)


# ─── 사주 프로파일 포맷터 ─────────────────────────────────────────────────────

def _pillar_str(p: dict) -> str:
    if not p:
        return "?"
    return (
        f"{p.get('stem','')}{p.get('branch','')} "
        f"({p.get('stem_element','')}/{p.get('branch_element','')})"
        f" 십성:{p.get('stem_ten_god','')}/{p.get('branch_ten_god','')}"
        f" {p.get('twelve_wun','')}"
    )


def _chunks_to_text(chunks: list[dict], label: str, max_items: int = 3) -> str:
    if not chunks:
        return ""
    lines = [f"[{label}]"]
    for c in chunks[:max_items]:
        doc = c.get("document", "")
        if doc:
            lines.append(f"  • {doc[:300]}")
    return "\n".join(lines)


def format_user_message(
    saju: dict,
    rag_ctx: dict,
    concern: str | None,
    format_instructions: str,
) -> str:
    """
    사주 계산 결과 + RAG 컨텍스트 + 고민을 Writer LLM 입력 문자열로 변환.
    """
    parts: list[str] = []

    # ── 1. 기본 사주 프로파일 ──
    meta   = saju.get("meta", {})
    dms    = saju.get("day_master_strength", {})
    ys     = saju.get("yong_sin", {})
    gyeok  = saju.get("gyeok_guk", {})

    parts.append("=== 사주 프로파일 ===")
    parts.append(f"생년월일시: {meta.get('birth_date','')} {meta.get('birth_time','')} ({meta.get('gender','')})")
    parts.append(f"연주: {_pillar_str(saju.get('year_pillar',{}))}")
    parts.append(f"월주: {_pillar_str(saju.get('month_pillar',{}))}")
    parts.append(f"일주: {_pillar_str(saju.get('day_pillar',{}))}")
    parts.append(f"시주: {_pillar_str(saju.get('hour_pillar',{}))}")

    # 일간 강약
    parts.append(
        f"일간 강약: {dms.get('level_8','')} (점수 {dms.get('score','')})"
        f" / 득령:{dms.get('deuk_ryeong','')} 득지:{dms.get('deuk_ji','')} 득시:{dms.get('deuk_si','')} 득세:{dms.get('deuk_se','')}"
    )

    # 용신
    xi = "·".join(ys.get("xi_sin", []))
    ji = "·".join(ys.get("ji_sin", []))
    parts.append(
        f"용신: {ys.get('primary','')} ({ys.get('yong_sin_label','')}) / 희신:{xi} / 기신:{ji}"
    )

    # 격국
    parts.append(f"격국: {gyeok.get('name','')} — {gyeok.get('description','')}")

    # 오행 분포 (기본 + 합화 적용)
    wuxing     = saju.get("wuxing_count", {})
    wuxing_hap = saju.get("wuxing_count_hap", {})
    wuxing_str = " ".join(f"{k}:{v:.0f}%" for k, v in wuxing.items())
    parts.append(f"오행 분포(원래): {wuxing_str}")

    # 합화로 변화된 오행이 있을 때만 표시
    if wuxing_hap and wuxing_hap != wuxing:
        hap_str = " ".join(f"{k}:{v:.0f}%" for k, v in wuxing_hap.items())
        parts.append(f"오행 분포(합화후): {hap_str}")

    # 지지 관계 (충·합·형·해·파) 사람이 읽기 좋은 형태로
    br = saju.get("branch_relations", {})
    br_lines: list[str] = []

    for hap in br.get("yuk_hap", []):
        pair = "·".join(hap.get("pair", []))
        elem = hap.get("element", "")
        eff  = hap.get("is_effective", False)
        status = "합화 성립" if eff else "합화 불성립(충·극 방해)"
        br_lines.append(f"육합 {pair}→{elem}화 ({status})")

    for sam_hap in br.get("sam_hap", []):
        branches = "·".join(sam_hap.get("branches", []))
        elem = sam_hap.get("element", "")
        label = sam_hap.get("label") or f"삼합 {branches}→{elem}화"
        br_lines.append(label if "합" in label else f"삼합 {branches}→{elem}화 ({label})")

    for pair in br.get("chung", []):
        br_lines.append(f"충 {'↔'.join(pair)} (충돌·약화)")

    for hyeong in br.get("sam_hyeong", []):
        br_lines.append(f"형 {hyeong}")

    for pair in br.get("pa", []):
        br_lines.append(f"파 {'·'.join(pair)}")

    for pair in br.get("hae", []):
        br_lines.append(f"해 {'·'.join(pair)}")

    if br_lines:
        parts.append("지지 상호작용: " + " / ".join(br_lines))

    # 십성 분포
    tgd = saju.get("ten_gods_distribution", {})
    if tgd:
        tgd_str = " ".join(f"{k}:{v:.0f}%" for k, v in sorted(tgd.items(), key=lambda x: -x[1]))
        parts.append(f"십성 분포: {tgd_str}")

    # 신살
    sin_sals = saju.get("sin_sals", [])
    if sin_sals:
        sal_names = [s.get("name", "") for s in sin_sals if s.get("priority") in ("high", "medium")]
        if sal_names:
            parts.append(f"주요 신살: {', '.join(sal_names)}")

    # 현재 대운
    cur_dae_un = saju.get("current_dae_un", {})
    if cur_dae_un:
        parts.append(
            f"현재 대운: {cur_dae_un.get('start_age','')}~{cur_dae_un.get('end_age','')}세 "
            f"{cur_dae_un.get('stem','')}{cur_dae_un.get('branch','')} "
            f"({cur_dae_un.get('stem_element','')}/{cur_dae_un.get('branch_element','')})"
        )

    # 행동 프로파일
    bp = saju.get("behavior_profile", [])
    if bp:
        parts.append(f"행동 프로파일: {', '.join(bp[:6])}")

    # ── 2. 추가로 보고 싶은 주제 ──
    if concern:
        parts.append(
            "\n=== 추가로 보고 싶은 주제 ===\n"
            f"{concern}\n"
            "※ 쉼표로 구분된 각 주제마다 별도 탭 1개씩 만들고, 해당 탭의 category를 주제명으로, requested를 true로 설정하세요."
        )

    # ── 3. RAG 지식 베이스 (계층 구조: CORE → DYNAMICS → CONTEXT → QUERY) ──
    parts.append("\n=== 명리 지식 베이스 ===")
    parts.append("※ 아래 레이어 순서로 해석 우선순위를 적용하세요. CORE가 가장 중요합니다.")

    # ━━ [CORE 레이어] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    parts.append("\n▶ [CORE 레이어 — 모든 해석의 기준]")

    # 용신/신강신약 (최우선)
    if rag_ctx.get("strength"):
        parts.append(f"  신강신약: {rag_ctx['strength']}")
    if rag_ctx.get("yong_sin_summary"):
        parts.append(f"  용신 (최우선 기준): {rag_ctx['yong_sin_summary']}")

    # 일주론
    ilju = rag_ctx.get("ilju")
    if ilju:
        ilju_parts: list[str] = []
        if ec := ilju.get("embedding_context"):
            ilju_parts.append(ec)
        if pt := ilju.get("psychological_traits"):
            ilju_parts.append("성향: " + ", ".join(pt[:5]))
        if ca := ilju.get("career_affinity", {}).get("examples"):
            ilju_parts.append("직업 적성: " + ", ".join(ca[:5]))
        if vul := ilju.get("vulnerability", {}):
            if t := vul.get("trait"):
                ilju_parts.append("취약점: " + t)
        if cp := ilju.get("consulting_points", {}):
            if hl := cp.get("tab_headline"):
                ilju_parts.append("핵심 메시지: " + hl)
            if sp := cp.get("solution_speech"):
                ilju_parts.append(sp[:150])
        if ilju_parts:
            parts.append("[일주론]\n  " + "\n  ".join(ilju_parts))

    # ━━ [DYNAMICS 레이어] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    parts.append("\n▶ [DYNAMICS 레이어 — 변화·흐름 요인]")

    text = _chunks_to_text(rag_ctx.get("dynamics", []), "합충·동역학")
    if text:
        parts.append(text)
    else:
        parts.append("  (활성 합충 관계 없음)")

    # ━━ [CONTEXT 레이어] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    parts.append("\n▶ [CONTEXT 레이어 — 구조패턴·신살·도메인]")

    # 구조패턴 (sin_sal 제외 — 중복 방지)
    ctx_list = rag_ctx.get("context", [])
    for ctx in ctx_list[:3]:
        if ctx.get("type") == "sin_sal":
            continue  # sin_sal은 아래 sin_sal_all에서 단일 처리
        data = ctx.get("data", {})
        name = data.get("name") or ctx.get("id", "")
        meaning = (data.get("embedding_context", "") or data.get("meaning", "")
                   or data.get("description", "") or data.get("summary", ""))
        if isinstance(meaning, dict):
            meaning = meaning.get("core", "") or json.dumps(meaning, ensure_ascii=False)
        if name or meaning:
            parts.append(f"[구조패턴 — {name}]\n  {str(meaning)[:300]}")

    # 신살 (sin_sal_all 단일 소스, pillar_nuance 포함)
    sin_sal_all = rag_ctx.get("sin_sal_all", [])
    for ss in sin_sal_all:
        data     = ss["data"]
        name     = ss["name"]
        location = ss.get("location", [])
        loc_str  = "·".join(location) + "주" if location else ""
        lines: list[str] = [f"[신살 — {name}" + (f" ({loc_str})" if loc_str else "") + "]"]
        if ec := data.get("embedding_context"):
            lines.append(f"  {ec[:200]}")
        if ct := data.get("consulting_tip"):
            lines.append(f"  상담 팁: {ct[:150]}")
        pn = data.get("pillar_nuance", {})
        for pillar in location:
            if entry := pn.get(pillar):
                detail = entry.get("hint", "") or ", ".join(entry.get("traits", [])[:3])
                if detail:
                    lines.append(f"  {pillar}주: {detail}")
        parts.append("\n".join(lines))

    # 도메인별 시맨틱 검색
    for domain, label in [
        ("career", "직업·재능"),
        ("relationship", "연애·인간관계"),
        ("wealth", "재물운"),
        ("personality", "성격·기질"),
    ]:
        text = _chunks_to_text(rag_ctx.get(domain, []), label)
        if text:
            parts.append(text)

    # ━━ [QUERY 레이어] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if concern:
        parts.append("\n▶ [QUERY 레이어 — 요청 주제 해석 힌트]")
        parts.append("※ 아래는 정답이 아닌 해석 단서입니다. 직접 인용하지 말고 판단 근거로만 활용하세요.")

        hints = rag_ctx.get("concern_hints", [])
        if hints:
            parts.append("  활성 힌트 키워드: " + " / ".join(hints))

        text = _chunks_to_text(rag_ctx.get("concern", []), "관련 지식 참고", max_items=2)
        if text:
            parts.append(text)

    # ── 4. 출력 형식 지시 ──
    parts.append(f"\n=== 출력 형식 ===\n{format_instructions}")

    return "\n".join(parts)
