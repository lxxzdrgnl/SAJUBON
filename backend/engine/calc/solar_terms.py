"""
24절기(二十四節氣) 계산 — ephem 실시간 천문 계산
하드코딩 테이블 없이 모든 연도 지원.
"""

from __future__ import annotations
import functools
import math
from datetime import datetime, timedelta, timezone
import ephem

from engine.data.timezone_history import get_kst_offset_minutes

KST = timezone(timedelta(hours=9))

# 24절기 목록 (입춘부터 순서대로)
SOLAR_TERMS: list[dict] = [
    {"name": "입춘", "hanja": "立春", "sun_longitude": 315},
    {"name": "우수", "hanja": "雨水", "sun_longitude": 330},
    {"name": "경칩", "hanja": "驚蟄", "sun_longitude": 345},
    {"name": "춘분", "hanja": "春分", "sun_longitude": 0},
    {"name": "청명", "hanja": "淸明", "sun_longitude": 15},
    {"name": "곡우", "hanja": "穀雨", "sun_longitude": 30},
    {"name": "입하", "hanja": "立夏", "sun_longitude": 45},
    {"name": "소만", "hanja": "小滿", "sun_longitude": 60},
    {"name": "망종", "hanja": "芒種", "sun_longitude": 75},
    {"name": "하지", "hanja": "夏至", "sun_longitude": 90},
    {"name": "소서", "hanja": "小暑", "sun_longitude": 105},
    {"name": "대서", "hanja": "大暑", "sun_longitude": 120},
    {"name": "입추", "hanja": "立秋", "sun_longitude": 135},
    {"name": "처서", "hanja": "處暑", "sun_longitude": 150},
    {"name": "백로", "hanja": "白露", "sun_longitude": 165},
    {"name": "추분", "hanja": "秋分", "sun_longitude": 180},
    {"name": "한로", "hanja": "寒露", "sun_longitude": 195},
    {"name": "상강", "hanja": "霜降", "sun_longitude": 210},
    {"name": "입동", "hanja": "立冬", "sun_longitude": 225},
    {"name": "소설", "hanja": "小雪", "sun_longitude": 240},
    {"name": "대설", "hanja": "大雪", "sun_longitude": 255},
    {"name": "동지", "hanja": "冬至", "sun_longitude": 270},
    {"name": "소한", "hanja": "小寒", "sun_longitude": 285},
    {"name": "대한", "hanja": "大寒", "sun_longitude": 300},
]

TERM_NAMES: list[str] = [t["name"] for t in SOLAR_TERMS]

# 12절(節) — 월주 경계이자 대운수 계산 기준. (우수·춘분 등 12중기(中氣)는 제외)
JEOL_NAMES: frozenset[str] = frozenset(t["name"] for i, t in enumerate(SOLAR_TERMS) if i % 2 == 0)


def _ephem_date_to_datetime(ephem_date: ephem.Date) -> datetime:
    """ephem.Date → UTC datetime"""
    return ephem_date.datetime().replace(tzinfo=timezone.utc)


@functools.lru_cache(maxsize=256)
def get_solar_term_datetime(year: int, term_name: str) -> datetime:
    """특정 연도의 절기 정확한 UTC datetime 반환."""
    term = next(t for t in SOLAR_TERMS if t["name"] == term_name)
    target_lon = term["sun_longitude"]

    # 근사 시작 날짜 설정 (해당 연도 1월 1일 기준)
    start = ephem.Date(f"{year}/1/1")
    sun = ephem.Sun()

    # 이진 탐색: 태양 황경이 target_lon에 도달하는 시각
    lo = start
    hi = ephem.Date(f"{year + 1}/1/1")
    mid = (lo + hi) / 2

    for _ in range(50):
        mid = (lo + hi) / 2
        mid_date = ephem.Date(mid)
        sun.compute(mid_date)
        # 겉보기(apparent) 지심 황경 — g_ra/g_dec는 세차·장동·광행차가 반영된 값.
        # Ecliptic(sun)을 바로 쓰면 astrometric 좌표라 KASI 공식 시각과 ~10분 어긋난다.
        eq = ephem.Equatorial(sun.g_ra, sun.g_dec, epoch=mid_date)
        ecl = ephem.Ecliptic(eq)
        lon = math.degrees(float(ecl.lon)) % 360

        # 황경 차이 (원형 보정, 단위: degrees)
        diff = (lon - target_lon + 180) % 360 - 180
        if abs(diff) < 1e-5:
            break
        if diff < 0:
            lo = mid
        else:
            hi = mid

    return _ephem_date_to_datetime(ephem.Date(mid))


@functools.lru_cache(maxsize=512)
def get_solar_terms_for_year(year: int) -> list[dict]:
    """해당 연도의 24절기 목록 반환 [{name, hanja, datetime}, ...]."""
    result = []
    for term in SOLAR_TERMS:
        dt = get_solar_term_datetime(year, term["name"])
        result.append({
            "name": term["name"],
            "hanja": term["hanja"],
            "datetime": dt,
            "datetime_kst": dt.astimezone(KST),
            "sun_longitude": term["sun_longitude"],
        })
    return result


def to_utc(dt: datetime) -> datetime:
    """절기 비교용 UTC 변환.

    - naive datetime → 한국 법정 표준시(역사 테이블 반영) 벽시계 시각으로 간주해 UTC로 변환
    - aware datetime → 그대로 UTC로 변환
    (과거엔 KST 벽시계 시각에 tzinfo=UTC를 붙여 실제 UTC 절기 시각과 비교하는 바람에
     절입 전후 약 9시간 구간의 연주·월주가 어긋났다.)
    """
    if dt.tzinfo is None:
        return (dt - timedelta(minutes=get_kst_offset_minutes(dt))).replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def get_current_solar_term(dt: datetime) -> str:
    """
    주어진 datetime이 어느 절기 구간에 속하는지 반환.
    기준: 직전 절기의 datetime 이후부터 다음 절기 직전까지.
    """
    dt = to_utc(dt)

    year = dt.year
    # get_solar_terms_for_year(y)는 SOLAR_TERMS 나열 순(입춘~대한)으로 만들어지는데
    # 소한·대한은 같은 해 1월이라 리스트가 시간순이 아니다. 앞뒤 연도를 합쳐 반드시 시간순 정렬해야
    # 12월 말(동지 이후) 날짜가 리스트 끝의 1월 절기까지 훑고 내려가 '대한'으로 오판되지 않는다.
    all_terms = sorted(
        get_solar_terms_for_year(year - 1)
        + get_solar_terms_for_year(year)
        + get_solar_terms_for_year(year + 1),
        key=lambda t: t["datetime"],
    )

    current = all_terms[0]["name"]
    for term in all_terms:
        if term["datetime"] <= dt:
            current = term["name"]
        else:
            break

    return current


def get_solar_term_month_index(term_name: str) -> int:
    """
    절기명 → 월주 지지 인덱스 (0=인월, 1=묘월, ..., 11=축월).
    입춘(0)·우수(1) → 인월(0),  경칩(2)·춘분(3) → 묘월(1), ...
    """
    idx = TERM_NAMES.index(term_name)
    return idx // 2


def get_next_solar_term(dt: datetime, jeol_only: bool = False) -> dict:
    """dt 이후의 다음 절기 반환 {name, datetime}. jeol_only=True면 12절(節)만."""
    dt = to_utc(dt)

    year = dt.year
    terms = sorted(
        get_solar_terms_for_year(year) + get_solar_terms_for_year(year + 1),
        key=lambda t: t["datetime"],
    )
    for term in terms:
        if jeol_only and term["name"] not in JEOL_NAMES:
            continue
        if term["datetime"] > dt:
            return term

    raise RuntimeError(f"다음 절기를 찾을 수 없음: {dt}")


def get_previous_solar_term(dt: datetime, jeol_only: bool = False) -> dict:
    """dt 이전의 직전 절기 반환 {name, datetime}. jeol_only=True면 12절(節)만."""
    dt = to_utc(dt)

    year = dt.year
    terms = sorted(
        get_solar_terms_for_year(year - 1) + get_solar_terms_for_year(year),
        key=lambda t: t["datetime"],
    )
    prev = None
    for term in terms:
        if jeol_only and term["name"] not in JEOL_NAMES:
            continue
        if term["datetime"] < dt:
            prev = term
        else:
            break

    if prev is None:
        raise RuntimeError(f"이전 절기를 찾을 수 없음: {dt}")
    return prev
