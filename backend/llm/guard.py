"""
Guard + 카테고리 자동 분류.

question 파이프라인과 (추후) chat 파이프라인이 공유하는 입력 안전장치.
LLM 1회 호출로 차단/분류/즉답을 처리.
"""

from __future__ import annotations
import logging
from langchain_core.messages import SystemMessage, HumanMessage
from llm.providers import get_llm

logger = logging.getLogger(__name__)

_GUARD_PROMPT = """사용자의 고민을 보고 아래 분류 중 하나로 답하세요. 순서대로 검사해 먼저 해당하는 것을 고릅니다.

[CRISIS] 자살·자해·죽고 싶다·살기 싫다·사라지고 싶다·다 끝내고 싶다 등 자신을 해칠 위험이 읽히는 표현.
  농담처럼 보여도 위험 신호가 있으면 CRISIS. 사주 분석 대상이 아니라 안전 안내 대상이다.

[BLOCK] 아래에 해당하면 차단:
- 타인의 신체 접촉·성적 행위 요청
- 범죄·폭력·불법 행위 조언 요청
- 특정인 비방·스토킹·위협

[MEDICAL] 본인 또는 가족의 실제 의료 결정이 걸린 질문:
- 수술을 할지/언제 할지, 약을 먹을지/끊을지, 치료법 선택, 병원에 갈지, 진단 결과 해석
- 전제가 의학적으로 틀린 경우(예: "IBS를 수술로 고치고 싶다")도 MEDICAL — 사주로 시기를 잡아 주면 안 되기 때문
→ 단순 "건강 운세·체력 흐름" 질문은 OK|health.
→ 신체 일부 절단 같은 물리적으로 황당한 전제만 INSTANT.

[OFFTOPIC] 사주·운세·인생 고민과 무관한 정보성 요청: 프로그래밍·수학·숙제·번역·요약·레시피·일반 지식 검색·제품 사용법 등.
  (음식 선택·게임·쇼핑처럼 "내가 뭘 할까" 류의 일상 고민은 OFFTOPIC이 아니라 OK|general)

[INSTANT] 아래 중 하나에만 해당하면 INSTANT:
- 즉각 행동이 답인 생리적 상황 (배고픔, 졸림, 화장실 등)
- 전제 자체가 물리적으로 불가능한 황당한 질문 (예: "팔을 자를까", "화성에 이민 갈까")
- **질문으로 해석 불가능한 무의미한 입력**: 무작위 문자·자모만 나열·아무 의미 없는 문자열 (예: "ㅁㄴㅇㄹ", "asdf 1234", "ㅋㅋ???", "zzzz"). 이때는 헤드라인을 "질문을 이해하지 못했어요"로, 본문을 "사주로 보고 싶은 고민을 한 문장으로 다시 적어 주세요." 류로 짧게 작성.
→ (생리·황당 질문) 질문에 딱 맞는 위트 있는 헤드라인(15자 이내)과 사주 느낌의 짧은 본문을 작성.
  헤드라인은 질문의 핵심을 유쾌하게 비틀거나 직접 결론 짓는 문장.

[OK] 그 외 **모든** 질문. 게임·오락·재미·음식·쇼핑·일상 고민도 모두 OK. 카테고리 분류:
career(직업·이직·사업·시험) / love(연애·결혼·인간관계) / money(재물·투자) / health(건강·체력) / general(기타)

반드시 아래 형식으로만 응답 (다른 텍스트 금지):
OK|<카테고리>
또는
BLOCK: <사주 관점의 한 줄 경고문>
또는
INSTANT|<헤드라인>|<본문>
또는
MEDICAL
또는
CRISIS
또는
OFFTOPIC"""


# ── 고정 응답 (LLM 미경유) ──────────────────────────────────────────
# 위기·범위 밖·의료 채팅은 모델이 문장을 만들지 않는다. 톤과 문구를 코드로 고정한다.
CRISIS_RESPONSE: dict[str, str] = {
    "headline": "지금은 사주보다 당신이 먼저예요",
    "content": (
        "많이 힘드신 것 같아요. 그 마음을 여기 적어 주신 것만으로도 용기예요. "
        "이런 마음은 사주로 풀 일이 아니라, 지금 곁에서 들어줄 사람이 필요한 일이에요.\n\n"
        "**자살예방상담전화 109** (24시간, 무료) 또는 **정신건강위기상담 1577-0199**에 지금 전화해 보세요. "
        "문자가 편하시면 카카오톡에서 '마들랜'을 검색하셔도 돼요.\n\n"
        "오늘 하루만 버티는 것도 괜찮아요. 조금 진정되면, 그때 다시 이야기 나눠요."
    ),
}

OFFTOPIC_RESPONSE: dict[str, str] = {
    "headline": "그건 사주구리가 도울 수 있는 질문이 아니에요",
    "content": (
        "사주구리는 사주를 바탕으로 고민을 함께 보는 서비스라, 프로그래밍·공부·일반 지식 같은 질문에는 답을 드리지 않아요. "
        "대신 진로·일·관계·돈·건강 흐름처럼 '내 삶의 선택'이 걸린 고민이라면 언제든 물어봐 주세요."
    ),
}

MEDICAL_CHAT_RESPONSE: str = (
    "이건 의료 결정이 걸린 문제라, 사주로 수술이나 치료의 시기·여부를 말씀드리지는 않아요. "
    "그 판단은 진료하신 의사 선생님과 상의하시는 게 맞습니다.\n\n"
    "대신 이 시기의 **컨디션 흐름이나 회복에 신경 쓸 부분**은 사주로 봐드릴 수 있어요. "
    "\"요즘 체력 흐름 어때?\"처럼 물어봐 주세요."
)

# CRISIS 키워드 폴백 — 분류 LLM이 놓쳐도 반드시 잡는다
_CRISIS_KW = (
    "죽고 싶", "죽고싶", "살기 싫", "살기싫", "자살", "자해", "죽을래", "죽어버리", "죽어 버리",
    "사라지고 싶", "사라지고싶", "끝내고 싶", "끝내고싶", "목숨", "유서",
)
# OFFTOPIC 키워드 폴백 — 명백한 기술·학습 요청
_OFFTOPIC_KW = (
    "파이썬", "python", "자바스크립트", "javascript", "코드 짜", "코딩", "함수 ", "에러 해결", "버그 고쳐",
    "sql", "엑셀 수식", "번역해", "영작", "요약해줘", "수학 문제", "방정식", "미적분",
)

# MEDICAL 키워드 폴백 — 미용·성형 시술은 제외, 진짜 의료 결정만
_MEDICAL_KW = ("약 복용", "치료법", "처방", "입원", "항생제", "진통제", "항암", "방사선치료",
               "수술", "시술 받", "진단 받", "검사 결과", "약 끊", "약을 끊", "병원 가")


async def guard_and_classify(
    question: str,
    provider: str | None = None,
    history: list[dict] | None = None,
) -> tuple[str | None, str, bool]:
    """
    Guard + 카테고리 자동 분류를 LLM 호출 1회로 처리.

    Returns:
        (block_msg, category, is_instant)
        block_msg:  차단 시 경고 문구, 통과 시 None.
                    센티널: "MEDICAL"(의료 결정) · "CRISIS"(자해 위험) · "OFFTOPIC"(범위 밖)
                    — 호출자가 고정 응답(CRISIS_RESPONSE 등)으로 바꿔 보여준다
        category:   'career' | 'love' | 'money' | 'health' | 'general'
        is_instant: True면 즉시 답변 반환 (사주 분석 생략)
    """
    # 위기 키워드는 LLM 이전에 먼저 잡는다 (지연·오분류 없이 즉시)
    if any(kw in question for kw in _CRISIS_KW):
        return "CRISIS", "general", False

    system_content = _GUARD_PROMPT
    if history:
        history_text = "\n".join(
            f"{'사용자' if m.get('role') == 'user' else 'AI'}: {m.get('content', '')}"
            for m in history[-6:]  # 최근 6개만
        )
        system_content = system_content + f"\n\n[이전 대화]\n{history_text}"
    llm = get_llm(provider)
    resp = await llm.ainvoke([
        SystemMessage(content=system_content),
        HumanMessage(content=f"고민: {question}"),
    ])
    raw = (resp.content if hasattr(resp, "content") else str(resp)).strip()

    if raw.startswith("BLOCK:"):
        return raw[len("BLOCK:"):].strip(), "general", False

    if raw.strip() == "MEDICAL":
        return "MEDICAL", "health", False

    if raw.strip() == "CRISIS":
        return "CRISIS", "general", False

    if raw.strip() == "OFFTOPIC":
        return "OFFTOPIC", "general", False

    if raw.startswith("INSTANT|"):
        parts = raw.split("|", 2)
        headline = parts[1].strip() if len(parts) > 1 else "잠깐만요"
        content  = parts[2].strip() if len(parts) > 2 else headline
        return f"{headline}|||{content}", "general", True

    # OK|career 형식 파싱
    category = "general"
    if "|" in raw:
        category = raw.split("|", 1)[1].strip().lower()
        if category not in ("career", "love", "money", "health", "general"):
            category = "general"

    # LLM이 놓친 경우 키워드 폴백
    if any(kw in question for kw in _MEDICAL_KW):
        return "MEDICAL", "health", False
    if any(kw in question.lower() for kw in _OFFTOPIC_KW):
        return "OFFTOPIC", "general", False

    return None, category, False
