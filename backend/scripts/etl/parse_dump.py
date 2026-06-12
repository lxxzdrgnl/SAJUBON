"""
mysqldump INSERT 파서.

MySQL 서버 없이 순수 파이썬으로 mysqldump 파일을 파싱한다.
- CREATE TABLE 블록에서 컬럼명 순서 추출
- INSERT INTO `T` VALUES (...),(...);\n 형태를 상태기계로 파싱
  (문자열 리터럴 내 콤마·괄호·이스케이프 처리)
- 멀티라인 INSERT / 대용량 스트리밍 지원 (라인 단위)
- 숫자 → int/float, NULL → None
"""

from __future__ import annotations
import re
from pathlib import Path
from typing import Iterator

# ─── 컬럼명 추출 ─────────────────────────────────────────────────

_CREATE_RE = re.compile(
    r"CREATE\s+TABLE\s+`(\w+)`\s*\((.+?)\)\s*(?:ENGINE|;)",
    re.IGNORECASE | re.DOTALL,
)
_COLUMN_RE = re.compile(r"^\s*`(\w+)`\s+", re.IGNORECASE)


def _parse_columns(create_block: str) -> list[str]:
    """CREATE TABLE 블록(괄호 내용)에서 컬럼명 목록을 순서대로 반환."""
    cols: list[str] = []
    for line in create_block.splitlines():
        line = line.strip()
        # 인덱스·KEY·PRIMARY 등은 건너뜀
        if re.match(r"(PRIMARY|UNIQUE|KEY|INDEX|FULLTEXT|CONSTRAINT)", line, re.IGNORECASE):
            continue
        m = _COLUMN_RE.match(line)
        if m:
            cols.append(m.group(1))
    return cols


def list_tables(dump_path: str | Path) -> list[str]:
    """덤프 파일의 테이블명 목록을 출현 순서대로 반환."""
    tables: list[str] = []
    seen: set[str] = set()
    with open(dump_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            m = re.match(r"CREATE\s+TABLE\s+`(\w+)`", line, re.IGNORECASE)
            if m:
                name = m.group(1)
                if name not in seen:
                    seen.add(name)
                    tables.append(name)
    return tables


# ─── 값 파서 (상태기계) ──────────────────────────────────────────

def _parse_row(row_text: str) -> list:
    """
    '(val1, val2, ...)' 형태의 한 행을 파싱해 Python 값 목록 반환.
    row_text는 앞뒤 괄호를 포함한 문자열이어야 한다.
    이스케이프: '', \', \\, \n, \r, \t
    """
    # 앞뒤 괄호 제거
    s = row_text.strip()
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1]

    values: list = []
    i = 0
    n = len(s)

    while i < n:
        # 공백 건너뜀
        while i < n and s[i] in " \t":
            i += 1
        if i >= n:
            break

        if s[i] == "'":
            # 문자열 리터럴
            i += 1
            buf: list[str] = []
            while i < n:
                c = s[i]
                if c == "\\" and i + 1 < n:
                    nc = s[i + 1]
                    esc = {"'": "'", "\\": "\\", "n": "\n", "r": "\r", "t": "\t"}.get(nc, nc)
                    buf.append(esc)
                    i += 2
                elif c == "'" and i + 1 < n and s[i + 1] == "'":
                    # '' 이스케이프
                    buf.append("'")
                    i += 2
                elif c == "'":
                    i += 1
                    break
                else:
                    buf.append(c)
                    i += 1
            values.append("".join(buf))
        elif s[i:i+4].upper() == "NULL":
            values.append(None)
            i += 4
        else:
            # 숫자 (정수 또는 실수, 음수 포함)
            j = i
            if j < n and s[j] in "+-":
                j += 1
            while j < n and (s[j].isdigit() or s[j] == "."):
                j += 1
            token = s[i:j]
            if "." in token:
                values.append(float(token))
            else:
                try:
                    values.append(int(token))
                except ValueError:
                    values.append(token)
            i = j

        # 콤마 건너뜀
        while i < n and s[i] in " \t":
            i += 1
        if i < n and s[i] == ",":
            i += 1

    return values


def _split_value_rows(values_clause: str) -> Iterator[str]:
    """
    'VALUES ...' 절에서 최상위 괄호 단위로 행을 분리한다.
    값 안에 중첩 괄호가 없으므로 depth 카운팅으로 처리.
    """
    depth = 0
    start = -1
    for i, c in enumerate(values_clause):
        if c == "(":
            if depth == 0:
                start = i
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0 and start >= 0:
                yield values_clause[start:i + 1]
                start = -1


# ─── 메인 API ────────────────────────────────────────────────────

def iter_table_rows(
    dump_path: str | Path,
    table_name: str,
) -> Iterator[dict]:
    """
    덤프에서 특정 테이블의 행을 dict 이터레이터로 반환.
    컬럼명 순서는 CREATE TABLE에서 추출.
    테이블이 없거나 INSERT가 없으면 빈 이터레이터.
    """
    dump_path = Path(dump_path)
    columns: list[str] | None = None
    in_target_table = False
    insert_prefix = f"INSERT INTO `{table_name}` VALUES"

    # 1-패스: 라인 단위 스트리밍
    # CREATE TABLE을 만나면 컬럼을 파싱, INSERT를 만나면 값을 파싱
    create_buf: list[str] = []
    in_create = False
    paren_depth = 0

    with open(dump_path, encoding="utf-8", errors="replace") as f:
        for raw_line in f:
            line = raw_line.rstrip("\n")

            # ── CREATE TABLE 블록 수집 ──────────────────────────────
            if re.match(r"CREATE\s+TABLE\s+`(\w+)`", line, re.IGNORECASE):
                m = re.match(r"CREATE\s+TABLE\s+`(\w+)`", line, re.IGNORECASE)
                tname = m.group(1) if m else ""
                if tname == table_name:
                    in_create = True
                    in_target_table = True
                    create_buf = [line]
                    paren_depth = line.count("(") - line.count(")")
                else:
                    in_create = False
                    in_target_table = False
                continue

            if in_create:
                create_buf.append(line)
                paren_depth += line.count("(") - line.count(")")
                if paren_depth <= 0:
                    # CREATE 블록 완료 → 컬럼 추출
                    full_create = "\n".join(create_buf)
                    # 첫 번째 '(' 이후 마지막 ')' 전 내용 추출
                    first = full_create.index("(")
                    last = full_create.rindex(")")
                    inner = full_create[first + 1:last]
                    columns = _parse_columns(inner)
                    in_create = False
                continue

            # ── INSERT 처리 ──────────────────────────────────────────
            if not in_target_table or columns is None:
                continue

            # INSERT INTO `table` VALUES ... 를 처리
            # 멀티라인 INSERT를 지원하기 위해 VALUES 이후를 버퍼에 축적
            stripped = line.strip()
            if stripped.upper().startswith(f"INSERT INTO `{table_name}` VALUES".upper()):
                # VALUES 이후를 분리
                values_start = stripped.upper().index("VALUES") + len("VALUES")
                values_part = stripped[values_start:].rstrip(";")
                for row_str in _split_value_rows(values_part):
                    vals = _parse_row(row_str)
                    if len(vals) == len(columns):
                        yield dict(zip(columns, vals))
                    elif vals:
                        # 컬럼 수 불일치 — 가능한 만큼 매핑
                        yield dict(zip(columns[:len(vals)], vals))
