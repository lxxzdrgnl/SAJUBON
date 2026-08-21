"""
용신(用神) 선정.
일간 강약 → 설기·생조 오행을 용신으로 결정.
"""

from __future__ import annotations
from engine.data.wuxing import WUXING_GENERATION, WUXING_DESTRUCTION

# 역방향 조회
_REVERSE_GEN = {v: k for k, v in WUXING_GENERATION.items()}
_REVERSE_DES = {v: k for k, v in WUXING_DESTRUCTION.items()}


def _generates(element: str) -> str:
    """내가 생하는 오행 (식상)."""
    return WUXING_GENERATION[element]


def _generates_me(element: str) -> str:
    """나를 생하는 오행 (인성)."""
    return _REVERSE_GEN[element]


def _controls(element: str) -> str:
    """내가 극하는 오행 (재성)."""
    return WUXING_DESTRUCTION[element]


def _controls_me(element: str) -> str:
    """나를 극하는 오행 (관성)."""
    return _REVERSE_DES[element]


def select_yong_sin(saju: dict, strength: dict, ten_gods_dist: dict) -> dict:
    """
    용신 선정.

    Returns:
        primary: 주 용신 오행
        secondary: 보조 용신
        xi_sin: 희신 목록
        ji_sin: 기신 목록
        reasoning: 선정 이유
    """
    level = strength["level"]
    d_el = saju["day_pillar"]["stem_element"]

    if level in ("very_strong", "strong"):
        primary = _generates(d_el)      # 식상(설기)
        secondary = _controls(d_el)     # 재성(극)
        xi_sin = [primary, secondary, _controls_me(d_el)]   # 식상·재성·관성 모두 희신 (신강 억부)
        ji_sin = [d_el, _generates_me(d_el)]
        logic_type = "overpowered_day_master_drain"
    elif level in ("very_weak", "weak"):
        primary = _generates_me(d_el)   # 인성(생)
        secondary = d_el                # 비겁(돕기)
        xi_sin = [primary, secondary]
        ji_sin = [_controls(d_el), _controls_me(d_el)]
        logic_type = "weak_day_master_support"
    else:
        # 중화 → 가장 약한 오행 보충
        wuxing = saju["wuxing_count"]
        primary = min(wuxing, key=lambda e: wuxing[e])
        secondary = None
        xi_sin = [primary, _generates(primary)]
        ji_sin = [_controls(primary)]
        logic_type = "balanced_weakest_supplement"

    _LABEL = {
        "overpowered_day_master_drain": "억부용신",
        "weak_day_master_support":      "억부용신",
        "balanced_weakest_supplement":  "통관용신",
    }
    return {
        "primary": primary,
        "secondary": secondary,
        "xi_sin": xi_sin,
        "ji_sin": ji_sin,
        "logic_type": logic_type,
        "yong_sin_label": _LABEL[logic_type],
        "reasoning_priority": "억부",  # 강약 기준 우선 (조후는 meta.climate_vibe 참조)
    }
