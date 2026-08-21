"""
calculate_saju MCP tool 핸들러.
"""

from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timedelta
from engine.calc.saju import calculate_saju as _calc
from engine.calc.ten_gods import generate_ten_gods_list, calculate_ten_gods_distribution, calculate_ten_god, get_branch_ten_god
from engine.calc.sin_sal import find_sin_sals, find_twelve_sin_sals_per_pillar
from engine.calc.day_master_strength import analyze_day_master_strength
from engine.calc.gyeok_guk import determine_gyeok_guk
from engine.calc.yong_sin import select_yong_sin
from engine.calc.dae_un import calculate_dae_un
from engine.calc.twelve_wun import get_twelve_wun
from engine.calc.validation import validate_birth_input
from engine.data.heavenly_stems import STEMS_BY_KOREAN
from engine.data.timezone_history import (
    get_solar_correction_minutes, get_historical_note,
    get_solar_correction_for_location,
)
from engine.data.wuxing import WUXING_GENERATION, WUXING_DESTRUCTION
from engine.data.earthly_branches import SAM_HYEONG as _SAM_HYEONG
from engine.data.earthly_branches import BRANCHES_ORDER as _BRANCHES_ORDER
from engine.data.earthly_branches import BRANCHES_BY_KOREAN as _BRANCHES_BY_KOREAN
from engine.analysis.structure_patterns import detect_structure_patterns
from engine.analysis.dynamics import build_dynamics
from engine.analysis.synergy import compute_synergy_tags
from engine.analysis.behavior_synthesizer import synthesize_behavior_profile
from engine.analysis.context_ranker import rank_context
from engine.analysis.life_domain_mapper import map_life_domains

# sin_sal type → priority
_SAL_PRIORITY: dict[str, str] = {
    "lucky": "medium",
    "neutral": "low",
    "unlucky": "high",
    "warning": "high",
}


def handle_calculate_saju(
    birth_date: str,
    birth_time: str | None,
    gender: str,
    calendar: str = "solar",
    is_leap_month: bool = False,
    birth_longitude: float | None = None,
    birth_utc_offset: int | None = None,
) -> dict:
    """
    사주팔자 전체 계산 — Pipeline 패턴.
    각 단계의 결과가 다음 단계의 입력으로 연결됨.
    """
    validate_birth_input(birth_date, birth_time, gender, calendar)

    # 1. 4기둥 계산
    saju = _calc(birth_date, birth_time, gender, calendar, is_leap_month)
    day_stem = saju["day_pillar"]["stem"]

    # 2. 각 기둥에 십성 + 12운성 추가
    ten_gods_list = generate_ten_gods_list(saju)
    twelve_sin_sal = find_twelve_sin_sals_per_pillar(saju)
    pillars_enriched = {}
    _pillar_pairs = [("year_pillar", "year"), ("month_pillar", "month"), ("day_pillar", "day")]
    if saju.get("hour_pillar") is not None:
        _pillar_pairs.append(("hour_pillar", "hour"))
    for i, (key, short) in enumerate(_pillar_pairs):
        p = saju[key]
        pillars_enriched[key] = {
            **p,
            "stem_ten_god": ten_gods_list[i],
            "branch_ten_god": get_branch_ten_god(day_stem, p["branch"]),
            "twelve_wun": get_twelve_wun(day_stem, p["branch"]),  # 일간 기준 (자좌 아님)
            "twelve_sin_sal": twelve_sin_sal.get(short, ""),
        }
    pillars_enriched["hour_pillar"] = pillars_enriched.get("hour_pillar")  # None if unknown

    # ── 파이프라인 앞단: 합화 탐지 → 십성/강약은 합화 반영 단 1회 계산 ────────
    # branch_rel: 필터링 + yuk_hap is_effective 선제 계산
    branch_rel = {k: v for k, v in saju["branch_relations"].items() if v and k != "gong_mang"}
    _interference_sets: dict[str, set[str]] = {
        "chung": {b for item in saju["branch_relations"].get("chung", []) for b in item["pair"]},
        "hyung": {b for name in saju["branch_relations"].get("sam_hyeong", []) for b in _SAM_HYEONG.get(name, [])},
        "hae":   {b for item in saju["branch_relations"].get("yuk_hae", []) for b in item["pair"]},
    }
    if "yuk_hap" in branch_rel:
        def _yuk_hap_entry(h: dict) -> dict:
            pair = h["pair"]
            found = [t for t, s in _interference_sets.items() if any(b in s for b in pair)]
            broken = "chung" in found
            return {**h, "is_effective": not broken, "interference_factors": found}
        branch_rel["yuk_hap"] = [_yuk_hap_entry(h) for h in branch_rel["yuk_hap"]]

    # 오행 분포 퍼센트
    _wuxing_total = sum(saju["wuxing_count"].values())
    wuxing_pct = (
        {k: round(v / _wuxing_total * 100, 1) for k, v in saju["wuxing_count"].items()}
        if _wuxing_total > 0 else saju["wuxing_count"]
    )

    # 기둥 순서 + dynamics (천간합·통근·오행흐름)
    _pillar_order = [p for p in ["year", "month", "day", "hour"] if saju.get(f"{p}_pillar") is not None]
    _dynamics = build_dynamics(saju, branch_rel, wuxing_pct)

    # 기둥별 오행 목록 (base, 합화 없음)
    _wuxing_chars: list[dict] = []
    for _p in _pillar_order:
        _pk = f"{_p}_pillar"
        _wuxing_chars.append({"pillar": _p, "type": "stem",   "element": saju[_pk]["stem_element"]})
        _wuxing_chars.append({"pillar": _p, "type": "branch", "element": saju[_pk]["branch_element"]})

    # 합화 override 생성 (합 강도 + 천간 유인력 + 조건부 월지 cap)
    _HAP_EL_STEMS: dict[str, set] = {
        "목": {"갑", "을"}, "화": {"병", "정"},
        "토": {"무", "기"}, "금": {"경", "신"}, "수": {"임", "계"},
    }
    _all_stems = {saju[_k]["stem"] for _k in ["year_pillar", "month_pillar", "day_pillar", "hour_pillar"] if saju.get(_k)}

    # 육합 기둥별 base (월지는 계절 기준이므로 연/시보다 약간 크게)
    _YUK_HAP_BASE: dict[str, float] = {
        "year_pillar": 0.15, "month_pillar": 0.20,
        "day_pillar":  0.20, "hour_pillar":  0.15,
    }

    def _branch_hap_ratio(hap_type: str, hap_subtype: str, result_el: str, pillar_key: str) -> float:
        if hap_type == "sam_hap":
            base = 0.30 if hap_subtype == "반합" else (0.45 if hap_subtype == "방합" else 0.50)
            _stem_attract = 0.30
        else:  # yuk_hap — 삼합보다 약하게, 기둥 위치별 차등
            base = _YUK_HAP_BASE.get(pillar_key, 0.15)
            _stem_attract = 0.20
        _has_stem = bool(_HAP_EL_STEMS.get(result_el, set()) & _all_stems)
        if _has_stem:
            base += _stem_attract
        if pillar_key == "month_pillar":
            _full_combo = hap_subtype in ("삼합", "방합")
            base = min(base, 0.80 if (_full_combo and _has_stem) else 0.50)
        return min(base, 1.0)

    def _stem_hap_ratio(result_el: str) -> float:
        """천간합화: 항상 화하는 것이 아님 → 0.45"""
        return 0.45

    _branch_to_pillars: dict[str, list[str]] = {}
    for _p in _pillar_order:
        _branch_to_pillars.setdefault(saju[f"{_p}_pillar"]["branch"], []).append(f"{_p}_pillar")

    # (element, ratio, hap_type) — hap_type은 contributions의 hap_type 필드에 사용
    _hap_branch_overrides: dict[str, tuple[str, float, str]] = {}
    for _sam in branch_rel.get("sam_hap", []):
        _result_el = _sam.get("element", "")
        _hap_subtype = _sam.get("type", "삼합")
        for _br in _sam.get("branches", []):
            for _pk in _branch_to_pillars.get(_br, []):
                if _result_el == saju[_pk]["branch_element"]:
                    continue
                _ratio = _branch_hap_ratio("sam_hap", _hap_subtype, _result_el, _pk)
                if _ratio > _hap_branch_overrides.get(_pk, ("", 0.0, ""))[1]:
                    _hap_branch_overrides[_pk] = (_result_el, _ratio, "sam_hap")
    for _yuk in branch_rel.get("yuk_hap", []):
        if not _yuk.get("is_effective", True):
            continue
        _result_el = _yuk.get("element", "")
        for _br in _yuk.get("pair", []):
            for _pk in _branch_to_pillars.get(_br, []):
                if _result_el == saju[_pk]["branch_element"]:
                    continue
                _ratio = _branch_hap_ratio("yuk_hap", "", _result_el, _pk)
                if _ratio > _hap_branch_overrides.get(_pk, ("", 0.0, ""))[1]:
                    _hap_branch_overrides[_pk] = (_result_el, _ratio, "yuk_hap")

    _hap_stem_overrides: dict[str, tuple[str, float]] = {}
    for _sh in _dynamics.get("stem_hap", []):
        for _pl in _sh["pillars"]:
            if _pl != "day":
                _el = _sh["result_element"]
                _pk = f"{_pl}_pillar"
                _ratio = _stem_hap_ratio(_el)
                if _ratio > _hap_stem_overrides.get(_pk, ("", 0.0))[1]:
                    _hap_stem_overrides[_pk] = (_el, _ratio)

    # overrides 완성 후 처리 ─────────────────────────────────────

    # ① wuxing_hap_contributions + pct (단일 루프, defaultdict)
    _wuxing_hap_contributions: list[dict] = []
    _hap_pct_counts: defaultdict[str, float] = defaultdict(float)
    for _p in _pillar_order:
        _pk = f"{_p}_pillar"
        # 천간
        s_el = saju[_pk]["stem_element"]
        stem_ov = _hap_stem_overrides.get(_pk)
        _wuxing_hap_contributions.append({
            "pillar": _p, "type": "stem",
            "hap_type":     "stem_hap" if stem_ov else None,
            "base_element": s_el,
            "hap_element":  stem_ov[0] if stem_ov else None,
            "hap_ratio":    stem_ov[1] if stem_ov else 0.0,
        })
        if stem_ov:
            _hap_pct_counts[stem_ov[0]] += stem_ov[1]
            _hap_pct_counts[s_el]       += 1.0 - stem_ov[1]
        else:
            _hap_pct_counts[s_el] += 1.0
        # 지지
        b_el = saju[_pk]["branch_element"]
        branch_ov = _hap_branch_overrides.get(_pk)
        _wuxing_hap_contributions.append({
            "pillar": _p, "type": "branch",
            "hap_type":     branch_ov[2] if branch_ov else None,
            "base_element": b_el,
            "hap_element":  branch_ov[0] if branch_ov else None,
            "hap_ratio":    branch_ov[1] if branch_ov else 0.0,
        })
        if branch_ov:
            _hap_pct_counts[branch_ov[0]] += branch_ov[1]
            _hap_pct_counts[b_el]         += 1.0 - branch_ov[1]
        else:
            _hap_pct_counts[b_el] += 1.0

    _hap_total = sum(_hap_pct_counts.values())
    wuxing_hap_pct = (
        {k: round(max(0.0, v) / _hap_total * 100, 1) for k, v in _hap_pct_counts.items()}
        if _hap_total else dict(_hap_pct_counts)
    )

    # ② branch_rel hap 항목에 pillar_ratios 삽입 — loop으로 overwrite 방지
    for _yuk in branch_rel.get("yuk_hap", []):
        _yuk_el = _yuk.get("element", "")
        _pr: dict[str, float] = {}
        for _br in _yuk.get("pair", []):
            for _pk in _branch_to_pillars.get(_br, []):
                ov = _hap_branch_overrides.get(_pk)
                if ov and ov[0] == _yuk_el and _pk not in _pr:
                    _pr[_pk] = ov[1]
        _yuk["pillar_ratios"] = _pr
    for _sam in branch_rel.get("sam_hap", []):
        _sam_el = _sam.get("element", "")
        _pr = {}
        for _br in _sam.get("branches", []):
            for _pk in _branch_to_pillars.get(_br, []):
                ov = _hap_branch_overrides.get(_pk)
                if ov and ov[0] == _sam_el and _pk not in _pr:
                    _pr[_pk] = ov[1]
        _sam["pillar_ratios"] = _pr

    # 십성 분포: 합화 override 반영 (단 1회 계산) — ten_gods는 (element, ratio) 2-tuple만 필요
    _branch_hap_2t = {k: (v[0], v[1]) for k, v in _hap_branch_overrides.items()}
    ten_gods_dist = calculate_ten_gods_distribution(saju, _branch_hap_2t, _hap_stem_overrides)

    # 공망(空亡) — 일주(천간+지지) 기준: starting_branch = (branch_idx - stem_idx) % 12
    _day_s_idx = STEMS_BY_KOREAN[saju["day_pillar"]["stem"]]["index"]
    _day_b_idx = _BRANCHES_BY_KOREAN[saju["day_pillar"]["branch"]]["index"]
    _gm_start   = (_day_b_idx - _day_s_idx) % 12
    _gm_vacant  = [_BRANCHES_ORDER[(_gm_start + 10) % 12], _BRANCHES_ORDER[(_gm_start + 11) % 12]]
    _gm_affected = [
        short
        for short, key in [("year","year_pillar"),("month","month_pillar"),("day","day_pillar"),("hour","hour_pillar")]
        if saju.get(key) is not None and saju[key]["branch"] in _gm_vacant
    ]
    gong_mang = {"vacant_branches": _gm_vacant, "affected_pillars": _gm_affected}

    # 3. 신살 + priority 태그
    sin_sals = [
        {**s, "priority": _SAL_PRIORITY.get(s["type"], "low")}
        for s in find_sin_sals(saju)
    ]

    # 4. 일간 강약
    strength = analyze_day_master_strength(saju, ten_gods_dist, branch_rel)

    # 5. 격국
    gyeok_guk = determine_gyeok_guk(ten_gods_dist)

    # 6. 용신
    yong_sin = select_yong_sin(saju, strength, ten_gods_dist)

    # 7. 현재 대운
    _raw_dae_un = calculate_dae_un(saju, count=12)
    # 전체 대운에 십성·12운성 추가
    dae_un_list = [
        {
            **d,
            "stem_ten_god":   calculate_ten_god(day_stem, d["stem"]),
            "branch_ten_god": get_branch_ten_god(day_stem, d["branch"]),
            "twelve_wun":     get_twelve_wun(day_stem, d["branch"]),
        }
        for d in _raw_dae_un
    ]
    birth_year = int(birth_date.split("-")[0])
    current_age = datetime.now().year - birth_year
    current_dae_un = next(
        (d for d in dae_un_list if d["start_age"] <= current_age <= d["end_age"]),
        dae_un_list[-1],
    )

    # 8. 음양 비율
    _yy_keys = [k for k in ["year_pillar", "month_pillar", "day_pillar", "hour_pillar"]
                if saju.get(k) is not None]
    all_stems = [saju[k]["stem"] for k in _yy_keys]
    stem_yy = [STEMS_BY_KOREAN[s]["yin_yang"] for s in all_stems]
    branch_yy = [saju[k]["yin_yang"] for k in _yy_keys]
    all_yy = stem_yy + branch_yy
    _total_chars = len(all_yy)
    yang_count = sum(1 for y in all_yy if y == "양")
    yin_count = _total_chars - yang_count
    yin_yang_ratio = {
        "yang": round(yang_count / _total_chars * 100, 1) if _total_chars else 0.0,
        "yin": round(yin_count / _total_chars * 100, 1) if _total_chars else 0.0,
    }

    # 9. meta
    hh, mm = (12, 0) if birth_time is None else map(int, birth_time.split(":"))
    original_dt = datetime(birth_year, *map(int, birth_date.split("-")[1:]), hh, mm)
    correction = get_solar_correction_for_location(original_dt, birth_longitude, birth_utc_offset)
    applied_dt = original_dt + timedelta(minutes=correction)
    meta = {
        "time_correction_minutes": correction,
        "applied_time": applied_dt.strftime("%Y-%m-%dT%H:%M"),
        "timezone_note": get_historical_note(original_dt),
    }

    # 십성 분포: 0 제거 후 퍼센트 변환 (총합 100%)
    _dist_nonzero = {k: v for k, v in ten_gods_dist.items() if v > 0}
    _total = sum(_dist_nonzero.values())
    ten_gods_dist_filtered = (
        {k: round(v / _total * 100, 1) for k, v in _dist_nonzero.items()}
        if _total > 0 else {}
    )
    # 결핍 카테고리 → void_info: 표면(0) + 지장간 잠재력 대조
    _CATEGORIES = {
        "비겁": ["비견", "겁재"], "식상": ["식신", "상관"],
        "재성": ["편재", "정재"], "관성": ["편관", "정관"], "인성": ["편인", "정인"],
    }
    _ji_pillar_keys = list(saju["ji_jang_gan"].keys())
    ten_gods_void_info = []
    for cat, gods in _CATEGORIES.items():
        if all(ten_gods_dist_filtered.get(g, 0) == 0 for g in gods):
            hidden: dict[str, list[str]] = {}
            for pk in _ji_pillar_keys:
                stems = [s for s in saju["ji_jang_gan"][pk]
                         if calculate_ten_god(day_stem, s) in gods]
                if stems:
                    hidden[pk] = stems
            ten_gods_void_info.append({"category": cat, "hidden_in_ji_jang_gan": hidden})

    # 조후(調候) — 월지 기후와 일간의 관계
    _SEASON_MAP: dict[str, tuple] = {
        "인": ("spring", "warm",      "humid"),
        "묘": ("spring", "warm",      "humid"),
        "진": ("spring", "warm",      "moderate"),
        "사": ("summer", "hot",       "dry"),
        "오": ("summer", "scorching", "dry"),
        "미": ("summer", "hot",       "moderate"),
        "신": ("autumn", "cool",      "dry"),
        "유": ("autumn", "cool",      "dry"),
        "술": ("autumn", "cool",      "moderate"),
        "해": ("winter", "cold",      "wet"),
        "자": ("winter", "cold",      "wet"),
        "축": ("winter", "cold",      "dry"),
    }
    month_branch = saju["month_pillar"]["branch"]
    month_el = saju["month_pillar"]["branch_element"]
    day_el   = saju["day_pillar"]["stem_element"]
    season, temperature, humidity = _SEASON_MAP.get(month_branch, ("unknown", "moderate", "moderate"))
    if WUXING_GENERATION.get(month_el) == day_el:
        _season_relation = "생(生)"    # 계절이 일간을 생함
    elif WUXING_GENERATION.get(day_el) == month_el:
        _season_relation = "설(洩)"    # 일간이 계절을 설기
    elif WUXING_DESTRUCTION.get(month_el) == day_el:
        _season_relation = "극(剋)"    # 계절이 일간을 극
    elif WUXING_DESTRUCTION.get(day_el) == month_el:
        _season_relation = "재(財)"    # 일간이 계절을 극
    else:
        _season_relation = "비(比)"    # 동기
    climate_vibe = {
        "season": season, "temperature": temperature, "humidity": humidity,
        "month_element": month_el, "day_element_relation": _season_relation,
    }

    # 반복 연산 방지: 결과를 로컬 변수에 캐싱
    _structure_patterns = detect_structure_patterns(ten_gods_dist_filtered, strength["level"], wuxing_pct)
    # _dynamics는 위(합화 계산 전)에서 이미 계산됨

    # 천간합·천간충을 branch_relations에 추가 (dynamics에서 추출)
    if _dynamics.get("stem_hap"):
        branch_rel["cheon_gan_hap"] = _dynamics["stem_hap"]
    if _dynamics.get("stem_chung"):
        branch_rel["cheon_gan_chung"] = _dynamics["stem_chung"]
    _synergy = compute_synergy_tags(_structure_patterns, _dynamics)

    # ⑩ 행동 프로파일 — 십성 분포 → 원자적 행동 벡터 합성
    _behavior_profile = synthesize_behavior_profile(ten_gods_dist_filtered)

    # ⑪ 컨텍스트 랭킹 — Writer에게 전달할 핵심·보조 컨텍스트 선별
    _context_ranking = rank_context(_structure_patterns, sin_sals, synergy=_synergy)

    # ⑫ 생활 도메인 매핑 — 연애·직업·돈·성격별 핵심 태그 자동 분류
    _life_domains = map_life_domains(_behavior_profile, _context_ranking)

    return {
        # ① meta — 계산 기준 먼저
        "meta": {
            **meta,
            "gender": saju["gender"],
            "birth_date": saju["birth_date"],
            "birth_time": saju["birth_time"],
            "calendar": saju["calendar"],
            "climate_vibe": climate_vibe,
        },
        # ② 핵심 결론
        "day_master_strength": strength,
        "yong_sin": yong_sin,
        "gyeok_guk": gyeok_guk,
        # ③ 4기둥 (십성·12운성 포함)
        "year_pillar": pillars_enriched["year_pillar"],
        "month_pillar": pillars_enriched["month_pillar"],
        "day_pillar": pillars_enriched["day_pillar"],
        "hour_pillar": pillars_enriched["hour_pillar"],
        # ④ 오행·음양 분포 (퍼센트, 0 포함 — 결핍 오행도 의미 있음)
        "wuxing_count":      wuxing_pct,       # 기본 8글자
        "wuxing_count_hap":  wuxing_hap_pct,   # 육합·삼합 합화 적용
        "wuxing_chars":      _wuxing_chars,     # 위치별 오행 [{pillar,type,element}]
        "wuxing_hap_contributions": _wuxing_hap_contributions,  # ratio 기반 부분합화 [{pillar,type,base_element,hap_element,hap_ratio}]
        "dominant_elements": saju["dominant_elements"],
        "weak_elements": saju["weak_elements"],
        "yin_yang_ratio": yin_yang_ratio,
        # ⑤ 십성 분포 % (총합 ~100) + 결핍 카테고리 (표면 없음 + 지장간 잠재력 대조)
        "ten_gods_distribution": ten_gods_dist_filtered,
        "ten_gods_void_info": ten_gods_void_info,
        "structure_patterns": _structure_patterns,
        # ⑥ 특이사항
        "gong_mang": gong_mang,
        "sin_sals": sin_sals,
        "branch_relations": branch_rel,
        "ji_jang_gan": saju["ji_jang_gan"],
        # ⑦ 대운 (전체 리스트 + 현재 대운)
        "dae_un_start_age": dae_un_list[0]["start_age"],
        "dae_un_list": dae_un_list,
        "current_dae_un": current_dae_un,
        # ⑧ 동역학 — 기둥 간 상호작용 (천간합·통근·지지관계위치·오행흐름)
        "dynamics": _dynamics,
        # ⑨ 시너지 — 구조 패턴 × 동역학 교차점 (Writer Agent 추가 해석 힌트)
        "synergy": _synergy,
        # ⑩ 행동 프로파일 — 십성 → 원자적 행동 벡터 (RAG 쿼리 seed)
        "behavior_profile": _behavior_profile,
        # ⑪ 컨텍스트 랭킹 — Writer 전달 핵심·보조 컨텍스트 (primary 3 + secondary 2)
        "context_ranking": _context_ranking,
        # ⑫ 생활 도메인 — 연애·직업·돈·성격 도메인별 핵심 태그 (Writer Agent RAG 쿼리 seed)
        "life_domains": _life_domains,
    }
