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

_GUARD_PROMPT = """사용자의 고민을 보고 아래 네 가지 중 하나로 분류하세요.

[BLOCK] 아래에 해당하면 차단:
- 타인의 신체 접촉·성적 행위 요청
- 범죄·폭력·불법 행위 조언 요청
- 특정인 비방·스토킹·위협

[MEDICAL] 실제 의료 결정이 필요한 상황. 아래 조건을 **모두** 충족해야 MEDICAL:
- 실제로 발생 가능한 의료 상황이어야 함
- 수술·약 복용·치료법·병원 방문 여부를 진지하게 고민하는 경우
→ "건강 운세" 질문은 OK|health.
→ 전제 자체가 비현실적이거나 농담성 질문은 MEDICAL 아님.
  예: "엉덩이가 커서 절단할까?" → 절단은 비현실적 전제 → INSTANT로 유머 처리
  예: "IBS 때문에 수술할까?" → IBS는 수술 적응증 아님 → INSTANT로 전제 교정

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
MEDICAL"""

# MEDICAL 키워드 폴백 — 미용·성형 시술은 제외, 진짜 의료 결정만
_MEDICAL_KW = ("약 복용", "치료법", "처방", "입원", "항생제", "진통제", "항암", "방사선치료")


async def guard_and_classify(
    question: str,
    provider: str | None = None,
    history: list[dict] | None = None,
) -> tuple[str | None, str, bool]:
    """
    Guard + 카테고리 자동 분류를 LLM 호출 1회로 처리.

    Returns:
        (block_msg, category, is_instant)
        block_msg:  차단 시 경고 문구, 통과 시 None
        category:   'career' | 'love' | 'money' | 'health' | 'general'
        is_instant: True면 즉시 답변 반환 (사주 분석 생략)
    """
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

    return None, category, False
