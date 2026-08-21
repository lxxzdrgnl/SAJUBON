"""오늘의 운세 Wrapped 스토리 API 스키마 — 공통 API 계약 기준 (Phase 3)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from schemas.saju import SajuCalcRequest

# kind=category 카드의 category_key 및 엔진 카테고리 키
CATEGORY_KEYS = ("exam", "money", "love", "career", "health", "social")

# "color"는 구버전 저장 스냅샷 호환용 (신규 생성은 action)
StoryCardKind = Literal["intro", "overall", "category", "caution", "action", "color", "summary"]


class StoryCard(BaseModel):
    """스토리 카드 1장 — intro → overall → category×6 → caution → action → summary."""

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


class DailyShareRequest(BaseModel):
    """운세 공유 생성 요청 — story 스냅샷 또는 record_id 중 하나.

    - record_id: 이미 저장된 내 기록을 공유 (소유자, 토큰 재사용).
    - story: 스토리 스냅샷을 그대로 저장 (게스트 포함). birth_input은 선택.
    """

    story: DailyStoryResponse | None = Field(
        default=None, description="공유할 스토리 스냅샷"
    )
    birth_input: SajuCalcRequest | None = Field(
        default=None, description="만세력 입력 (birth_hash 계산용, 선택)"
    )
    record_id: int | None = Field(
        default=None, description="기존 저장 기록 id (소유자 공유)"
    )

    @model_validator(mode="after")
    def _require_one(self) -> "DailyShareRequest":
        if self.story is None and self.record_id is None:
            raise ValueError("story 또는 record_id 중 하나는 필수입니다.")
        return self


class DailyShareResponse(BaseModel):
    """운세 공유 생성 응답."""

    share_token: str = Field(description="추측 불가 짧은 공유 토큰")
    share_url: str = Field(description="공개 공유 URL")
