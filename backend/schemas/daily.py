"""오늘의 운세 API 요청/응답 Pydantic 스키마."""

from __future__ import annotations
from pydantic import BaseModel, Field
from schemas.saju import SajuCalcRequest


class DailyFortuneRequest(SajuCalcRequest):
    """오늘의 운세 요청 — SajuCalcRequest + 선택적 날짜."""

    target_date: str | None = Field(
        default=None,
        description="운세 날짜 (YYYY-MM-DD). 미입력 시 오늘",
        examples=["2026-03-15"],
    )


class FortuneItem(BaseModel):
    """카테고리 하나의 운세 결과."""

    score: int  = Field(description="운세 점수 (0~100)", examples=[72])
    level: str  = Field(description="점수 구간 레벨", examples=["좋음"])
    text:  str  = Field(description="카테고리 설명 텍스트")
    label: str  = Field(description="카테고리 한글명", examples=["시험운"])
    headline: str = Field(default="", description="점수대별 일상어 헤드라인 (리라이트 폴백)", examples=["머리가 잘 돌아가는 날"])


class DailyGanji(BaseModel):
    stem:   str = Field(description="오늘 천간", examples=["병"])
    branch: str = Field(description="오늘 지지", examples=["오"])


class FortuneSignal(BaseModel):
    """오늘 운세의 명리 근거 신호 1개 (천간 합충·12운성·신살·공망)."""

    key:   str = Field(description="신호 키", examples=["do_hwa"])
    label: str = Field(description="짧은 라벨", examples=["도화"])
    tone:  str = Field(description="good | bad | neutral")
    desc:  str = Field(description="한 줄 근거 설명")


class GoodHour(BaseModel):
    """오늘 움직이기 좋은 시진."""

    branch:  str = Field(description="시진 지지", examples=["사"])
    label:   str = Field(description="시간대 라벨 (진태양시 보정)", examples=["오전 9시 반~11시 반"])
    element: str = Field(description="시진 오행", examples=["화"])


class ActionHint(BaseModel):
    """오늘의 한 수 — 신호 우선순위로 고른 구체 행동 1개."""

    headline:   str = Field(description="행동 한 마디")
    body:       str = Field(description="이유 + 팁 (길시 포함)")
    good_hours: list[GoodHour] = Field(default_factory=list)


class BirthDayPillar(BaseModel):
    stem:         str = Field(description="일주 천간", examples=["임"])
    branch:       str = Field(description="일주 지지", examples=["자"])
    stem_element: str = Field(description="일주 천간 오행", examples=["수"])


class DailyFortuneResponse(BaseModel):
    """오늘의 운세 응답."""

    target_date:      str            = Field(description="운세 날짜", examples=["2026-03-15"])
    day_ganji:        DailyGanji     = Field(description="오늘 일진 간지")
    overall:          str            = Field(description="전체 요약 한 문장")
    caution:          str            = Field(description="오늘 조심해야 할 것")
    basis:            str            = Field(description="오늘 운세의 명리 근거 요약")
    day_summary:      str            = Field(default="", description="일진 카드용 일상어 요약 (용어 없음)")
    signals:          list[FortuneSignal] = Field(default_factory=list, description="구조화 근거 신호")
    good_hours:       list[GoodHour]      = Field(default_factory=list, description="움직이기 좋은 시진")
    action:           ActionHint          = Field(description="오늘의 한 수")
    fortunes:         dict[str, FortuneItem] = Field(
        description="카테고리별 운세 (exam/money/love/career/health/social)"
    )
    birth_day_pillar: BirthDayPillar = Field(description="생일 기준 일주 (프로필 저장용)")
