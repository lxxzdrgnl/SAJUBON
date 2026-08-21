"""
지지(地支) 정적 데이터
자·축·인·묘·진·사·오·미·신·유·술·해 — 12개
+ 지장간(支藏干), 삼합(三合), 삼형(三刑), 육해(六害), 충(沖), 육합(六合)
"""
from typing import Callable, Any

EARTHLY_BRANCHES: list[dict] = [
    {"korean": "자", "hanja": "子", "element": "수", "yin_yang": "양", "animal": "쥐",  "month": 11, "direction": "북",   "index": 0},
    {"korean": "축", "hanja": "丑", "element": "토", "yin_yang": "음", "animal": "소",  "month": 12, "direction": "북북동", "index": 1},
    {"korean": "인", "hanja": "寅", "element": "목", "yin_yang": "양", "animal": "호랑이", "month": 1, "direction": "동북동", "index": 2},
    {"korean": "묘", "hanja": "卯", "element": "목", "yin_yang": "음", "animal": "토끼", "month": 2, "direction": "동",   "index": 3},
    {"korean": "진", "hanja": "辰", "element": "토", "yin_yang": "양", "animal": "용",  "month": 3, "direction": "동남동", "index": 4},
    {"korean": "사", "hanja": "巳", "element": "화", "yin_yang": "음", "animal": "뱀",  "month": 4, "direction": "남남동", "index": 5},
    {"korean": "오", "hanja": "午", "element": "화", "yin_yang": "양", "animal": "말",  "month": 5, "direction": "남",   "index": 6},
    {"korean": "미", "hanja": "未", "element": "토", "yin_yang": "음", "animal": "양",  "month": 6, "direction": "남남서", "index": 7},
    {"korean": "신", "hanja": "申", "element": "금", "yin_yang": "양", "animal": "원숭이", "month": 7, "direction": "서남서", "index": 8},
    {"korean": "유", "hanja": "酉", "element": "금", "yin_yang": "음", "animal": "닭",  "month": 8, "direction": "서",   "index": 9},
    {"korean": "술", "hanja": "戌", "element": "토", "yin_yang": "양", "animal": "개",  "month": 9, "direction": "서북서", "index": 10},
    {"korean": "해", "hanja": "亥", "element": "수", "yin_yang": "음", "animal": "돼지", "month": 10, "direction": "북북서", "index": 11},
]

# O(1) 조회용 dict
BRANCHES_BY_INDEX: dict[int, dict] = {b["index"]: b for b in EARTHLY_BRANCHES}
BRANCHES_BY_KOREAN: dict[str, dict] = {b["korean"]: b for b in EARTHLY_BRANCHES}

# 순서 리스트 (인덱스 계산용)
BRANCHES_ORDER: list[str] = [b["korean"] for b in EARTHLY_BRANCHES]

# ──────────────────────────────────────────
# 지장간(支藏干) — 지지 안에 숨은 천간
# primary: 정기(正氣), secondary: 중기(中氣), residual: 여기(餘氣)
# ──────────────────────────────────────────
# 지장간 (표준 월률분야): primary=정기(본기) · secondary=중기 · residual=여기
JI_JANG_GAN: dict[str, dict] = {
    "자": {"primary": "계",  "residual": "임"},
    "축": {"primary": "기",  "secondary": "신", "residual": "계"},
    "인": {"primary": "갑",  "secondary": "병", "residual": "무"},
    "묘": {"primary": "을",  "residual": "갑"},
    "진": {"primary": "무",  "secondary": "계", "residual": "을"},
    "사": {"primary": "병",  "secondary": "경", "residual": "무"},
    "오": {"primary": "정",  "secondary": "기", "residual": "병"},
    "미": {"primary": "기",  "secondary": "을", "residual": "정"},
    "신": {"primary": "경",  "secondary": "임", "residual": "무"},
    "유": {"primary": "신",  "residual": "경"},
    "술": {"primary": "무",  "secondary": "정", "residual": "신"},
    "해": {"primary": "임",  "secondary": "갑", "residual": "무"},
}

# ──────────────────────────────────────────
# 삼합(三合) — 3지지가 모이면 해당 오행으로 화국
# ──────────────────────────────────────────
SAM_HAP: dict[str, dict] = {
    "수국": {"branches": ["신", "자", "진"], "element": "수", "name": "신자진 수국"},
    "목국": {"branches": ["해", "묘", "미"], "element": "목", "name": "해묘미 목국"},
    "화국": {"branches": ["인", "오", "술"], "element": "화", "name": "인오술 화국"},
    "금국": {"branches": ["사", "유", "축"], "element": "금", "name": "사유축 금국"},
}

# ──────────────────────────────────────────
# 육합(六合) — 2지지가 합하여 오행 변화
# ──────────────────────────────────────────
YUK_HAP: list[dict] = [
    {"pair": ("자", "축"), "element": "토"},
    {"pair": ("인", "해"), "element": "목"},
    {"pair": ("묘", "술"), "element": "화"},
    {"pair": ("진", "유"), "element": "금"},
    {"pair": ("사", "신"), "element": "수"},
    {"pair": ("오", "미"), "element": "토"},
]

# ──────────────────────────────────────────
# 충(沖) — 서로 마주보며 충돌하는 쌍 (6쌍)
# ──────────────────────────────────────────
CHUNG_PAIRS: list[tuple] = [
    ("자", "오"),
    ("축", "미"),
    ("인", "신"),
    ("묘", "유"),
    ("진", "술"),
    ("사", "해"),
]

# ──────────────────────────────────────────
# 삼형(三刑) — 형벌 관계
# ──────────────────────────────────────────
SAM_HYEONG: dict[str, list] = {
    "무은지형": ["인", "사", "신"],   # 은의를 모르는 형
    "지세지형": ["축", "술", "미"],   # 세력을 믿는 형
    "무례지형": ["자", "묘"],          # 무례한 형
    "자형_진":  ["진", "진"],          # 자기 자신을 형
    "자형_오":  ["오", "오"],
    "자형_유":  ["유", "유"],
    "자형_해":  ["해", "해"],
}

# ──────────────────────────────────────────
# 육해(六害) — 서로 방해하는 쌍
# ──────────────────────────────────────────
YUK_HAE: list[tuple] = [
    ("자", "미"),
    ("축", "오"),
    ("인", "사"),
    ("묘", "진"),
    ("신", "해"),
    ("유", "술"),
]

# ──────────────────────────────────────────
# 방합(方合) — 같은 방위 3지지: 목/화/금/수 방합
# ──────────────────────────────────────────
BANG_HAP: dict[str, dict] = {
    "인묘진": {"branches": ["인", "묘", "진"], "element": "목", "name": "인묘진 방합"},
    "사오미": {"branches": ["사", "오", "미"], "element": "화", "name": "사오미 방합"},
    "신유술": {"branches": ["신", "유", "술"], "element": "금", "name": "신유술 방합"},
    "해자축": {"branches": ["해", "자", "축"], "element": "수", "name": "해자축 방합"},
}

# ──────────────────────────────────────────
# 원진(怨嗔) — 서로 원망하는 6쌍
# ──────────────────────────────────────────
WON_JIN_PAIRS: list[tuple] = [
    ("자", "미"),
    ("축", "오"),
    ("인", "유"),
    ("묘", "신"),
    ("진", "해"),
    ("사", "술"),
]

# ──────────────────────────────────────────
# 파(破) — 서로 방해·파괴하는 6쌍
# ──────────────────────────────────────────
PA_PAIRS: list[tuple] = [
    ("자", "유"),
    ("축", "진"),
    ("인", "해"),
    ("사", "신"),
    ("오", "묘"),
    ("술", "미"),
]

# ──────────────────────────────────────────
# 공망(空亡) — 일주(천간+지지)의 순(旬) 기준 빈 지지 쌍
# 갑자순→술해 · 갑술순→신유 · 갑신순→오미 · 갑오순→진사 · 갑진순→인묘 · 갑인순→자축
# (지지만으로는 결정되지 않는다 — 병인일은 갑자순이라 술해, 갑인일은 갑인순이라 자축)
# ──────────────────────────────────────────
def get_gong_mang(day_stem: str, day_branch: str) -> list[str]:
    """일주 기준 공망 지지 2개 반환."""
    from engine.data.heavenly_stems import STEMS_BY_KOREAN
    s_idx = STEMS_BY_KOREAN[day_stem]["index"]
    b_idx = BRANCHES_BY_KOREAN[day_branch]["index"]
    start = (b_idx - s_idx) % 12
    return [BRANCHES_ORDER[(start + 10) % 12], BRANCHES_ORDER[(start + 11) % 12]]


def get_branch_by_index(index: int) -> dict:
    """인덱스로 지지 조회 (음수·범위 초과 자동 보정)"""
    return BRANCHES_BY_INDEX[index % 12]


def get_branch_by_korean(korean: str) -> dict:
    return BRANCHES_BY_KOREAN[korean]


def get_ji_jang_gan(branch: str) -> list[str]:
    """지지에서 지장간 천간 목록 반환 (여기→중기→정기 순)"""
    jjg = JI_JANG_GAN[branch]
    result = []
    if "residual" in jjg:
        result.append(jjg["residual"])
    if "secondary" in jjg:
        result.append(jjg["secondary"])
    result.append(jjg["primary"])
    return result


# ──────────────────────────────────────────
# 공통 헬퍼 — Registry/Strategy 패턴
# ──────────────────────────────────────────

def _resolve_labels(labels: list[str] | None, branches: list[str]) -> list[str]:
    return labels if labels is not None else [str(i) for i in range(len(branches))]


def _find_pair_entries(
    branches: list[str],
    labels: list[str],
    pairs: list,
    *,
    get_pair: "Callable[[Any], tuple]" = lambda x: x,
    get_extra: "Callable[[Any], dict]" = lambda x: {},
) -> list[dict]:
    """쌍(pair) 기반 관계 검사 공통 로직.
    동일 쌍이 여러 기둥 조합에 걸쳐 성립하면 각각 별도 항목으로 반환.
    """
    result = []
    for item in pairs:
        a, b = get_pair(item)
        a_pos = [labels[i] for i, br in enumerate(branches) if br == a]
        b_pos = [labels[i] for i, br in enumerate(branches) if br == b]
        for al in a_pos:
            for bl in b_pos:
                result.append({"pair": (a, b), "pillars": [al, bl], **get_extra(item)})
    return result


def _check_group_hap(branches: list[str], hap_table: dict) -> list[dict]:
    """3지지 합(삼합·방합) 공통 검사 로직: 완합(3개) / 반합(2개)."""
    branch_set = set(branches)
    results = []
    for _, data in hap_table.items():
        present = [b for b in data["branches"] if b in branch_set]
        if len(present) == 3:
            results.append({
                "name": data["name"], "element": data["element"],
                "label": data["name"], "branches": data["branches"], "type": "완합",
            })
        elif len(present) == 2:
            results.append({
                "name": f"{''.join(present)}반합",
                "element": data["element"],
                "label": f"{''.join(present)}반합 ({data['name']})",
                "branches": present, "type": "반합",
            })
    return results


# ── 공개 check 함수들 (Registry: 각 관계 유형별 전략) ──────────────────────

def check_sam_hap(branches: list[str]) -> list[dict]:
    """삼합/반합 확인."""
    return _check_group_hap(branches, SAM_HAP)


def check_bang_hap(branches: list[str]) -> list[dict]:
    """방합/방합반합 확인."""
    return _check_group_hap(branches, BANG_HAP)


def check_yuk_hap(branches: list[str], labels: list[str] | None = None) -> list[dict]:
    """육합 확인 (합화 오행 포함)."""
    return _find_pair_entries(
        branches, _resolve_labels(labels, branches), YUK_HAP,
        get_pair=lambda x: x["pair"],
        get_extra=lambda x: {"element": x["element"]},
    )


def check_chung(branches: list[str], labels: list[str] | None = None) -> list[dict]:
    """충 확인."""
    return _find_pair_entries(branches, _resolve_labels(labels, branches), CHUNG_PAIRS)


def check_yuk_hae(branches: list[str], labels: list[str] | None = None) -> list[dict]:
    """육해 확인."""
    return _find_pair_entries(branches, _resolve_labels(labels, branches), YUK_HAE)


def check_pa(branches: list[str], labels: list[str] | None = None) -> list[dict]:
    """파 확인."""
    return _find_pair_entries(branches, _resolve_labels(labels, branches), PA_PAIRS)


def check_won_jin(branches: list[str], labels: list[str] | None = None) -> list[dict]:
    """원진 확인."""
    return _find_pair_entries(branches, _resolve_labels(labels, branches), WON_JIN_PAIRS)


def check_sam_hyeong(branches: list[str]) -> list[str]:
    """삼형 확인. 해당되는 형 이름 목록 반환."""
    branch_set = set(branches)
    result = []
    for name, members in SAM_HYEONG.items():
        if name.startswith("자형"):
            if branches.count(members[0]) >= 2:
                result.append(name)
        elif all(m in branch_set for m in members):
            result.append(name)
    return result


def check_gong_mang(day_stem: str, day_branch: str, branches: list[str]) -> list[str]:
    """공망 확인. 일주(천간+지지) 기준 공망인 지지 목록 반환"""
    gong_mang = get_gong_mang(day_stem, day_branch)
    return [b for b in branches if b in gong_mang]


def analyze_branch_relations(branches: list[str], day_branch: str, labels: list[str] | None = None, day_stem: str | None = None) -> dict:
    """4기둥 지지 전체 관계 종합 분석"""
    return {
        "sam_hap":    check_sam_hap(branches),
        "bang_hap":   check_bang_hap(branches),
        "yuk_hap":    check_yuk_hap(branches, labels),
        "chung":      check_chung(branches, labels),
        "pa":         check_pa(branches, labels),
        "sam_hyeong": check_sam_hyeong(branches),
        "yuk_hae":    check_yuk_hae(branches, labels),
        "won_jin":    check_won_jin(branches, labels),
        "gong_mang":  check_gong_mang(day_stem, day_branch, branches) if day_stem else [],
    }
