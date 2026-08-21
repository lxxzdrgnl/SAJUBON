"""
사주 계산 단위 테스트.
검증 기준: 1990-03-15 14:30 남성 양력 → 경오일주 포함 여부
"""


from engine.handlers.calculate_saju import handle_calculate_saju
from engine.calc.ten_gods import calculate_ten_god
from engine.calc.validation import validate_birth_input, ValidationError
import pytest


BIRTH = dict(
    birth_date="1990-03-15",
    birth_time="14:30",
    gender="male",
    calendar="solar",
)


class TestSajuPillars:
    def test_returns_four_pillars(self):
        result = handle_calculate_saju(**BIRTH)
        assert "year_pillar" in result
        assert "month_pillar" in result
        assert "day_pillar" in result
        assert "hour_pillar" in result

    def test_pillar_has_required_keys(self):
        result = handle_calculate_saju(**BIRTH)
        for key in ["year_pillar", "month_pillar", "day_pillar", "hour_pillar"]:
            p = result[key]
            assert "stem" in p
            assert "branch" in p
            assert "stem_element" in p
            assert "branch_element" in p

    def test_wuxing_count_sums_to_hundred(self):
        result = handle_calculate_saju(**BIRTH)
        total = sum(result["wuxing_count"].values())
        assert abs(total - 100.0) < 0.1

    def test_sin_sals_is_list(self):
        result = handle_calculate_saju(**BIRTH)
        assert isinstance(result["sin_sals"], list)

    def test_gyeok_guk_present(self):
        result = handle_calculate_saju(**BIRTH)
        assert "type" in result["gyeok_guk"]
        assert "name" in result["gyeok_guk"]

    def test_yong_sin_has_primary(self):
        result = handle_calculate_saju(**BIRTH)
        assert result["yong_sin"]["primary"] in ["목", "화", "토", "금", "수"]


class TestTenGods:
    def test_same_element_same_yy(self):
        # 갑(목,양) vs 갑(목,양) → 비견
        assert calculate_ten_god("갑", "갑") == "비견"

    def test_same_element_diff_yy(self):
        # 갑(목,양) vs 을(목,음) → 겁재
        assert calculate_ten_god("갑", "을") == "겁재"

    def test_generates_same_yy(self):
        # 갑(목,양) → 화 생 → 병(화,양) → 식신
        assert calculate_ten_god("갑", "병") == "식신"

    def test_controls_diff_yy(self):
        # 갑(목,양) 극 토 → 기(토,음) → 정재
        assert calculate_ten_god("갑", "기") == "정재"



class TestValidation:
    def test_invalid_date_format(self):
        with pytest.raises(ValidationError):
            validate_birth_input("1990/03/15", "14:30", "male")

    def test_invalid_year(self):
        with pytest.raises(ValidationError):
            validate_birth_input("1800-01-01", "12:00", "male")

    def test_invalid_gender(self):
        with pytest.raises(ValidationError):
            validate_birth_input("1990-03-15", "14:30", "other")

    def test_valid_input_passes(self):
        validate_birth_input("1990-03-15", "14:30", "male", "solar")


# ─── 절입(節入) 경계 회귀 테스트 ─────────────────────────────
# KASI 공식: 2024 입춘 02-04 17:27, 경칩 03-05 11:23 (KST)

@pytest.mark.parametrize("date,time,year,month", [
    ("2024-02-04", "12:00", "계묘", "을축"),   # 입춘 전 → 전년 연주·축월
    ("2024-02-04", "18:00", "갑진", "병인"),   # 입춘 후
    ("2024-03-05", "08:00", "갑진", "병인"),   # 경칩 전 → 아직 인월
    ("2024-03-05", "13:00", "갑진", "정묘"),   # 경칩 후
    ("2024-01-03", "12:00", "계묘", "갑자"),   # 1월 초: 동지 구간도 전년 연주
    ("2023-12-31", "23:00", "계묘", "갑자"),   # 연말
])
def test_solar_term_boundary_pillars(date, time, year, month):
    from engine.calc.saju import calculate_saju
    s = calculate_saju(date, time, "male")
    assert s["year_pillar"]["ganji_name"] == year
    assert s["month_pillar"]["ganji_name"] == month


def test_solar_term_time_matches_kasi():
    """겉보기 황경 기준 절기 시각이 KASI 공식 시각과 2분 이내."""
    from datetime import datetime, timedelta, timezone
    from engine.calc.solar_terms import get_solar_term_datetime
    kst = timezone(timedelta(hours=9))
    cases = {
        ("입춘", 2024): datetime(2024, 2, 4, 17, 27, tzinfo=kst),
        ("하지", 2024): datetime(2024, 6, 21, 5, 51, tzinfo=kst),
        ("동지", 2024): datetime(2024, 12, 21, 18, 21, tzinfo=kst),
    }
    for (name, year), expected in cases.items():
        got = get_solar_term_datetime(year, name)
        assert abs((got - expected).total_seconds()) < 120, (name, got.astimezone(kst))


def test_dae_un_uses_jeol_not_junggi():
    """대운수는 12절(節) 기준 — 1990-05-15 14:30 양남 순행: 다음 절은 망종(6/6), 중기 소만(5/21)이 아님 → 약 22일/3 ≈ 7."""
    from engine.calc.saju import calculate_saju
    from engine.calc.dae_un import calculate_dae_un
    s = calculate_saju("1990-05-15", "14:30", "male")
    d = calculate_dae_un(s)
    assert d[0]["start_age"] == 7
    assert d[0]["ganji_name"] == "임오"
