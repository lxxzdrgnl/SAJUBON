"""궁합 엔진 단위 테스트 — Task 3."""

from engine.calc.saju import calculate_saju
from engine.calc.compatibility import check_compatibility


def _calc(d, t, g):
    return calculate_saju(d, t, g, "solar", False)


def test_compatibility_keys_present():
    r = check_compatibility(
        _calc("1990-03-15", "14:30", "male"),
        _calc("1992-07-21", "09:00", "female"),
    )
    for k in [
        "total_score",
        "day_pillar_score",
        "element_harmony_score",
        "branch_relation_score",
        "ten_gods_score",
        "conflict_branches",
        "complement_a_to_b",
        "complement_b_to_a",
    ]:
        assert k in r, f"key '{k}' missing from check_compatibility result"
    assert 0 <= r["total_score"] <= 100
    # 오행조화 점수가 정상 분포에서 0으로 깔리던 버그 회귀 방지
    assert r["element_harmony_score"] > 0
    assert 0 <= r["element_harmony_score"] <= 100


def test_complement_elements_backward_compat():
    """기존 complement_elements 키가 여전히 존재해야 한다."""
    r = check_compatibility(
        _calc("1990-03-15", "14:30", "male"),
        _calc("1992-07-21", "09:00", "female"),
    )
    assert "complement_elements" in r


def test_ten_gods_score_range():
    """십성 점수는 _TEN_GOD_HARMONY 값 범위 안에 있어야 한다 (45~85)."""
    r = check_compatibility(
        _calc("1990-03-15", "14:30", "male"),
        _calc("1992-07-21", "09:00", "female"),
    )
    assert 45 <= r["ten_gods_score"] <= 85


def test_complement_bidirectional_types():
    """complement_a_to_b / complement_b_to_a 는 list 타입."""
    r = check_compatibility(
        _calc("1985-01-01", "06:00", "male"),
        _calc("1990-06-15", "12:00", "female"),
    )
    assert isinstance(r["complement_a_to_b"], list)
    assert isinstance(r["complement_b_to_a"], list)
