"""궁합 리포트 API 요청/응답 Pydantic 스키마."""

from __future__ import annotations
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
from llm.reports.base import ReportTab

# ─── BirthInput ───────────────────────────────────────────────────────────────

class BirthInput(BaseModel):
    """궁합 리포트용 사람 입력 — 이름 포함."""

    name: str | None = Field(default=None, description="이름 (목록·공유에 표기)")
    birth_date: str = Field(description="생년월일 (YYYY-MM-DD)", examples=["1990-03-15"])
    birth_time: str | None = Field(
        default=None,
        description="출생 시각 (HH:MM). 시간 모를 경우 null",
        examples=["14:30"],
    )
    gender: str = Field(
        description="성별 (male | female)",
        examples=["male"],
        pattern="^(male|female)$",
    )
    calendar: str = Field(
        default="solar",
        description="양력(solar) 또는 음력(lunar)",
        pattern="^(solar|lunar)$",
    )
    is_leap_month: bool = Field(default=False, description="음력 윤달 여부")
    birth_longitude: float | None = Field(
        default=None,
        description="출생지 경도. 미입력 시 서울(126.97°) 적용",
    )
    birth_utc_offset: int | None = Field(
        default=None,
        description="출생지 UTC 오프셋 (분 단위)",
    )


# ─── 점수 오버뷰 ──────────────────────────────────────────────────────────────

class CompatibilityScore(BaseModel):
    """check_compatibility 기반 점수 (시각 오버뷰용)."""

    total: int = Field(description="종합 점수 (0~100)", examples=[97])
    day_pillar: int = Field(description="일주 조화도")
    element_harmony: int = Field(description="오행 조화도")
    branch_relation: int = Field(description="지지 관계 점수")
    ten_gods: int = Field(description="십성 관계 점수")


# ─── 방향성 신호 ──────────────────────────────────────────────────────────────

class CompatibilitySynastry(BaseModel):
    """synastry_for_report 기반 방향성 신호 (서술 + 흐름 다이어그램)."""

    stem_hap: str | None = Field(default=None, description="천간합화 오행 (예: 수)")
    day_ten_god: str = Field(description="A 기준 B 일간의 십성 (예: 정재)")
    element_synergy: str | None = Field(
        default=None,
        description="A일간→B일간 방향 (상생 | 상극 | 동기)",
    )
    clash_pairs: list[list[str]] = Field(
        default_factory=list,
        description="지지충 쌍 목록",
    )
    complement_a_to_b: list[str] = Field(
        default_factory=list,
        description="A가 B의 결핍을 채워주는 오행",
    )
    complement_b_to_a: list[str] = Field(
        default_factory=list,
        description="B가 A의 결핍을 채워주는 오행",
    )
    yongsin_help: str | None = Field(
        default=None,
        description="용신 보완 방향 (b_helps_a | a_helps_b | mutual | None)",
    )
    interaction_tags: list[str] = Field(
        default_factory=list,
        description="RAG 쿼리 seed 태그",
    )


# ─── 탭 (ReportTab 별칭) ──────────────────────────────────────────────────────

# spec §6: CompatibilityTab = ReportTab 재사용
CompatibilityTab = ReportTab


# ─── 리포트 요청/응답 ─────────────────────────────────────────────────────────

class CompatibilityReportRequest(BaseModel):
    """POST /api/compatibility — 궁합 리포트 생성 요청."""

    person_a: BirthInput = Field(description="사람 A 입력")
    person_b: BirthInput = Field(description="사람 B 입력")
    request_topics: str | None = Field(
        default=None,
        description="추가로 보고 싶은 주제 (쉼표 구분). 없으면 null",
        examples=["결혼 시기, 갈등 해소법"],
    )
    language: str = Field(default="ko", description="리포트 언어 (현재 ko 고정)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "person_a": {
                    "name": "이용재",
                    "birth_date": "1990-03-15",
                    "birth_time": "14:30",
                    "gender": "male",
                },
                "person_b": {
                    "name": "유다연",
                    "birth_date": "1992-07-21",
                    "birth_time": "09:00",
                    "gender": "female",
                },
                "request_topics": "결혼 시기",
            }
        }
    }


class CompatibilityReportSummary(BaseModel):
    """GET /api/compatibility — 목록 항목."""

    id: int
    person_a_name: str | None = Field(description="사람 A 이름")
    person_b_name: str | None = Field(description="사람 B 이름")
    total_score: int = Field(description="종합 점수")
    request_topics: str | None
    created_at: str

    model_config = {"from_attributes": True}


class CompatibilityReportDetail(BaseModel):
    """GET /api/compatibility/{id} — 단건 전체."""

    id: int
    person_a: BirthInput
    person_b: BirthInput
    score: CompatibilityScore
    synastry: CompatibilitySynastry
    tabs: list[CompatibilityTab]
    request_topics: str | None
    language: str
    created_at: str

    model_config = {"from_attributes": True}


# ─── 공유 ────────────────────────────────────────────────────────────────────

class CompatibilityShareRequest(BaseModel):
    """POST /api/compatibility/{id}/share — 공유 토큰 발급 요청."""

    mask_birth: bool = Field(default=False, description="생년월일·시각 마스킹 여부")


class CompatibilityShareResponse(BaseModel):
    """공유 토큰 발급 응답."""

    share_token: UUID
    share_url: str
