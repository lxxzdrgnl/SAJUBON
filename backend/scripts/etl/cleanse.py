"""
HTML 태그·깨진 마크업 제거, 공백 정규화.

spec §4.2: <BR>, <FONT c< body> 같은 깨진 마크업 제거,
인코딩 정규화, 연속 공백·개행 정규화.
"""

from __future__ import annotations
import re


# ─── 정규식 (컴파일 캐시) ────────────────────────────────────────

# 완전한 HTML 태그: <tag ...> 또는 </tag>
_FULL_TAG_RE = re.compile(r"<[^<>]*?>", re.DOTALL | re.IGNORECASE)

# 깨진 마크업 잔재: < 로 시작하지만 닫히지 않은 태그 조각
# 태그명(ASCII 문자)으로 시작하는 조각만 매칭 — 한국어/한자는 포함하지 않음
# 예: <FONT c  (< body>가 먼저 제거되고 남은 잔재)
_BROKEN_OPEN_RE = re.compile(r"<[A-Za-z/][^<>가-힣]*", re.IGNORECASE)

# 연속 공백(탭·스페이스) → 단일 스페이스
_MULTI_SPACE_RE = re.compile(r"[ \t]+")


def cleanse_text(text: str | None) -> str:
    """
    덤프 텍스트를 클렌징한다.

    1. None/빈 문자열 → ""
    2. 완전한 HTML 태그 반복 제거 (→ 공백으로 대체)
    3. 깨진 마크업 잔재 제거 (→ 공백으로 대체)
    4. \\r\\n / \\r → \\n
    5. 연속 공백(스페이스·탭) → 단일 스페이스
    6. 연속 개행 → 최대 1개 \\n
    7. 각 줄 앞뒤 공백 제거, 전체 앞뒤 공백 제거
    """
    if not text:
        return ""

    # 2. 완전한 태그 반복 제거 (중첩 가능성 대비)
    prev = None
    while prev != text:
        prev = text
        text = _FULL_TAG_RE.sub(" ", text)

    # 3. 깨진 마크업 잔재 제거 (< 로 시작하지만 닫히지 않은 조각)
    text = _BROKEN_OPEN_RE.sub(" ", text)

    # 4. 개행 정규화 \r\n / \r → \n
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # 5. 줄별로 연속 공백 정규화 + 앞뒤 공백 제거
    lines = text.split("\n")
    lines = [_MULTI_SPACE_RE.sub(" ", line).strip() for line in lines]

    # 6. 연속 빈 줄 제거 (빈 줄은 완전히 제거, 텍스트 줄만 \n으로 연결)
    result_lines: list[str] = [line for line in lines if line]

    return "\n".join(result_lines)
