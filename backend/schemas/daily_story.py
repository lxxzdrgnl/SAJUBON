"""오늘의 운세 Wrapped 스토리 API 스키마 — 공통 API 계약 기준 (Phase 3)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from schemas.saju import SajuCalcRequest

# kind=category 카드의 category_key 및 엔진 카테고리 키
CATEGORY_KEYS = ("exam", "money", "love", "career", "health", "social")

StoryCardKind = Literal["intro", "overall", "category", "caution", "color", "summary"]


class StoryCard(BaseModel):
    """스토리 카드 1장 — intro → overall → category×6 → caution → color → summary."""

    kind: StoryCardKind = Field(description="카드 종류")
    category_key: str | None = Field(
        default=None,
        description="kind=category일 때 카테고리 키 (exam|money|love|career|health|social)",
    )
    title: str = Field(description="질문 라벨 — '오늘의 금전운'")
    score: int | None = Field(
        default=None, description="overall·category 카드만 (0~100)"
    )
    headline: str = Field(description="큰 문구 — '지갑 열되 큰 건 멈춰'")
    body: str = Field(description="1~2문장 반말 본문")


class DailyStoryResponse(BaseModel):
    """오늘의 운세 스토리 응답."""

    date: str = Field(description="운세 날짜 (YYYY-MM-DD)")
    day_ganji: dict = Field(description="오늘 일진 간지 {stem, branch}")
    profile_name: str = Field(description="만세력 이름 (게스트면 빈 문자열)")
    cards: list[StoryCard] = Field(description="카드 11장")
    scores: dict[str, int] = Field(description="요약 바 렌더용 {exam: 87, ...}")
    keyword: str = Field(description="오늘의 키워드 — 요약 카드 타이포")
    record_id: int | None = Field(
        default=None, description="로그인 시 저장 레코드 id"
    )
    rewritten: bool = Field(
        description="GPT 리라이트 성공 여부 (false = 템플릿 폴백)"
    )


class DailyStoryRequest(BaseModel):
    """스토리 생성 요청 — 만세력 입력 + 사용자 로컬 날짜."""

    birth_input: SajuCalcRequest = Field(description="만세력 입력")
    date: str = Field(
        description="사용자 로컬 날짜 (YYYY-MM-DD)", examples=["2026-06-13"]
    )
    language: str = Field(default="ko", description="언어")


class DailyRecordSummary(BaseModel):
    """마이 운세 기록 목록 항목."""

    id: int
    date: str
    profile_name: str
    keyword: str
