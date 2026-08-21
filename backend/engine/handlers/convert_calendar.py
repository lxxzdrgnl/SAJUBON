from engine.calc.calendar_converter import convert_calendar as _convert
from engine.calc.validation import validate_birth_input, ValidationError
from engine.calc.solar_terms import get_current_solar_term
from datetime import datetime


def handle_convert_calendar(
    date: str,
    from_calendar: str,
    to_calendar: str,
    is_leap_month: bool = False,
) -> dict:
    """양력 ↔ 음력 변환 + 절기명 반환."""
    result = _convert(date, from_calendar, to_calendar, is_leap_month)

    # 양력 날짜 기준 현재 절기 추가
    solar = date if from_calendar == "solar" else result["converted_date"]
    y, m, d = map(int, solar.split("-"))
    dt = datetime(y, m, d, 12, 0)  # KST 정오 (naive → solar_terms가 KST로 해석)
    result["solar_term"] = get_current_solar_term(dt)

    return result
