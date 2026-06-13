# 궁합 레포트 (Compatibility Report) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 두 사람 사주를 분석해 결론형 헤드라인 탭 + 결정론 시각 오버뷰를 1회 생성·저장·공유하는 궁합 레포트를, 향후 리포트류를 모듈로 붙일 수 있는 구조(ReportModule·레코드 레지스트리) 위에 구현한다.

**Architecture:** 사주 리포트 아키텍처(Engine→RAG→Writer→탭 JSON, 3-layer, 토큰 공유) 미러링. 서술은 `compute_synastry`(방향성 신호), 점수 오버뷰는 `check_compatibility`. 제네릭 `ReportModule`+`runner`로 추출하고 기존 사주 리포트는 건드리지 않는다(후속 이관).

**Tech Stack:** FastAPI 3-layer, SQLAlchemy 2.0 async, alembic, LangChain LCEL + PydanticOutputParser, pgvector RAG(OpenAI 임베딩), gpt-4.1 Writer. Next.js 15 App Router, next-intl, Tailwind 4, vitest. 패키지 매니저: uv(py)/pnpm(node) — 단 이 환경에선 `npx tsc`/`npx vitest`/`uv run` 사용.

**근거 spec:** `docs/superpowers/specs/2026-06-13-compatibility-report-design.md`

**공통 규칙:** 커밋에 Co-Authored-By 금지, scope 괄호 금지(`feat:` not `feat(x):`), 독립 변경 분리 커밋. 백엔드 import는 절대(`from core.config import settings`). 색은 디자인 토큰만(check-colors --strict). i18n ko/en 패리티(check-i18n).

---

## Phase 0 — 모듈화 토대 (Backend)

### Task 1: ReportModule 계약 정의

**Files:**
- Create: `backend/llm/reports/__init__.py`
- Create: `backend/llm/reports/base.py`
- Test: `backend/tests/test_report_module.py`

- [ ] **Step 1: 실패 테스트 작성** — 더미 모듈이 프로토콜을 만족하고 Tab 모델이 검증되는지.

```python
# backend/tests/test_report_module.py
from llm.reports.base import ReportModule, ReportTab

def test_report_tab_defaults():
    t = ReportTab(category="갈등", headline="속도가 다른 두 사람", content="...")
    assert t.requested is False

def test_dummy_module_conforms():
    class Dummy:
        key = "dummy"
        def assemble_signals(self, inputs): return {"x": 1}
        def build_rag_context(self, signals): return ""
        def output_schema(self): return ReportTab
        def system_prompt(self): return "sys"
        def format_message(self, signals): return "msg"
        def assemble_tabs(self, parsed, signals, request_topics): return [ReportTab(category="c", headline="h", content="b")]
    m: ReportModule = Dummy()
    assert m.assemble_tabs(None, {}, None)[0].category == "c"
```

- [ ] **Step 2: 테스트 실패 확인** — `cd backend && UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_report_module.py -q` → ImportError.

- [ ] **Step 3: base.py 작성**

```python
# backend/llm/reports/base.py
from __future__ import annotations
from typing import Protocol, Any
from pydantic import BaseModel, Field


class ReportTab(BaseModel):
    category: str
    headline: str
    content: str
    requested: bool = False


class ReportModule(Protocol):
    """리포트류 도메인 모듈 계약. 새 리포트 = 이 프로토콜 구현 1개."""
    key: str
    def assemble_signals(self, inputs: dict) -> dict: ...
    def build_rag_context(self, signals: dict) -> str: ...
    def output_schema(self) -> type[BaseModel]: ...
    def system_prompt(self) -> str: ...
    def format_message(self, signals: dict) -> str: ...
    def assemble_tabs(self, parsed: Any, signals: dict, request_topics: str | None) -> list[ReportTab]: ...
```

- [ ] **Step 4: 테스트 통과 확인** — 같은 pytest 명령 → PASS.

- [ ] **Step 5: 커밋** — `feat: 리포트 모듈 계약(ReportModule) 추가`

### Task 2: 제네릭 runner

**Files:**
- Create: `backend/llm/reports/runner.py`
- Test: `backend/tests/test_report_runner.py`

- [ ] **Step 1: 실패 테스트** — Writer를 모킹해 signals→파싱→assemble_tabs 흐름과 파싱 재시도를 검증.

```python
# backend/tests/test_report_runner.py
import pytest
from unittest.mock import AsyncMock, patch
from llm.reports.base import ReportTab
from llm.reports.runner import run_report

class FakeModule:
    key = "fake"
    def assemble_signals(self, inputs): return {"score": 97}
    def build_rag_context(self, signals): return "ctx"
    def output_schema(self):
        from pydantic import BaseModel
        class Out(BaseModel):
            tabs: list[ReportTab]
        return Out
    def system_prompt(self): return "sys"
    def format_message(self, signals): return "msg"
    def assemble_tabs(self, parsed, signals, request_topics):
        return list(parsed.tabs)

@pytest.mark.asyncio
async def test_run_report_happy(monkeypatch):
    out = FakeModule().output_schema()(tabs=[ReportTab(category="c", headline="h", content="b")])
    with patch("llm.reports.runner._invoke_writer", new=AsyncMock(return_value=out)):
        signals, tabs = await run_report(FakeModule(), {"a": 1}, request_topics=None)
    assert signals["score"] == 97
    assert tabs[0].category == "c"
```

- [ ] **Step 2: 실패 확인.**

- [ ] **Step 3: runner.py 작성** — `writer.py`의 PydanticOutputParser + 재시도 패턴을 재사용. (기존 `llm/writer.py` 시그니처를 확인해 `_invoke_writer`가 그걸 호출하도록 작성.)

```python
# backend/llm/reports/runner.py
from __future__ import annotations
from llm.reports.base import ReportModule, ReportTab
from llm.providers import get_llm
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.messages import SystemMessage, HumanMessage


async def _invoke_writer(module: ReportModule, signals: dict):
    schema = module.output_schema()
    parser = PydanticOutputParser(pydantic_object=schema)
    llm = get_llm("openai", model="gpt-4.1")
    sys = module.system_prompt() + "\n\n" + parser.get_format_instructions()
    msg = module.format_message(signals)
    resp = await llm.ainvoke([SystemMessage(content=sys), HumanMessage(content=msg)])
    raw = resp.content if hasattr(resp, "content") else str(resp)
    try:
        return parser.parse(raw)
    except Exception:
        # 1회 재시도 — 포맷 재강조
        resp2 = await llm.ainvoke([
            SystemMessage(content=sys),
            HumanMessage(content=msg + "\n\n반드시 JSON 형식만 출력."),
        ])
        raw2 = resp2.content if hasattr(resp2, "content") else str(resp2)
        return parser.parse(raw2)


async def run_report(module: ReportModule, inputs: dict, *, request_topics: str | None) -> tuple[dict, list[ReportTab]]:
    signals = module.assemble_signals(inputs)
    _ = module.build_rag_context(signals)  # 컨텍스트는 format_message가 signals와 함께 사용
    parsed = await _invoke_writer(module, signals)
    tabs = module.assemble_tabs(parsed, signals, request_topics)
    return signals, tabs
```

> 주의: `llm/writer.py`에 이미 동등한 파싱·재시도 유틸이 있으면 그것을 호출해 중복을 피한다. 구현 시 `writer.py`를 먼저 읽고 재사용 여부 결정.

- [ ] **Step 4: 테스트 통과.**
- [ ] **Step 5: 커밋** — `feat: 제네릭 리포트 runner 추가`

---

## Phase 1 — 엔진 보정 (하위호환)

### Task 3: check_compatibility 거친 부분 정리

**Files:**
- Modify: `backend/engine/calc/compatibility.py`
- Test: `backend/tests/test_compatibility_engine.py` (없으면 생성)

- [ ] **Step 1: 실패 테스트** — `_ten_gods_score`가 십성 기반인지, `complement` 양방향인지.

```python
# backend/tests/test_compatibility_engine.py
from engine.calc.saju import calculate_saju
from engine.calc.compatibility import check_compatibility

def _calc(d, t, g): return calculate_saju(d, t, g, "solar", False)

def test_compatibility_keys_present():
    r = check_compatibility(_calc("1990-03-15","14:30","male"), _calc("1992-07-21","09:00","female"))
    for k in ["total_score","day_pillar_score","element_harmony_score","branch_relation_score","ten_gods_score","conflict_branches","complement_a_to_b","complement_b_to_a"]:
        assert k in r
    assert 0 <= r["total_score"] <= 100
```

- [ ] **Step 2: 실패 확인.**

- [ ] **Step 3: compatibility.py 수정** — `_ten_gods_score`를 실제 십성(`calculate_ten_god`로 일간 관계 → 관계 우호도 매핑)으로 교체. `check_compatibility` 반환에 `complement_a_to_b`(weak1∩dominant2)와 `complement_b_to_a`(weak2∩dominant1) 추가. 기존 `complement_elements`는 하위호환을 위해 유지하거나 제거 후 호출부 갱신 — `handle_check_compatibility`/챗 툴이 깨지지 않게 grep 후 결정.

```python
from engine.calc.ten_gods import calculate_ten_god

# 십성별 관계 우호도 (간략 매핑) — 정관/정인/식신 높음, 편관/겁재 낮음
_TEN_GOD_HARMONY = {
    "비견":60,"겁재":45,"식신":80,"상관":60,"편재":70,"정재":85,
    "편관":50,"정관":85,"편인":60,"정인":80,
}

def _ten_gods_score(saju1: dict, saju2: dict) -> int:
    rel = calculate_ten_god(saju1["day_pillar"]["stem"], saju2["day_pillar"]["stem"])
    return _TEN_GOD_HARMONY.get(rel, 60)
```

- [ ] **Step 4: 테스트 통과 + 기존 챗 궁합 테스트 회귀** — `uv run pytest tests/test_compatibility_engine.py tests/test_chat_tools.py -q`.
- [ ] **Step 5: 커밋** — `fix: 궁합 십성 점수 실제 십성 기반·보완 오행 양방향화`

### Task 4: synastry → 리포트용 방향성 신호 셰이퍼

**Files:**
- Modify: `backend/engine/calc/synastry.py` (함수 추가)
- Test: `backend/tests/test_synastry_report.py`

- [ ] **Step 1: 실패 테스트** — `synastry_for_report(c1,c2)`가 spec의 CompatibilitySynastry 필드를 돌려주는지.

```python
# backend/tests/test_synastry_report.py
from engine.calc.saju import calculate_saju
from engine.calc.synastry import synastry_for_report

def test_synastry_report_shape():
    c1 = calculate_saju("1990-03-15","14:30","male","solar",False)
    c2 = calculate_saju("1992-07-21","09:00","female","solar",False)
    r = synastry_for_report(c1, c2)
    for k in ["stem_hap","day_ten_god","element_synergy","clash_pairs","complement_a_to_b","complement_b_to_a","yongsin_help","interaction_tags"]:
        assert k in r
    assert r["yongsin_help"] in (None,"a_helps_b","b_helps_a","mutual")
```

- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: synastry.py에 `synastry_for_report` 추가** — 기존 `compute_synastry` 결과 + 방향 판정(`el2==ys1`→b_helps_a, `el1==ys2`→a_helps_b, 둘 다→mutual)과 양방향 complement를 조립. `compute_synastry`는 그대로 둔다.
- [ ] **Step 4: 테스트 통과.**
- [ ] **Step 5: 커밋** — `feat: 리포트용 synastry 방향성 신호 셰이퍼 추가`

---

## Phase 2 — 궁합 리포트 백엔드 코어

### Task 5: 스키마

**Files:** Create `backend/schemas/compatibility.py`. Test: `backend/tests/test_compatibility_schema.py`.

- [ ] **Step 1~5:** spec §6의 모델(`BirthInput`, `CompatibilityScore`, `CompatibilitySynastry`, `CompatibilityTab`(=ReportTab 재사용 가능), `CompatibilityReportRequest`, `CompatibilityReportDetail`, `CompatibilityReportSummary`, `CompatibilityShareRequest/Response`)을 Pydantic으로 작성. 스키마 인스턴스화 테스트 → 통과 → 커밋 `feat: 궁합 리포트 스키마 추가`.

### Task 6: 프롬프트

**Files:** Create `backend/llm/prompts/compatibility_report.py`.

- [ ] **Step 1: 시스템 프롬프트 + 포맷터 작성** — spec §8 유동 탭 규칙: 앵커 3탭(종합 케미·갈등·조언) 항상, 가변 2~5탭은 신호(stem_hap·element_synergy·complement·clash·ten_god) 보고 선택, request_topics는 "요청" 탭. 결론형 헤드라인, 마크다운 본문, RAG 근거. `format_message(signals)`는 두 사람 사주 요약 + synastry 신호 + 점수 + request_topics를 JSON으로 직렬화.
- [ ] **Step 2: 커밋** — `feat: 궁합 리포트 프롬프트 추가` (프롬프트는 단위 테스트 생략, 모듈 테스트에서 간접 검증).

### Task 7: CompatibilityReportModule

**Files:** Create `backend/llm/reports/compatibility.py`. Test: `backend/tests/test_compatibility_module.py`.

- [ ] **Step 1: 실패 테스트** — Writer 모킹, assemble_signals가 두 사주+synastry+score를 담는지, assemble_tabs가 앵커 3 + 요청 탭을 보장하는지.

```python
# 핵심 단언
async def test_module_anchors_and_requested(monkeypatch):
    from llm.reports.compatibility import CompatibilityReportModule
    m = CompatibilityReportModule()
    sig = m.assemble_signals({"person_a": A, "person_b": B})
    assert "synastry" in sig and "score" in sig
    # Writer가 가변탭만 줘도 앵커 3개는 보장 + request_topics="결혼시기" → 요청 탭 존재
```

- [ ] **Step 2~4:** 모듈 구현 — `assemble_signals`: `calculate_saju`×2 + `synastry_for_report` + `check_compatibility`. `build_rag_context`: synastry `interaction_tags`로 태그 검색(rag_builder 활용). `output_schema`: `{tabs: list[ReportTab]}`. `assemble_tabs`: Writer 탭 + 앵커 누락 보강 + request_topics 분해해 `requested=True` 탭 추가, 5~8개로 정리. 테스트 통과.
- [ ] **Step 5: 커밋** — `feat: 궁합 리포트 모듈 구현`

### Task 8: 파이프라인 wrapper

**Files:** Create `backend/llm/pipelines/compatibility_report.py`. Test: `backend/tests/test_compatibility_pipeline.py`.

- [ ] **Step 1~5:** `run_compatibility_report(req) -> (score, synastry, tabs)` — `run_report(CompatibilityReportModule(), inputs, request_topics)` 호출 + signals에서 score/synastry 추출. Writer 모킹 테스트 → 통과 → 커밋 `feat: 궁합 리포트 파이프라인 추가`.

---

## Phase 3 — DB + API

### Task 9: 모델 + 마이그레이션

**Files:** Modify `backend/db/models.py`; Create alembic version.

- [ ] **Step 1:** `CompatibilityReport`(user_id, person_a JSONB, person_b JSONB, request_topics, language, score JSONB, synastry JSONB, tabs JSONB, created_at) + `CompatibilityShare`(report_id FK, share_token UUID unique, mask_birth, created_at) 추가 — spec §5, `SajuReport`/`ReportShare` 패턴 그대로.
- [ ] **Step 2:** `cd backend && uv run alembic revision --autogenerate -m "compatibility report"` → 생성된 마이그레이션 검토(테이블 2개·인덱스 확인).
- [ ] **Step 3:** `uv run alembic upgrade head` (로컬 dev DB 5433/컨테이너) → 성공 확인.
- [ ] **Step 4: 커밋** — `feat: 궁합 리포트 테이블 추가` (모델+마이그레이션 한 커밋).

### Task 10: CRUD

**Files:** Create `backend/crud/compatibility.py`.

- [ ] **Step 1~5:** `create_report`(add/flush/refresh, commit 없음), `get_report`(소유자), `list_reports`(소유자), `create_share`(단발 — 내부 commit 허용), `get_by_token`(조인). 읽기 함수는 commit 없음. 커밋 `feat: 궁합 리포트 CRUD 추가`.

### Task 11: Service

**Files:** Create `backend/services/compatibility.py`. Test: `backend/tests/test_compatibility_service.py` (Writer 모킹).

- [ ] **Step 1~5:** `create_report`(파이프라인 호출 → crud.create → **단일 commit** → Detail), `create_from_session`(세션 birth_info+partner 읽어 동일 흐름), `get_report`/`list_reports`/`share`/`get_shared`(mask_birth 반영). 예외 변환: engine ValueError→CalcFailedException, LLM RuntimeError→LLMFailedException, 소유자 아님→ForbiddenException, 없음→전용 NotFoundException(core/exceptions.py + errors.py 추가). 테스트 통과 → 커밋 `feat: 궁합 리포트 서비스 추가`.

### Task 12: Router + 등록

**Files:** Create `backend/routers/compatibility.py`; Modify `backend/main.py`. Test: `backend/tests/test_compatibility_api.py`.

- [ ] **Step 1: 실패 테스트** — 생성·조회·목록·공유·공개열람·from-session, 소유자 권한, 무권한 공개 접근. `test_chat_partner_api.py` 패턴 참고, Writer/엔진은 모킹 또는 실제(빠르면 실제).
- [ ] **Step 2~4:** 라우터 작성(reports.py 미러: try/except 금지, 단일 위임). 엔드포인트 spec §7. `main.py`에 `app.include_router(...)`(+ share_router). 테스트 통과.
- [ ] **Step 5: 커밋** — `feat: 궁합 리포트 API 추가`

---

## Phase 4 — API Client

### Task 13: 패키지 클라이언트

**Files:** Create `packages/api-client/src/compatibility.ts`; Modify `packages/api-client/src/types.ts`, `index.ts`. Test: `packages/api-client/src/compatibility.test.ts`.

- [ ] **Step 1~5:** 타입(BirthInput 재사용, CompatibilityScore/Synastry/Tab/Detail/Summary) + 함수(`createCompatibilityReport`, `createCompatibilityFromSession`, `getCompatibilityReport`, `listCompatibilityReports`, `shareCompatibilityReport`, `getSharedCompatibilityReport`). MSW/fetch 모킹 테스트 → `npx vitest run` → 통과 → 커밋 `feat: 궁합 리포트 api-client 추가`.

---

## Phase 5 — 프론트 리포트 UI

### Task 14: 제네릭 TabbedReport 추출

**Files:** Create `apps/web/components/report/TabbedReport.tsx`; Modify `apps/web/components/report/ReportView.tsx`. Test: `apps/web/components/report/TabbedReport.test.tsx`.

- [ ] **Step 1: 실패 테스트** — TabbedReport가 tabs[]를 아코디언으로 렌더하고 `overview` 슬롯(ReactNode)을 위에 표시.
- [ ] **Step 2~4:** ReportView의 `TabAccordion` + 공유버튼을 `TabbedReport`로 추출(탭 아코디언·Markdown·ShareModal 제네릭화, `overview` prop). ReportView는 `<TabbedReport overview={<><YearFlowSection/><DaeUnSection/></>} tabs={report.tabs} .../>`로 리팩터 — 동작·모양 보존. `npx tsc` + vitest 통과.
- [ ] **Step 5: 커밋** — `refactor: 탭 리포트 뷰를 제네릭 TabbedReport로 추출`

### Task 15: 점수 오버뷰 + 오행 흐름 다이어그램

**Files:** Create `apps/web/components/compatibility/ScoreOverview.tsx`, `ElementFlowDiagram.tsx`. Test: 각 `*.test.tsx`.

- [ ] **Step 1~5:** `ScoreOverview`(히어로 종합점수 큰 숫자 + 카운트업[운세 카운트업 재사용 검토] + 4세부 바). `ElementFlowDiagram`(천간합화 노드, 상생/상극·보완 방향 화살표, 충 칩) — `CompatibilitySynastry` 입력. 색은 토큰만. 렌더 vitest + `check-colors --strict` 통과 → 커밋 `feat: 궁합 점수 오버뷰·오행 흐름 다이어그램`.

### Task 16: PersonSlotPicker

**Files:** Create `apps/web/components/compatibility/PersonSlotPicker.tsx`. Test: `*.test.tsx`.

- [ ] **Step 1~5:** 슬롯 A·B — 저장됨/최근 픽시트(`/question`·ChatEntrySheet 패턴 재사용) + "직접 입력" → 공용 `BirthInputForm`(바텀시트). 슬롯 A 기본=대표 프리필. 두 슬롯 다 차야 onComplete. 렌더/검증 테스트 → 커밋 `feat: 궁합 두 사람 슬롯 선택 컴포넌트`.

### Task 17~18: CompatibilityView + 페이지/OG

**Files:** Create `apps/web/components/compatibility/CompatibilityView.tsx`; `apps/web/app/[locale]/compatibility/new/page.tsx`, `[id]/page.tsx`, `shared/[token]/page.tsx`, `shared/[token]/opengraph-image.tsx`. i18n ko/en.

- [ ] **Step 1~5:** `CompatibilityView`=`<TabbedReport overview={<><ScoreOverview/><ElementFlowDiagram/></>} tabs={detail.tabs}/>` + 공유 버튼. new=PersonSlotPicker+request_topics+생성→로딩→[id]. shared=토큰 fetch 스냅샷(shareMode). OG=사주 리포트 OG 패턴(Noto Sans KR 서브셋) "이용재 ♥ 유다연 · 97". i18n 키 추가. `npx tsc`+vitest+check-i18n+check-colors 통과 → 커밋 `feat: 궁합 리포트 결과·공유 페이지`.

---

## Phase 6 — 챗 연계 · 히스토리 · 문서화

### Task 19: 챗 인라인 CTA + from-session

**Files:** Create `apps/web/components/chat/CompatibilityReportCTA.tsx`; Modify `apps/web/components/chat/ChatView.tsx`. (백엔드 from-session은 Task 11/12에서 완료.)

- [ ] **Step 1~5:** ChatView가 `tool_result` 블록 중 `tool==='check_compatibility'`(상대 첨부 상태) 뒤에 `CompatibilityReportCTA` 렌더. 클릭 → `createCompatibilityFromSession(sessionId)` → `/compatibility/[id]` 이동. `inline_partner` 블록 패턴 재사용(백엔드 SSE 변경 없음). 렌더 테스트 → 커밋 `feat: 챗에서 궁합 리포트 보러가기 CTA`.

### Task 20: 레코드 레지스트리 + 히스토리 하이브리드

**Files:** Create `apps/web/lib/records/registry.ts`; Modify `apps/web/components/my/MyRecordsClient.tsx`, `apps/web/app/[locale]/my/history/page.tsx` (+ 피드 클라이언트). i18n ko/en.

- [ ] **Step 1: 실패 테스트** — 레지스트리 순회로 섹션이 렌더되고, 히스토리 피드가 시간순 병합 + 칩 필터되는지(vitest).
- [ ] **Step 2~4:** `registry.ts`(RecordType[] — saju·fortune·consultation·compatibility, 각 fetch/href/renderCard/groupBy). `MyRecordsClient` → **종류별 섹션 미리보기**(탭 폐기, 각 섹션 카드 2~3 + "전체 보기 →"). `/my/history` → **통합 시간순 피드 + 가로 필터 칩**(전체+종류별). 기존 편집 토글 유지. 궁합 카드: `이용재 ♥ 유다연 · 97`. i18n 라벨. `npx tsc`+vitest+check-i18n+check-colors 통과.
- [ ] **Step 5: 커밋** — `feat: 내 기록을 레코드 레지스트리·피드+섹션 하이브리드로 개편`

### Task 21: 모듈화 규약 문서화

**Files:** Modify `CLAUDE.md`, `backend/CLAUDE.md`.

- [ ] **Step 1~2:** 루트 `CLAUDE.md`에 "리포트류 신규 기능 추가 = backend `ReportModule`+`runner`, frontend `TabbedReport`+레코드 레지스트리 항목" 규약 + 신규 리포트 체크리스트. `backend/CLAUDE.md`에 `llm/reports/` 모듈 계약·runner 사용법. 기능 현황표에 궁합 ✅ 갱신. 커밋 `docs: 리포트 모듈화 규약 CLAUDE.md에 추가`.

---

## 통합 검증 (모든 태스크 후)

- [ ] `cd backend && UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest -q`
- [ ] `cd apps/web && npx tsc --noEmit && npx vitest run`
- [ ] `cd packages/api-client && npx vitest run`
- [ ] `node apps/web/scripts/check-i18n.mjs && node apps/web/scripts/check-colors.mjs --strict`
- [ ] alembic 마이그레이션 적용 확인, 수동 스모크: /compatibility/new → 생성 → 공유 → 공개열람 → 챗 CTA → /my/history.

## 배포 운영 (코드 외)

- prod DB alembic upgrade (compatibility 테이블). pgvector·EMBEDDING_PROVIDER=openai 기설정 가정.
- 프롬프트 비용: Writer gpt-4.1 1회/리포트 — 사주 리포트와 동등.
