"""
테이블명 → {domain, trust} 분류 룰.

spec §2.1 (계산·참조 → None)·§2.2 (도메인 매핑)·§2.3 (trust)를 코드화.

도메인 목록:
  saju           사주 분석
  compatibility  궁합
  jamidusu       자미두수
  juyeok         주역
  tojung         토정비결
  dream          태몽·꿈해몽
  fengshui       풍수
  naming         작명
  tarot          타로
  misc           기타 점술 (별자리·MBTI·띠 등)

trust 값:
  classical      정통 고전 문체 (J계열 전체 + S045~056)
  ai_generated   AI 생성 추정 (그 외)

반환 None → 계산·참조 테이블 (RAG 인제스트 제외)
"""

from __future__ import annotations

# ─── 계산·참조 테이블 (§2.1) ────────────────────────────────────
# 이름 기반 exact match 또는 prefix
_LOOKUP_EXACT: frozenset[str] = frozenset({
    "LunarToSolar",
    "mansedata",
    "manse_data",
    "namedata",
    "surioheng",
    "tojung_gabja",
    "yukim_720",
    "juyek_6hyo",
    "toC_yongsin_01",
    "toC_manse_sub",
})

_LOOKUP_PREFIX: tuple[str, ...] = ()  # 현재 없음


def _table_num(name: str) -> int | None:
    """테이블명에서 숫자 부분을 추출. S087 → 87, F007 → 7."""
    import re
    m = re.search(r"\d+", name)
    return int(m.group()) if m else None


# ─── 도메인 분류 룰 ──────────────────────────────────────────────

def classify_table(table_name: str) -> dict | None:
    """
    테이블명 → {"domain": ..., "trust": ...} 반환.
    계산·참조 테이블이면 None 반환.
    """
    # 1. 계산·참조 테이블 제외 (§2.1)
    if table_name in _LOOKUP_EXACT:
        return None
    for prefix in _LOOKUP_PREFIX:
        if table_name.startswith(prefix):
            return None

    prefix = table_name[:1].upper() if table_name else ""
    num = _table_num(table_name)

    # ── S 계열 (사주) ──────────────────────────────────────────
    if table_name.startswith("S"):
        # §2.3: S045~056는 고전 문체
        if num is not None and 45 <= num <= 56:
            trust = "classical"
        else:
            trust = "ai_generated"
        return {"domain": "saju", "trust": trust}

    # ── G 계열 (궁합) ──────────────────────────────────────────
    if table_name.startswith("G"):
        return {"domain": "compatibility", "trust": "ai_generated"}

    # ── J 계열 (자미두수 / 주역 / 토정비결 등) ─────────────────
    if table_name.startswith("J"):
        if num is not None:
            # §2.2: J004~010 주역 64괘
            if 4 <= num <= 10:
                return {"domain": "juyeok", "trust": "classical"}
            # §2.2: J017~030 자미두수
            if 17 <= num <= 30:
                return {"domain": "jamidusu", "trust": "classical"}
            # §2.2: J036~044 토정비결 괘사
            if 36 <= num <= 44:
                return {"domain": "tojung", "trust": "classical"}
            # J033, J045~052 등 기타 — spec 미명시, classical로 처리 (J계열 전체 고전 문체)
            return {"domain": "misc", "trust": "classical"}
        return {"domain": "misc", "trust": "classical"}

    # ── F 계열 (꿈·풍수) ───────────────────────────────────────
    if table_name.startswith("F"):
        if num is not None:
            # §2.2: F007 태몽, F020 꿈해몽
            if num in (7, 20):
                return {"domain": "dream", "trust": "ai_generated"}
            # §2.2: F011, F012, F022 풍수
            if num in (11, 12, 22):
                return {"domain": "fengshui", "trust": "ai_generated"}
        # F013, F019, F022_R, F024, F033, F034 등 기타
        return {"domain": "misc", "trust": "ai_generated"}

    # ── N 계열 (작명) ───────────────────────────────────────────
    if table_name.startswith("N"):
        if num is not None:
            # §2.2: N002~005, N015 작명 격국
            if num in (2, 3, 4, 5, 15):
                return {"domain": "naming", "trust": "ai_generated"}
        # N008~014 등 기타 N계열
        return {"domain": "naming", "trust": "ai_generated"}

    # ── T 계열 (타로) ───────────────────────────────────────────
    if table_name.startswith("T"):
        return {"domain": "tarot", "trust": "ai_generated"}

    # ── Y 계열 (연간 운세 등 기타) ────────────────────────────
    if table_name.startswith("Y"):
        return {"domain": "saju", "trust": "ai_generated"}

    # ── 기본: misc ──────────────────────────────────────────────
    return {"domain": "misc", "trust": "ai_generated"}
