"""리포트·공유 API 요청/응답 Pydantic 스키마."""

from __future__ import annotations
from uuid import UUID
from pydantic import BaseModel, Field
from schemas.saju import SajuCalcRequest, SajuCalcResponse


# ─── 공통 입력 ───────────────────────────────────────────────────────────────

class BirthRequest(BaseModel):
    birth_date: str       # "YYYY-MM-DD"
    birth_time: str       # "HH:MM"
    gender: str           # "male" | "female"
    calendar: str = "solar"
    is_leap_month: bool = False


class CompatibilityRequest(BaseModel):
    person1: BirthRequest
    person2: BirthRequest


class DailyRequest(BirthRequest):
    pass


class QuestionRequest(BirthRequest):
    question: str


# ─── 사주 리포트 ─────────────────────────────────────────────────────────────

class SajuReportRequest(SajuCalcRequest):
    """사주 리포트 생성 요청."""

    concern: str | None = Field(
        default=None,
        description="사용자 고민 원문. 입력하면 고민 맞춤 탭이 생성됩니다.",
        examples=["이직을 고민 중인데 지금이 적기일까요?"],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "birth_date": "1990-03-15",
                "birth_time": "14:30",
                "gender": "male",
                "calendar": "solar",
                "is_leap_month": False,
                "concern": "이직을 고민 중인데 지금이 적기일까요?",
            }
        }
    }


class TabContent(BaseModel):
    """리포트 탭 1개."""

    category: str = Field(
        default="",
        description="짧은 태그 — '성격'·'재물'·'연애' 등 기본 카테고리명 또는 사용자가 요청한 주제명",
        examples=["재물"],
    )
    headline: str = Field(
        description="결론형 헤드라인 — 단순 카테고리명이 아닌 이 사람만을 위한 문장",
        examples=["30대 중반, 바위 틈에서 물이 솟구치듯 재물이 터질 팔자"],
    )
    content: str = Field(
        description="상세 내용 — 비유→근거→조언 3단 구성, 문단 사이 빈 줄, 탭당 3~4문단",
        examples=["신금(辛金) 일간은 원석을 정련한 보석과 같아..."],
    )
    requested: bool = Field(
        default=False,
        description="사용자가 추가로 요청한 주제 탭이면 true",
    )


class WriterOutput(BaseModel):
    """Writer LLM 최종 출력 스키마."""
    tabs: list[TabContent]


# ─── 올해의 흐름 · 대운 해설 ──────────────────────────────────────────────────

class YearFlowMonth(BaseModel):
    """올해의 흐름 — 월 1개."""
    month: int = Field(description="월 (1~12)", examples=[1])
    keyword: str = Field(description="2~4자 명사형 키워드", examples=["전환점"])
    memo: str = Field(description="한 문장 메모", examples=["새 인연이 들어오는 달입니다."])


class YearFlow(BaseModel):
    """올해의 흐름 전체."""
    year: int = Field(description="대상 연도", examples=[2026])
    first_half: str = Field(description="상반기 요약 2~3문장")
    second_half: str = Field(description="하반기 요약 2~3문장")
    months: list[YearFlowMonth] = Field(description="12개월 흐름")


class DaeUnPeriod(BaseModel):
    """대운 한 구간(현재/다음)."""
    ganji: str = Field(description="대운 간지", examples=["을해"])
    period: str = Field(description="기간 표기", examples=["현재 ~2035"])
    text: str = Field(description="해당 대운 해설 1문단")


class DaeUnAnalysis(BaseModel):
    """대운 비교 분석."""
    current: DaeUnPeriod
    next: DaeUnPeriod
    caution: str = Field(description="주의점 1문단")


class UnFlowOutput(BaseModel):
    """올해의 흐름·대운 해설 LLM 출력 스키마."""
    year_flow: YearFlow
    dae_un_analysis: DaeUnAnalysis


# ─── 저장 리포트 API 계약 (POST/GET /api/reports, 공유) ──────────────────────

class ReportBirthInput(SajuCalcRequest):
    """리포트용 만세력 입력 — SajuCalcRequest + 대상 이름(목록·공유 표기용)."""

    name: str | None = Field(default=None, description="대상 이름 (목록·공유에 표기)")


class ReportCreateRequest(BaseModel):
    """POST /api/reports — 리포트 생성+저장 요청."""

    birth_input: ReportBirthInput = Field(description="만세력 입력 (SajuCalcRequest 형태 + name)")
    request_topics: str | None = Field(
        default=None,
        description="추가로 보고 싶은 주제 (쉼표 구분, 각각 별도 탭). 없으면 null",
        examples=["이직 시기, 부모님 건강"],
    )
    profile_id: int | None = Field(default=None, description="저장된 만세력 ID (선택)")
    language: str = Field(default="ko", description="리포트 언어 (현재 ko 고정)")


class ReportSummary(BaseModel):
    """GET /api/reports — 목록 항목."""

    id: int
    first_headline: str = Field(description="첫 탭 헤드라인")
    profile_name: str = Field(description="birth_input.name")
    request_topics: str | None
    created_at: str

    model_config = {"from_attributes": True}


class ReportDetail(ReportSummary):
    """GET /api/reports/{id} — 단건 전체."""

    birth_input: dict = Field(description="만세력 입력 (마스킹 시 birth_date·birth_time이 null)")
    language: str
    tabs: list[TabContent] = Field(description="10개 + 요청 주제 수만큼")
    year_flow: YearFlow
    dae_un_analysis: DaeUnAnalysis


class ReportShareRequest(BaseModel):
    """POST /api/reports/{id}/share — 공유 토큰 발급 요청."""

    mask_birth: bool = Field(default=False, description="생년월일·시각 마스킹 여부")


class ReportShareResponse(BaseModel):
    """공유 토큰 발급 응답."""

    share_token: UUID
    share_url: str


class SajuReportResponse(BaseModel):
    """사주 리포트 전체 응답."""

    saju: SajuCalcResponse = Field(description="사주팔자 계산 원본 결과")
    tabs: list[TabContent] = Field(description="AI 생성 결론형 탭 목록 (10개 내외)")
    concern: str | None = Field(default=None, description="입력된 고민 원문")


# ─── 공유 링크 ────────────────────────────────────────────────────────────────

class ReportResponse(BaseModel):
    """기존 공유 링크용 응답 (호환성 유지)."""
    share_token: UUID
    feature: str
    tabs: list[TabContent]
