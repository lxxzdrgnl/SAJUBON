"""궁합 리포트 스키마 인스턴스화 테스트."""

from __future__ import annotations
import pytest
from schemas.compatibility import (
    BirthInput,
    CompatibilityScore,
    CompatibilitySynastry,
    CompatibilityTab,
    CompatibilityReportRequest,
    CompatibilityReportSummary,
    CompatibilityReportDetail,
    CompatibilityShareRequest,
    CompatibilityShareResponse,
)
from llm.reports.base import ReportTab


def _birth_a() -> BirthInput:
    return BirthInput(birth_date="1990-03-15", birth_time="14:30", gender="male")


def _birth_b() -> BirthInput:
    return BirthInput(birth_date="1992-07-21", birth_time="09:00", gender="female")


def _score() -> CompatibilityScore:
    return CompatibilityScore(total=80, day_pillar=70, element_harmony=85, branch_relation=75, ten_gods=80)


def _synastry() -> CompatibilitySynastry:
    return CompatibilitySynastry(
        stem_hap="토",
        day_ten_god="정재",
        element_synergy="상생",
        clash_pairs=[["인", "신"]],
        complement_a_to_b=["수"],
        complement_b_to_a=["목"],
        yongsin_help="a_helps_b",
        interaction_tags=["stem_hap_토", "element_complement"],
    )


def test_birth_input_defaults():
    b = BirthInput(birth_date="1990-01-01", gender="male")
    assert b.calendar == "solar"
    assert b.is_leap_month is False
    assert b.name is None
    assert b.birth_time is None


def test_birth_input_with_name():
    b = BirthInput(name="홍길동", birth_date="1990-01-01", gender="female")
    assert b.name == "홍길동"


def test_birth_input_gender_validation():
    with pytest.raises(Exception):
        BirthInput(birth_date="1990-01-01", gender="other")


def test_compatibility_score():
    s = _score()
    assert s.total == 80
    assert s.day_pillar == 70
    assert s.element_harmony == 85
    assert s.branch_relation == 75
    assert s.ten_gods == 80


def test_compatibility_synastry_defaults():
    s = CompatibilitySynastry(day_ten_god="정재")
    assert s.stem_hap is None
    assert s.element_synergy is None
    assert s.clash_pairs == []
    assert s.complement_a_to_b == []
    assert s.complement_b_to_a == []
    assert s.yongsin_help is None
    assert s.interaction_tags == []


def test_compatibility_synastry_full():
    s = _synastry()
    assert s.stem_hap == "토"
    assert s.day_ten_god == "정재"
    assert s.yongsin_help == "a_helps_b"
    assert ["인", "신"] in s.clash_pairs


def test_compatibility_tab_is_report_tab():
    """CompatibilityTab은 ReportTab의 별칭이어야 한다."""
    assert CompatibilityTab is ReportTab


def test_compatibility_tab_defaults():
    t = CompatibilityTab(category="종합 케미", headline="물과 나무처럼 서로를 키우는 관계", content="...")
    assert t.requested is False


def test_compatibility_tab_requested():
    t = CompatibilityTab(category="결혼 시기", headline="내년 봄이 적기", content="...", requested=True)
    assert t.requested is True


def test_compatibility_report_request_minimal():
    req = CompatibilityReportRequest(person_a=_birth_a(), person_b=_birth_b())
    assert req.language == "ko"
    assert req.request_topics is None


def test_compatibility_report_request_full():
    req = CompatibilityReportRequest(
        person_a=_birth_a(),
        person_b=_birth_b(),
        request_topics="결혼 시기,갈등 해소법",
        language="ko",
    )
    assert req.request_topics == "결혼 시기,갈등 해소법"


def test_compatibility_report_detail():
    detail = CompatibilityReportDetail(
        id=1,
        person_a=_birth_a(),
        person_b=_birth_b(),
        score=_score(),
        synastry=_synastry(),
        tabs=[CompatibilityTab(category="종합 케미", headline="좋은 궁합", content="...")],
        request_topics=None,
        language="ko",
        created_at="2026-06-13T00:00:00",
    )
    assert detail.id == 1
    assert len(detail.tabs) == 1


def test_compatibility_share_request_default():
    req = CompatibilityShareRequest()
    assert req.mask_birth is False


def test_compatibility_share_request_masked():
    req = CompatibilityShareRequest(mask_birth=True)
    assert req.mask_birth is True
