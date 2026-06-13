"""리포트용 synastry 방향성 신호 셰이퍼 단위 테스트 — Task 4."""

from engine.calc.saju import calculate_saju
from engine.calc.synastry import synastry_for_report, compute_synastry


def test_synastry_report_shape():
    c1 = calculate_saju("1990-03-15", "14:30", "male", "solar", False)
    c2 = calculate_saju("1992-07-21", "09:00", "female", "solar", False)
    r = synastry_for_report(c1, c2)
    for k in [
        "stem_hap",
        "day_ten_god",
        "element_synergy",
        "clash_pairs",
        "complement_a_to_b",
        "complement_b_to_a",
        "yongsin_help",
        "interaction_tags",
    ]:
        assert k in r, f"key '{k}' missing from synastry_for_report result"
    assert r["yongsin_help"] in (None, "a_helps_b", "b_helps_a", "mutual")


def test_synastry_report_complement_types():
    """보완 오행 키는 list 타입이어야 한다."""
    c1 = calculate_saju("1990-03-15", "14:30", "male", "solar", False)
    c2 = calculate_saju("1992-07-21", "09:00", "female", "solar", False)
    r = synastry_for_report(c1, c2)
    assert isinstance(r["complement_a_to_b"], list)
    assert isinstance(r["complement_b_to_a"], list)


def test_compute_synastry_unchanged():
    """기존 compute_synastry 반환 형태가 깨지지 않아야 한다."""
    c1 = calculate_saju("1990-03-15", "14:30", "male", "solar", False)
    c2 = calculate_saju("1992-07-21", "09:00", "female", "solar", False)
    r = compute_synastry(c1, c2)
    for k in ["interaction_tags", "stem_hap", "day_ten_god", "clash_pairs", "element_synergy"]:
        assert k in r, f"key '{k}' missing from compute_synastry result"


def test_yongsin_help_none_when_no_yongsin():
    """yong_sin 없는 raw calculate_saju 결과로 호출하면 yongsin_help=None."""
    c1 = calculate_saju("1990-03-15", "14:30", "male", "solar", False)
    c2 = calculate_saju("1992-07-21", "09:00", "female", "solar", False)
    # raw calculate_saju 결과에는 yong_sin 없음 → yongsin_help=None
    r = synastry_for_report(c1, c2)
    assert r["yongsin_help"] is None
