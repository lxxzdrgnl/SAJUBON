# ETL P1 — moonmarin8 덤프 파싱·인제스트 구현 계획 (병행 트랙)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** moonmarin8 MariaDB 덤프(226 테이블)를 파싱·클렌징·분류해 ① `corpus_saju` Tier2 컬렉션 인제스트 파이프라인 완성 ② 신살 갭 ~11개의 Tier1 보강 **LLM 초안** 생성 (사람 검수 게이트 전까지).

**Architecture:** `backend/scripts/etl/` 패키지 — mysqldump INSERT 파서(순수 파이썬, MySQL 서버 불필요) → HTML 클렌저 → 테이블→도메인/신뢰도 분류 룰 → ChromaDB 인제스트(기존 `rag/ingest.py` 패턴, 출처·신뢰도 메타). 원본 덤프는 저장소 밖(`~/Downloads`) 유지, 산출물도 비커밋 (G5).

**근거 문서:** `docs/superpowers/specs/2026-06-02-multi-domain-divination-platform-design.md` §2(인벤토리)·§4(2계층 RAG)·§5(파이프라인)

**비범위:** 실제 전량 인제스트 실행(임베딩 API 비용 — 머지 후 별도 실행), 신살 초안의 사람 검수·knowledge 반영, Group 2 도메인

---

## 파일 구조

```
backend/scripts/etl/
├── __init__.py
├── parse_dump.py      # mysqldump → 테이블별 행 이터레이터
├── cleanse.py         # HTML 태그·깨진 마크업 제거, 공백 정규화
├── classify.py        # 테이블명 → {domain, trust} 룰 테이블 (6/2 spec §2 코드화)
├── ingest_corpus.py   # corpus_saju 인제스트 CLI (--limit N dry-run 지원)
└── draft_sin_sal.py   # 신살 풀이 LLM 초안 생성 → out/sin_sal_draft.json (검수용)
backend/tests/etl/
├── test_parse_dump.py
├── test_cleanse.py
└── test_classify.py
backend/rag/db.py      # COLLECTIONS에 'corpus_saju' 추가
backend/.gitignore     # scripts/etl/out/ 제외
```

---

### Task 1: 덤프 파서 (TDD)

**Files:** `backend/scripts/etl/parse_dump.py`, `backend/tests/etl/test_parse_dump.py` (+ `__init__.py`들)

- [ ] **Step 1: 실패하는 테스트** — fixture는 실제 덤프 형식의 미니 샘플을 테스트 안에 문자열로:

```python
import pytest
from scripts.etl.parse_dump import iter_table_rows, list_tables

SAMPLE = '''
DROP TABLE IF EXISTS `F007`;
CREATE TABLE `F007` (
  `DB_num` int(11) DEFAULT NULL,
  `DB_title` text,
  `DB_data` text
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
LOCK TABLES `F007` WRITE;
INSERT INTO `F007` VALUES (1,'태몽','용꿈은 <BR>귀한 자식'),(2,'둘째','뱀 꿈, ''길몽''이다');
UNLOCK TABLES;
CREATE TABLE `S087` (
  `DB_num` int(11) DEFAULT NULL,
  `DB_data` text
);
INSERT INTO `S087` VALUES (1,'오늘의 총운');
'''

def test_list_tables(tmp_path):
    p = tmp_path / "dump.sql"; p.write_text(SAMPLE, encoding="utf-8")
    assert list_tables(p) == ["F007", "S087"]

def test_iter_rows_columns_and_escapes(tmp_path):
    p = tmp_path / "dump.sql"; p.write_text(SAMPLE, encoding="utf-8")
    rows = list(iter_table_rows(p, "F007"))
    assert rows[0] == {"DB_num": 1, "DB_title": "태몽", "DB_data": "용꿈은 <BR>귀한 자식"}
    assert rows[1]["DB_data"] == "뱀 꿈, '길몽'이다"   # '' 이스케이프 해제

def test_missing_table(tmp_path):
    p = tmp_path / "dump.sql"; p.write_text(SAMPLE, encoding="utf-8")
    assert list(iter_table_rows(p, "NOPE")) == []
```

- [ ] **Step 2: 실패 확인** — `uv run pytest tests/etl/ -q` (worktree에선 `uv sync` 선행)

- [ ] **Step 3: 구현** — 요구사항: ① CREATE TABLE 블록에서 컬럼명 순서 추출 ② `INSERT INTO \`T\` VALUES (...),(...);`를 상태기계로 파싱 — 문자열 리터럴 내 `,`·`)`·이스케이프(`''`, `\'`, `\\`, `\n`) 처리 ③ 멀티라인 INSERT·대용량 스트리밍(파일 전체를 메모리에 들지 않게 라인 단위) ④ 숫자는 int/float, `NULL`→None. 표준 라이브러리만 사용.

- [ ] **Step 4: 통과 + 커밋** — `feat: moonmarin8 덤프 파서 추가`

- [ ] **Step 5: 실 덤프 스모크** (검증만, 산출물 비커밋):
```python
# uv run python -c 스니펫으로: list_tables('/home/rheon/Downloads/20250522_moonmarin8_DB_Backup.sql')
# 기대: 226개. F020 행수 10569 근사 확인 (6/2 spec §2.2)
```

---

### Task 2: 클렌저 (TDD)

**Files:** `backend/scripts/etl/cleanse.py`, `backend/tests/etl/test_cleanse.py`

- [ ] **Step 1: 실패하는 테스트**:

```python
from scripts.etl.cleanse import cleanse_text

def test_html_tags_removed():
    assert cleanse_text("용꿈은 <BR>귀한<br/> 자식") == "용꿈은 귀한 자식"

def test_broken_markup_removed():
    # 6/2 spec §4.2 명시 사례: 깨진 <FONT c< body> 류
    assert cleanse_text("길하다<FONT c< body>흉하다") == "길하다 흉하다"

def test_whitespace_normalized():
    assert cleanse_text("  복이   많다.\r\n\r\n재물운  ") == "복이 많다.\n재물운"

def test_empty_and_none():
    assert cleanse_text("") == ""
    assert cleanse_text(None) == ""
```

- [ ] **Step 2~4: 실패 확인 → 구현(정규식 — 태그 제거, 깨진 `<...` 잔재 제거, 연속 공백/개행 정규화) → 통과 → 커밋** — `feat: 덤프 텍스트 클렌저 추가`

---

### Task 3: 분류 룰 (TDD)

**Files:** `backend/scripts/etl/classify.py`, `backend/tests/etl/test_classify.py`

- [ ] **Step 1: 실패하는 테스트**:

```python
from scripts.etl.classify import classify_table

def test_saju_ai_generated():
    assert classify_table("S087") == {"domain": "saju", "trust": "ai_generated"}

def test_classical_jamidusu():
    assert classify_table("J017") == {"domain": "jamidusu", "trust": "classical"}

def test_classical_saju_range():
    # 6/2 spec §2.3: S045~S056은 정통 고전 문체
    assert classify_table("S045")["trust"] == "classical"
    assert classify_table("S044")["trust"] == "ai_generated"

def test_compatibility():
    assert classify_table("G001")["domain"] == "compatibility"

def test_lookup_tables_excluded():
    assert classify_table("LunarToSolar") is None   # 계산·참조 테이블 → 인제스트 제외
    assert classify_table("namedata") is None

def test_unknown_default():
    assert classify_table("ZZZ9") == {"domain": "misc", "trust": "ai_generated"}
```

- [ ] **Step 2~4: 구현 → 통과 → 커밋** — 룰 테이블은 6/2 spec §2.1(계산·참조 → None)·§2.2(도메인 매핑: S=saju, G/N계열 궁합 항목=compatibility, J004~010/036~044=juyeok·tojung, J017~030=jamidusu, F007/F020=dream, F011/12/22=fengshui, N002~005/15=naming, T=tarot 등)·§2.3(trust: J계열+S045~056=classical, 그 외 S/G/N/T=ai_generated)을 **prefix·범위 룰**로 코드화. spec 표를 읽고 룰을 작성하되 모호한 테이블은 misc로. 커밋: `feat: 덤프 테이블 분류 룰 추가`

---

### Task 4: corpus_saju 인제스트 CLI

**Files:** `backend/scripts/etl/ingest_corpus.py`, Modify: `backend/rag/db.py`

- [ ] **Step 1: `rag/db.py`의 `COLLECTIONS` 리스트에 `"corpus_saju"` 추가** (기존 패턴 그대로 — 주변 코드 확인)

- [ ] **Step 2: CLI 구현** — 기존 `rag/ingest.py`의 임베딩·컬렉션 접근 패턴을 **읽고 재사용**:

```
uv run python -m scripts.etl.ingest_corpus \
  --dump /home/rheon/Downloads/20250522_moonmarin8_DB_Backup.sql \
  --domain saju --limit 100 --dry-run
```

요구사항: ① classify가 domain=saju인 테이블만 ② 행마다 cleanse 적용, 200자 미만/중복 텍스트 스킵 ③ 메타데이터 `{source: "moonmarin8", domain, trust, table, express: str(DB_express?)}` (6/2 spec §4.2) ④ `--dry-run`은 임베딩 호출 없이 건수·표본 출력 ⑤ `--limit N` 지원 ⑥ 실패 행 스킵+로그, 중단 없음 (spec §9)

- [ ] **Step 3: 검증** — dry-run으로 표본 출력 확인 (임베딩 호출 0회). 실 인제스트는 머지 후 별도 실행이므로 **여기서 실행 금지**.

- [ ] **Step 4: 커밋** — `feat: corpus_saju 인제스트 CLI 추가`

---

### Task 5: 신살 Tier1 보강 초안 생성기

**Files:** `backend/scripts/etl/draft_sin_sal.py`

- [ ] **Step 1: 갭 목록 산출** — 엔진이 계산하는 신살 목록(`backend/engine/calc/sin_sal.py` 읽기)과 `rag/knowledge/sin_sal.json`의 9개를 대조해 갭 목록을 코드로 산출 (6/2 spec 추정 ~11개: 감수·고신·망신·문곡·반안·원진·월덕·육해·장성·태극·현침·홍염 등 — 실제 대조 결과 기준)

- [ ] **Step 2: 초안 생성기 구현** — 덤프에서 신살 관련 테이블(S126 등 — `list_tables` 후 신살 키워드로 탐색) 텍스트를 cleanse해 수집 → 기존 `sin_sal.json`의 스키마(`embedding_context`/`engine_tags`/`interpretation_tags` 등 — 파일을 읽고 정확한 스키마 추출)에 맞춘 항목을 **기존 LLM provider**(`llm/providers.py` Strategy)로 초안 생성 → `scripts/etl/out/sin_sal_draft.json` 저장. **rag/knowledge/sin_sal.json은 절대 직접 수정 금지** — 사람 검수 게이트 (6/2 spec §5 ④b)

- [ ] **Step 3: `--limit 2`로 표본 생성 검증** (LLM 키 없으면 프롬프트 빌드까지 검증하고 DONE_WITH_CONCERNS)

- [ ] **Step 4: `backend/.gitignore`에 `scripts/etl/out/` 추가 + 커밋** — `feat: 신살 보강 초안 생성기 추가`

---

### Task 6: 전체 검증

- [ ] `uv run pytest tests/etl/ -q` 전부 통과 + 기존 백엔드 테스트 회귀 없음 (`uv run pytest -q`)
- [ ] 실 덤프 스모크: 226 테이블, saju 도메인 분류 건수 출력
- [ ] dry-run 인제스트 표본 10건 출력 확인

## 완료 기준
파서·클렌저·분류 테스트 그린 / dry-run 동작 / 신살 초안 표본 생성 / 원본·산출물 비커밋 (G5)
