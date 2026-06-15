"""사주 계산 API 요청/응답 Pydantic 스키마."""

from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field


# ─── 요청 ────────────────────────────────────────────────────────────────────

class SajuCalcRequest(BaseModel):
    """사주팔자 계산 요청."""

    name: str | None = Field(
        default=None,
        description="만세력 이름 (표시·운세 profile_name 용. 사주 계산엔 사용하지 않음)",
        examples=["이용재"],
    )
    birth_date: str = Field(
        description="생년월일 (YYYY-MM-DD)",
        examples=["1990-03-15"],
    )
    birth_time: str | None = Field(
        default=None,
        description="출생 시각 (HH:MM, 24시 기준). 시간 모를 경우 null — 시주(時柱) 미산출",
        examples=["14:30"],
    )
    gender: str = Field(
        description="성별. 대운 순행·역행 결정에 사용",
        examples=["male"],
        pattern="^(male|female)$",
    )
    calendar: str = Field(
        default="solar",
        description="양력(solar) 또는 음력(lunar)",
        examples=["solar"],
        pattern="^(solar|lunar)$",
    )
    is_leap_month: bool = Field(
        default=False,
        description="음력 입력 시 윤달 여부. 양력 입력 시 무시됨",
        examples=[False],
    )
    birth_longitude: float | None = Field(
        default=None,
        description="출생지 경도 (도 단위). 입력 시 진태양시 보정에 사용. 미입력 시 서울(126.97°) 적용",
        examples=[126.97],
    )
    birth_utc_offset: int | None = Field(
        default=None,
        description="출생지 UTC 오프셋 (분 단위). 해외 출생 시 필수. 한국 출생 시 생략 (역사적 KST 자동 적용)",
        examples=[None],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "birth_date": "1990-03-15",
                "birth_time": "14:30",
                "gender": "male",
                "calendar": "solar",
                "is_leap_month": False,
            }
        }
    }


# ─── 응답 서브모델 ─────────────────────────────────────────────────────────────

class ClimateVibe(BaseModel):
    """월지(月支) 기후와 일간(日干)의 관계."""

    season: str = Field(description="계절", examples=["spring"])
    temperature: str = Field(description="기온 느낌", examples=["warm"])
    humidity: str = Field(description="습도 느낌", examples=["humid"])
    month_element: str = Field(description="월지 오행", examples=["목"])
    day_element_relation: str = Field(
        description="월지 오행과 일간 오행의 관계 (생·설·극·재·비)",
        examples=["생(生)"],
    )


class MetaInfo(BaseModel):
    """계산 기준 메타 정보."""

    time_correction_minutes: int = Field(
        description="동경 135도 → 실제 경도 보정 분수 (통상 -30분)",
        examples=[-30],
    )
    applied_time: str = Field(
        description="보정 적용 후 실제 계산에 사용된 시각 (ISO 8601)",
        examples=["1990-03-15T14:00"],
    )
    timezone_note: str = Field(
        description="역사적 표준시 변경 안내 메시지",
        examples=["KST UTC+9 적용 (1961-08-10 이후)"],
    )
    gender: str = Field(examples=["male"])
    birth_date: str = Field(examples=["1990-03-15"])
    birth_time: str | None = Field(default=None, examples=["14:30"])
    calendar: str = Field(examples=["solar"])
    climate_vibe: ClimateVibe


class PillarInfo(BaseModel):
    """사주 1기둥 정보 (십성·12운성 포함)."""

    stem: str = Field(description="천간 한글", examples=["경"])
    branch: str = Field(description="지지 한글", examples=["오"])
    stem_hanja: str = Field(description="천간 한자", examples=["庚"])
    branch_hanja: str = Field(description="지지 한자", examples=["午"])
    stem_element: str = Field(description="천간 오행", examples=["금"])
    branch_element: str = Field(description="지지 오행", examples=["화"])
    yin_yang: str = Field(description="음양 (양/음)", examples=["양"])
    ganji_name: str = Field(description="간지명 (천간+지지, 예: 경오)", examples=["경오"])
    stem_ten_god: str = Field(description="천간 십성", examples=["상관"])
    branch_ten_god: str = Field(description="지지 대표 십성", examples=["편인"])
    twelve_wun: str = Field(description="12운성", examples=["목욕"])
    twelve_sin_sal: str = Field(default="", description="12신살", examples=["역마살"])


class DayMasterStrength(BaseModel):
    """일간(日干) 강약 분석."""

    level: str = Field(
        description="강약 등급 (strong/medium/weak → 신강/중화/신약)",
        examples=["medium"],
    )
    level_8: str = Field(
        description="8단계 강약 (극약/태약/신약/중화신약/중화신강/신강/태강/극왕)",
        examples=["중화신약"],
    )
    score: int = Field(description="강약 점수 (0~100)", examples=[55])
    raw_score: int = Field(description="보정 전 원점수", examples=[55])
    score_range: list[int] = Field(description="점수 해석 기준 범위", examples=[[0, 100]])
    factors: dict[str, int] = Field(
        description="항목별 점수 기여 (wol_ryeong·bigeop·inseong·seolgi 등)",
        examples=[{"wol_ryeong": 20, "bigeop": -10, "inseong": 0, "seolgi": -5}],
    )
    analysis: str = Field(
        description="강약 분석 요약 텍스트",
        examples=["월령 중립. 비겁 없음. 재관식상 많음"],
    )
    wol_ryeong: str = Field(
        description="월령(得令) 등급 (strong/medium/weak)",
        examples=["medium"],
    )
    deuk_ryeong: bool = Field(description="득령(得令) 여부", examples=[False])
    deuk_ji: bool = Field(description="득지(得地) 여부", examples=[True])
    deuk_si: bool = Field(description="득시(得時) 여부", examples=[False])
    deuk_se: bool = Field(description="득세(得勢) 여부", examples=[True])


class YongSin(BaseModel):
    """용신(用神) 정보."""

    primary: str = Field(description="주 용신 오행", examples=["수"])
    secondary: str | None = Field(
        default=None,
        description="보신 오행 (없으면 null)",
        examples=[None],
    )
    xi_sin: list[str] = Field(
        description="희신(喜神) — 일간에 유익한 오행 목록",
        examples=[["수", "목"]],
    )
    ji_sin: list[str] = Field(
        description="기신(忌神) — 일간에 해로운 오행 목록",
        examples=[["화"]],
    )
    logic_type: str = Field(
        description="용신 선정 로직 분류",
        examples=["balanced_weakest_supplement"],
    )
    yong_sin_label: str = Field(
        description="용신 종류 레이블 (억부용신/통관용신)",
        examples=["억부용신"],
    )
    reasoning_priority: str = Field(
        description="용신 선정 우선 방식 (억부/통관/조후 등)",
        examples=["억부"],
    )


class GyeokGukDerivation(BaseModel):
    """격국 도출 근거."""

    method: str = Field(examples=["dominant_ten_god"])
    dominant: str = Field(examples=["편관"])
    note: str = Field(examples=["전체 십성 분포 최다값 기준"])


class GyeokGuk(BaseModel):
    """격국(格局)."""

    type: str = Field(description="격국 코드", examples=["chil_sal"])
    name: str = Field(description="격국 이름 (한글)", examples=["칠살격"])
    hanja: str = Field(description="격국 한자", examples=["七殺格"])
    description: str = Field(
        description="격국 특성 요약",
        examples=["강한 추진력과 승부욕의 리더형"],
    )
    derivation: GyeokGukDerivation = Field(description="격국 도출 근거")


class DaeUnEntry(BaseModel):
    """대운(大運) 1구간."""

    start_age: int = Field(description="대운 시작 나이", examples=[35])
    end_age: int = Field(description="대운 종료 나이", examples=[44])
    stem: str = Field(description="대운 천간", examples=["계"])
    branch: str = Field(description="대운 지지", examples=["미"])
    stem_element: str = Field(examples=["수"])
    branch_element: str = Field(examples=["토"])
    ganji_name: str = Field(description="간지명 (천간+지지, 예: 계미)", examples=["계미"])
    stem_ten_god: str | None = Field(
        default=None,
        description="일간과의 십성 관계 (current_dae_un에만 포함)",
        examples=["편재"],
    )
    branch_ten_god: str | None = Field(
        default=None,
        description="지지 십성 (current_dae_un에만 포함)",
        examples=["비견"],
    )


class SinSalEntry(BaseModel):
    """신살(神殺) 항목."""

    name: str = Field(description="신살 이름", examples=["도화살"])
    type: str = Field(
        description="신살 종류 (lucky/neutral/unlucky/warning)",
        examples=["neutral"],
    )
    desc: str = Field(
        description="신살 설명",
        examples=["매력과 끼가 넘치며 이성에게 인기가 많음"],
    )
    reason: dict[str, Any] = Field(
        description="신살 발동 근거 (trigger 방식, 기준 지지 등)",
        examples=[{"trigger": "branch_group", "group_branches": ["오"], "도화지": "묘"}],
    )
    location: list[str] = Field(
        description="신살이 위치한 기둥 (year/month/day/hour)",
        examples=[["year", "month", "day"]],
    )
    priority: str = Field(
        description="RAG 검색 우선순위 (high/medium/low)",
        examples=["low"],
    )


class ContextItem(BaseModel):
    """컨텍스트 랭킹 항목."""

    id: str = Field(description="신살명 또는 패턴 코드", examples=["양인살"])
    type: str = Field(description="항목 종류 (sin_sal/pattern)", examples=["sin_sal"])
    score: float = Field(description="우선순위 점수 (높을수록 중요)", examples=[85.0])


class ContextRanking(BaseModel):
    """Writer Agent에 전달할 컨텍스트 우선순위."""

    primary_context: list[ContextItem] = Field(
        description="핵심 컨텍스트 (최대 3개)"
    )
    secondary_context: list[ContextItem] = Field(
        description="보조 컨텍스트 (최대 2개)"
    )


# ─── 최종 응답 ────────────────────────────────────────────────────────────────

class SajuCalcResponse(BaseModel):
    """사주팔자 전체 계산 결과."""

    # ① 메타
    meta: MetaInfo

    # ② 핵심 결론
    day_master_strength: DayMasterStrength = Field(description="일간 강약 분석")
    yong_sin: YongSin = Field(description="용신·희신·기신 정보")
    gyeok_guk: GyeokGuk = Field(description="격국 분석")

    # ③ 4기둥
    year_pillar: PillarInfo = Field(description="연주(年柱) — 조상·청소년기")
    month_pillar: PillarInfo = Field(description="월주(月柱) — 부모·청장년기")
    day_pillar: PillarInfo = Field(description="일주(日柱) — 본인·배우자")
    hour_pillar: PillarInfo | None = Field(default=None, description="시주(時柱) — 자녀·노년기. 시간 미입력 시 null")

    # ④ 오행·음양 분포
    wuxing_count: dict[str, float] = Field(
        description="오행별 비율(%) — 8글자 기준, 결핍 오행(0%)도 포함",
        examples=[{"목": 25.0, "화": 37.5, "토": 0.0, "금": 25.0, "수": 12.5}],
    )
    wuxing_count_hap: dict[str, float] = Field(
        description="육합·삼합 합화 적용 오행 비율(%)",
        examples=[{"목": 25.0, "화": 25.0, "토": 0.0, "금": 12.5, "수": 37.5}],
    )
    wuxing_chars: list[dict[str, str]] = Field(
        description="8글자 위치별 오행 [{pillar, type, element}] — 궁성 가중치 계산·RAG용",
        examples=[[{"pillar": "year", "type": "stem", "element": "목"}]],
    )
    wuxing_hap_contributions: list[dict] = Field(
        description="합화 기여 구조 [{pillar, type, hap_type, base_element, hap_element, hap_ratio}] — ratio 기반 부분합화",
        examples=[[{"pillar": "year", "type": "branch", "hap_type": "yuk_hap", "base_element": "화", "hap_element": "수", "hap_ratio": 0.35}]],
    )
    dominant_elements: list[str] = Field(
        description="강한 오행 목록",
        examples=[["화", "금"]],
    )
    weak_elements: list[str] = Field(
        description="약한 오행 목록",
        examples=[["수"]],
    )
    yin_yang_ratio: dict[str, float] = Field(
        description="음양 비율(%)",
        examples=[{"yang": 62.5, "yin": 37.5}],
    )

    # ⑤ 십성 분포
    ten_gods_distribution: dict[str, float] = Field(
        description="십성별 비율(%) — 0인 십성 제외, 합산 ~100",
        examples=[{"편관": 40.0, "비견": 20.0, "정인": 20.0, "정재": 20.0}],
    )
    ten_gods_void_info: list[dict[str, Any]] = Field(
        description="표면 십성 결핍 카테고리 + 지장간 잠재력 대조",
        examples=[[{"category": "식상", "hidden_in_ji_jang_gan": {}}]],
    )
    structure_patterns: list[dict[str, Any]] = Field(
        description="사주 구조 패턴 목록 (종격·용신격·특수격 등)",
        examples=[[{"pattern_id": "gwan_in_sang_saeng", "name": "관인상생"}]],
    )

    # ⑥ 특이사항
    gong_mang: dict[str, list[str]] = Field(
        description="공망(空亡) — 일주 기준 공망 지지 2개 + 해당 기둥",
        examples=[{"vacant_branches": ["자", "축"], "affected_pillars": ["month"]}],
    )
    sin_sals: list[SinSalEntry] = Field(description="신살 목록")
    branch_relations: dict[str, Any] = Field(
        description="지지 관계 (충·합·형·해·파). 없는 관계는 키 자체 제거됨",
        examples=[{"chung": [["자", "오"]]}],
    )
    ji_jang_gan: dict[str, list[str]] = Field(
        description="지장간(支藏干) — 각 지지에 숨겨진 천간 목록",
        examples=[{"year": ["기", "정"], "month": ["무", "병", "갑"], "day": ["기", "정"], "hour": ["무", "임", "경"]}],
    )

    # ⑦ 대운
    dae_un_start_age: int = Field(
        description="첫 대운 시작 나이 (만세력 공식 산출)",
        examples=[5],
    )
    dae_un_list: list[DaeUnEntry] = Field(description="전체 대운 목록 (10구간)")
    current_dae_un: DaeUnEntry = Field(description="현재 진행 중인 대운 (십성 정보 포함)")

    # ⑧ 동역학
    dynamics: dict[str, Any] = Field(
        description=(
            "기둥 간 동역학 — "
            "stem_hap(천간합), rooting_map(통근), active_relations(활성 지지 관계), energy_flow(오행 흐름)"
        ),
    )

    # ⑨ 시너지
    synergy: list[dict[str, Any]] = Field(
        description="구조 패턴 × 동역학 교차점 — Writer Agent 추가 해석 힌트 리스트",
        examples=[[{"pattern_id": "gwan_in_sang_saeng", "dynamics_key": "branch:yuk_hap", "synergy_tags": ["harmonious_institution_fit"]}]],
    )

    # ⑩ 행동 프로파일
    behavior_profile: list[str] = Field(
        description="십성 분포 → 원자적 행동 벡터 태그 목록 (RAG 쿼리 seed)",
        examples=[["pressure_activation", "results_at_all_costs", "crisis_leadership"]],
    )

    # ⑪ 컨텍스트 랭킹
    context_ranking: ContextRanking = Field(
        description="Writer에게 전달할 핵심·보조 컨텍스트 우선순위"
    )

    # ⑫ 생활 도메인
    life_domains: dict[str, list[str]] = Field(
        description="연애·직업·재물·성격 도메인별 핵심 행동 태그 (Writer Agent RAG 쿼리 seed)",
        examples=[{
            "career": ["pressure_activation", "crisis_leadership"],
            "relationship": [],
            "wealth": ["results_at_all_costs"],
            "personality": ["pressure_activation", "creative_expression"],
        }],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "meta": {
                    "time_correction_minutes": -30,
                    "applied_time": "1990-03-15T14:00",
                    "timezone_note": "KST UTC+9 적용 (1961-08-10 이후)",
                    "gender": "male",
                    "birth_date": "1990-03-15",
                    "birth_time": "14:30",
                    "calendar": "solar",
                    "climate_vibe": {
                        "season": "spring",
                        "temperature": "warm",
                        "humidity": "humid",
                        "month_element": "목",
                        "day_element_relation": "생(生)",
                    },
                },
                "day_master_strength": {
                    "level": "medium",
                    "level_8": "중화신약",
                    "score": 55,
                    "raw_score": 55,
                    "score_range": [0, 100],
                    "factors": {"wol_ryeong": 20, "bigeop": -10, "inseong": 0, "seolgi": -5},
                    "analysis": "월령 중립. 비겁 없음. 재관식상 많음",
                    "wol_ryeong": "medium",
                    "deuk_ryeong": False,
                    "deuk_ji": True,
                    "deuk_si": False,
                    "deuk_se": True,
                },
                "yong_sin": {
                    "primary": "수",
                    "secondary": None,
                    "xi_sin": ["수", "목"],
                    "ji_sin": ["화"],
                    "logic_type": "balanced_weakest_supplement",
                    "yong_sin_label": "통관용신",
                    "reasoning_priority": "억부",
                },
                "gyeok_guk": {
                    "type": "chil_sal",
                    "name": "칠살격",
                    "hanja": "七殺格",
                    "description": "강한 추진력과 승부욕의 리더형",
                    "derivation": {
                        "method": "dominant_ten_god",
                        "dominant": "편관",
                        "note": "전체 십성 분포 최다값 기준",
                    },
                },
                "year_pillar": {
                    "stem": "경", "branch": "오",
                    "stem_hanja": "庚", "branch_hanja": "午",
                    "stem_element": "금", "branch_element": "화",
                    "yin_yang": "양", "ganji_name": "경오",
                    "stem_ten_god": "상관",
                    "branch_ten_god": "편인",
                    "twelve_wun": "목욕",
                },
                "month_pillar": {
                    "stem": "갑", "branch": "인",
                    "stem_hanja": "甲", "branch_hanja": "寅",
                    "stem_element": "목", "branch_element": "목",
                    "yin_yang": "양", "ganji_name": "갑인",
                    "stem_ten_god": "편재",
                    "branch_ten_god": "편재",
                    "twelve_wun": "절",
                },
                "day_pillar": {
                    "stem": "신", "branch": "묘",
                    "stem_hanja": "辛", "branch_hanja": "卯",
                    "stem_element": "금", "branch_element": "목",
                    "yin_yang": "음", "ganji_name": "신묘",
                    "stem_ten_god": "비견",
                    "branch_ten_god": "편재",
                    "twelve_wun": "태",
                },
                "hour_pillar": {
                    "stem": "병", "branch": "신",
                    "stem_hanja": "丙", "branch_hanja": "申",
                    "stem_element": "화", "branch_element": "금",
                    "yin_yang": "양", "ganji_name": "병신",
                    "stem_ten_god": "편관",
                    "branch_ten_god": "비견",
                    "twelve_wun": "장생",
                },
                "wuxing_count": {"목": 37.5, "화": 12.5, "토": 0.0, "금": 37.5, "수": 12.5},
                "dominant_elements": ["목", "금"],
                "weak_elements": ["토", "수"],
                "yin_yang_ratio": {"yang": 62.5, "yin": 37.5},
                "ten_gods_distribution": {"편관": 40.0, "비견": 20.0, "정인": 20.0, "편재": 20.0},
                "ten_gods_void_info": [{"category": "식상", "hidden_in_ji_jang_gan": {}}],
                "structure_patterns": [{"pattern_id": "gwan_in_sang_saeng", "name": "관인상생", "strength": "high"}],
                "gong_mang": {"vacant_branches": ["자", "축"], "affected_pillars": ["month"]},
                "sin_sals": [
                    {
                        "name": "도화살",
                        "type": "neutral",
                        "desc": "매력과 끼가 넘치며 이성에게 인기가 많음",
                        "reason": {"trigger": "branch_group", "group_branches": ["오"], "도화지": "묘"},
                        "location": ["year", "month", "day"],
                        "priority": "low",
                    },
                    {
                        "name": "양인살",
                        "type": "warning",
                        "desc": "강렬한 추진력, 충동적 결단력, 과잉 에너지",
                        "reason": {"trigger": "day_stem", "day_stem": "신", "양인지": "유"},
                        "location": ["hour"],
                        "priority": "high",
                    },
                ],
                "branch_relations": {
                    "yuk_hap": [{"pair": ["묘", "술"], "result": "화", "is_effective": True, "interference_factors": []}],
                },
                "ji_jang_gan": {
                    "year": ["기", "정"],
                    "month": ["무", "병", "갑"],
                    "day": ["을"],
                    "hour": ["무", "임", "경"],
                },
                "dae_un_start_age": 5,
                "dae_un_list": [
                    {"start_age": 5, "end_age": 14, "stem": "을", "branch": "묘", "stem_element": "목", "branch_element": "목", "ganji_name": "을묘"},
                    {"start_age": 15, "end_age": 24, "stem": "병", "branch": "진", "stem_element": "화", "branch_element": "토", "ganji_name": "병진"},
                    {"start_age": 25, "end_age": 34, "stem": "정", "branch": "사", "stem_element": "화", "branch_element": "화", "ganji_name": "정사"},
                    {"start_age": 35, "end_age": 44, "stem": "계", "branch": "미", "stem_element": "수", "branch_element": "토", "ganji_name": "계미"},
                ],
                "current_dae_un": {
                    "start_age": 35, "end_age": 44,
                    "stem": "계", "branch": "미",
                    "stem_element": "수", "branch_element": "토",
                    "ganji_name": "계미",
                    "stem_ten_god": "편재", "branch_ten_god": "비견",
                },
                "dynamics": {
                    "stem_hap": [],
                    "rooting_map": {"신": ["신", "유"]},
                    "active_relations": [{"type": "yuk_hap", "branches": ["묘", "술"]}],
                    "energy_flow": "목→화",
                },
                "synergy": [
                    {
                        "pattern_id": "gwan_in_sang_saeng",
                        "dynamics_key": "branch:yuk_hap",
                        "synergy_tags": ["harmonious_institution_fit", "effortless_promotion"],
                    }
                ],
                "behavior_profile": ["pressure_activation", "results_at_all_costs", "crisis_leadership"],
                "context_ranking": {
                    "primary_context": [
                        {"id": "양인살", "type": "sin_sal", "score": 85.0},
                        {"id": "gwan_in_sang_saeng", "type": "pattern", "score": 80.0},
                        {"id": "sig_sin_je_sal", "type": "pattern", "score": 65.0},
                    ],
                    "secondary_context": [
                        {"id": "sang_gwan_pae_in", "type": "pattern", "score": 60.0},
                    ],
                },
                "life_domains": {
                    "career": ["pressure_activation", "results_at_all_costs", "crisis_leadership"],
                    "relationship": [],
                    "wealth": ["results_at_all_costs"],
                    "personality": ["pressure_activation", "crisis_leadership", "creative_expression"],
                },
            }
        }
    }
