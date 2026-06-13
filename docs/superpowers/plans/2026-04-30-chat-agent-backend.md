# 사주구리 채팅 Agent 구현 계획 (백엔드 + CLI)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LangGraph ReAct 기반 영구 저장 사주 상담 채팅 에이전트 백엔드 구현 (API 5개 + CLI)

**Architecture:** LangGraph StateGraph(guard→agent→tools) + AsyncPostgresSaver(PostgreSQL). 세션 생성 시 만세력 1회 계산 후 saju_summary를 state에 저장, 매 턴 시스템 프롬프트에 주입. 12개 tool은 RunnableConfig.configurable["birth_info"]로 birth_info 수신.

**Tech Stack:** Python 3.10+, LangGraph 0.2+, langgraph-checkpoint-postgres, FastAPI, SQLAlchemy 2.0 async, Alembic, Typer

**Spec:** `docs/superpowers/specs/2026-04-30-chat-agent-design.md`

---

## 파일 맵

### 신규 생성
| 파일 | 역할 |
|---|---|
| `backend/llm/tools/__init__.py` | 빈 init |
| `backend/llm/tools/saju_tools.py` | @tool 래퍼 12개 + extract_summary() + 신규 엔진 로직 |
| `backend/llm/prompts/chat.py` | build_chat_system_prompt() + chat_report_prompt() |
| `backend/llm/pipelines/chat.py` | LangGraph StateGraph + build_chat_graph() |
| `backend/llm/pipelines/chat_report.py` | run_chat_report() 파이프라인 |
| `backend/schemas/chat.py` | 요청/응답 Pydantic 스키마 |
| `backend/crud/chat.py` | ChatSession, ChatReport CRUD |
| `backend/services/chat.py` | 채팅 비즈니스 로직 |
| `backend/routers/chat.py` | HTTP 엔드포인트 5개 |
| `backend/cli.py` | typer CLI 진입점 |
| `backend/tests/test_chat_tools.py` | extract_summary + 신규 tool 단위 테스트 |
| `backend/alembic/versions/0007_add_chat_tables.py` | 마이그레이션 |

### 수정
| 파일 | 변경 |
|---|---|
| `backend/pyproject.toml` | langgraph, langgraph-checkpoint-postgres, typer 추가 |
| `backend/db/models.py` | ChatSession, ChatReport 모델 추가 |
| `backend/core/errors.py` | CHAT_SESSION_NOT_FOUND 추가 |
| `backend/core/exceptions.py` | ChatSessionNotFoundException 추가 |
| `backend/core/config.py` | postgres_url 프로퍼티 추가 |
| `backend/main.py` | lifespan에 checkpointer 초기화, chat router 등록 |
| `backend/llm/guard.py` | history 파라미터 추가 |

---

## Task 1: 의존성 추가

**Files:**
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: 의존성 추가**

```toml
# backend/pyproject.toml dependencies 섹션에 추가
"langgraph>=0.2.0",
"langgraph-checkpoint-postgres>=2.0.0",
"psycopg[binary]>=3.1.0",
"typer>=0.12.0",
```

- [ ] **Step 2: 설치**

```bash
cd backend && uv sync
```

Expected: 패키지 설치 완료, 오류 없음

- [ ] **Step 3: import 확인**

```bash
cd backend && uv run python -c "import langgraph; import typer; print('ok')"
```

Expected: `ok`

---

## Task 2: guard.py에 history 파라미터 추가

**Files:**
- Modify: `backend/llm/guard.py`

- [ ] **Step 1: 기존 guard.py에서 함수 시그니처 확인 후 수정**

`guard_and_classify` 함수 시그니처를 다음으로 변경:

```python
async def guard_and_classify(
    question: str,
    provider: str | None = None,
    history: list[dict] | None = None,
) -> tuple[str | None, str, bool]:
```

프롬프트 구성 부분에서 history가 있으면 시스템 메시지에 포함:

```python
# 기존 system prompt 생성 직후에 추가
if history:
    history_text = "\n".join(
        f"{'사용자' if m.get('role') == 'user' else 'AI'}: {m.get('content', '')}"
        for m in history[-6:]  # 최근 6개만
    )
    system_content = system_content + f"\n\n[이전 대화]\n{history_text}"
```

- [ ] **Step 2: 기존 테스트 통과 확인**

```bash
cd backend && uv run pytest tests/ -v -k "guard" 2>/dev/null || echo "guard 테스트 없음, 계속"
```

---

## Task 3: DB 모델 + 에러/예외 + 설정 추가

**Files:**
- Modify: `backend/db/models.py`
- Modify: `backend/core/errors.py`
- Modify: `backend/core/exceptions.py`
- Modify: `backend/core/config.py`

- [ ] **Step 1: ChatSession, ChatReport 모델을 db/models.py에 추가**

```python
# backend/db/models.py 파일 끝에 추가

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id:               Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id:          Mapped[int]       = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title:            Mapped[str | None] = mapped_column(String(200), nullable=True)
    birth_info:       Mapped[dict]      = mapped_column(JSONB, nullable=False)
    created_at:       Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=_utcnow)
    last_message_at:  Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=_utcnow)


class ChatReport(Base):
    __tablename__ = "chat_reports"

    id:             Mapped[int]       = mapped_column(Integer, primary_key=True)
    session_id:     Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    summary:        Mapped[str]       = mapped_column(Text, nullable=False)
    key_insights:   Mapped[list]      = mapped_column(JSONB, nullable=False)
    advice:         Mapped[list]      = mapped_column(JSONB, nullable=False)
    topics_covered: Mapped[list]      = mapped_column(JSONB, nullable=False)
    created_at:     Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=_utcnow)
```

- [ ] **Step 2: ErrorCode에 CHAT_SESSION_NOT_FOUND 추가**

```python
# backend/core/errors.py ErrorCode enum에 추가 (# 404 Not Found 섹션)
CHAT_SESSION_NOT_FOUND = "CHAT_SESSION_NOT_FOUND"
```

```python
# _STATUS_MAP에 추가
ErrorCode.CHAT_SESSION_NOT_FOUND: 404,
```

- [ ] **Step 3: ChatSessionNotFoundException 추가**

```python
# backend/core/exceptions.py 끝에 추가

class ChatSessionNotFoundException(AppException):
    def __init__(self, session_id: str):
        super().__init__(
            ErrorCode.CHAT_SESSION_NOT_FOUND,
            "채팅 세션을 찾을 수 없습니다.",
            {"session_id": session_id},
        )
```

- [ ] **Step 4: Settings에 postgres_url 프로퍼티 추가**

```python
# backend/core/config.py Settings 클래스에 추가

@property
def postgres_url(self) -> str:
    """LangGraph AsyncPostgresSaver용 psycopg3 URL."""
    return self.database_url.replace("postgresql+asyncpg://", "postgresql://")
```

---

## Task 4: Alembic 마이그레이션

**Files:**
- Create: `backend/alembic/versions/0007_add_chat_tables.py`

- [ ] **Step 1: 마이그레이션 파일 생성**

```python
# backend/alembic/versions/0007_add_chat_tables.py
"""add chat_sessions and chat_reports tables

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("birth_info", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chat_sessions_user_id", "chat_sessions", ["user_id"])

    op.create_table(
        "chat_reports",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("summary", sa.Text, nullable=False),
        sa.Column("key_insights", JSONB, nullable=False),
        sa.Column("advice", JSONB, nullable=False),
        sa.Column("topics_covered", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chat_reports_session_id", "chat_reports", ["session_id"])


def downgrade() -> None:
    op.drop_table("chat_reports")
    op.drop_table("chat_sessions")
```

- [ ] **Step 2: 마이그레이션 적용**

```bash
cd backend && uv run alembic upgrade head
```

Expected: `Running upgrade 0006 -> 0007`

---

## Task 5: Pydantic 스키마

**Files:**
- Create: `backend/schemas/chat.py`

- [ ] **Step 1: schemas/chat.py 작성**

```python
# backend/schemas/chat.py
"""채팅 에이전트 요청/응답 스키마."""

from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class ChatSessionCreate(BaseModel):
    profile_id: int | None = Field(default=None, description="저장된 프로필 ID")
    birth_date: str | None = Field(default=None, description="생년월일 (YYYY-MM-DD)", examples=["1990-03-15"])
    birth_time: str | None = Field(default=None, description="태어난 시간 (HH:MM)", examples=["14:30"])
    gender: str | None = Field(default=None, description="성별 (male/female)", examples=["male"])
    calendar: str = Field(default="solar", description="양력/음력")
    is_leap_month: bool = Field(default=False)


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    birth_info: dict
    created_at: datetime
    last_message_at: datetime
    title: str | None

    model_config = {"from_attributes": True}


class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500, description="사용자 메시지")


class ChatHistoryMessage(BaseModel):
    role: str          # "human" | "ai" | "tool"
    content: str
    created_at: str | None = None


class ChatHistoryResponse(BaseModel):
    session_id: uuid.UUID
    messages: list[ChatHistoryMessage]


class ChatReportResponse(BaseModel):
    id: int
    session_id: uuid.UUID
    summary: str
    key_insights: list[str]
    advice: list[str]
    topics_covered: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}
```

---

## Task 6: extract_summary() 구현 및 테스트

**Files:**
- Create: `backend/llm/tools/__init__.py`
- Create: `backend/llm/tools/saju_tools.py` (extract_summary만 먼저)
- Create: `backend/tests/test_chat_tools.py`

- [ ] **Step 1: 실패 테스트 작성**

```python
# backend/tests/test_chat_tools.py
"""채팅 에이전트 tool 단위 테스트."""

import pytest
from llm.tools.saju_tools import extract_summary


def _make_saju_result() -> dict:
    """엔진 결과 최소 픽스처."""
    return {
        "day_pillar": {"stem": "갑", "branch": "진", "stem_element": "목", "branch_element": "토"},
        "year_pillar": {"stem": "경", "branch": "오", "stem_element": "금", "branch_element": "화"},
        "month_pillar": {"stem": "무", "branch": "자", "stem_element": "토", "branch_element": "수"},
        "hour_pillar": {"stem": "병", "branch": "인", "stem_element": "화", "branch_element": "목"},
        "gyeok_guk": {"name": "정관격"},
        "yong_sin": {"primary": ["화", "토"], "taboo": ["금", "수"]},
        "day_master_strength": {"level": "신약"},
        "current_dae_un": {"stem": "임", "branch": "술", "start_age": 32, "end_age": 42},
        "wuxing_count": {"목": 25.0, "화": 12.5, "토": 37.5, "금": 12.5, "수": 12.5},
        "ten_gods_distribution": {"정관": 35.0, "식신": 20.0, "정인": 45.0},
        "structure_patterns": ["식신생재 구조"],
        "sin_sals": [{"name": "천을귀인", "type": "lucky", "priority": "medium"}],
        "behavior_profile": {"독립성": 0.8, "사교성": 0.4},
        "life_domains": {"직업": ["전문직"], "연애": ["늦은 결혼"], "재물": ["식신생재"], "건강": ["토 허약"]},
        "branch_relations": {"sam_hap": [], "chung": [], "yuk_hap": []},
    }


class TestExtractSummary:
    def test_returns_required_keys(self):
        saju = _make_saju_result()
        summary = extract_summary(saju)
        required = [
            "day_stem", "day_element", "gyeok_guk", "yong_sin", "ji_sin",
            "strength", "pillars", "current_dae_un", "wuxing_pct",
            "ten_gods_distribution", "structure_patterns", "sin_sals",
            "behavior_profile", "life_domains", "branch_relations",
        ]
        for key in required:
            assert key in summary, f"Missing key: {key}"

    def test_pillars_all_four(self):
        saju = _make_saju_result()
        summary = extract_summary(saju)
        assert set(summary["pillars"].keys()) == {"year", "month", "day", "hour"}

    def test_sin_sals_stripped(self):
        saju = _make_saju_result()
        summary = extract_summary(saju)
        for sal in summary["sin_sals"]:
            assert set(sal.keys()) == {"name", "type", "priority"}

    def test_no_hour_pillar(self):
        saju = _make_saju_result()
        saju["hour_pillar"] = None
        summary = extract_summary(saju)
        assert "hour" not in summary["pillars"]
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd backend && uv run pytest tests/test_chat_tools.py::TestExtractSummary -v
```

Expected: `ImportError` 또는 `ModuleNotFoundError`

- [ ] **Step 3: extract_summary 구현**

```python
# backend/llm/tools/__init__.py
# (빈 파일)
```

```python
# backend/llm/tools/saju_tools.py
"""사주 에이전트 LangChain tool 래퍼 모음."""

from __future__ import annotations


def extract_summary(saju: dict) -> dict:
    """엔진 전체 결과에서 채팅 state 저장용 요약 추출."""
    pillars = {}
    for p in ["year", "month", "day", "hour"]:
        pillar = saju.get(f"{p}_pillar")
        if pillar:
            pillars[p] = {"stem": pillar["stem"], "branch": pillar["branch"]}

    return {
        "day_stem":    saju["day_pillar"]["stem"],
        "day_element": saju["day_pillar"]["stem_element"],
        "gyeok_guk":   saju["gyeok_guk"].get("name", ""),
        "yong_sin":    saju["yong_sin"].get("primary", []),
        "ji_sin":      saju["yong_sin"].get("taboo", []),
        "strength":    saju["day_master_strength"]["level"],
        "pillars":     pillars,
        "current_dae_un": {
            "stem":      saju["current_dae_un"]["stem"],
            "branch":    saju["current_dae_un"]["branch"],
            "start_age": saju["current_dae_un"]["start_age"],
            "end_age":   saju["current_dae_un"]["end_age"],
        },
        "wuxing_pct":            saju["wuxing_count"],
        "ten_gods_distribution": saju["ten_gods_distribution"],
        "structure_patterns":    saju["structure_patterns"],
        "sin_sals": [
            {"name": s["name"], "type": s["type"], "priority": s["priority"]}
            for s in saju["sin_sals"]
        ],
        "behavior_profile": saju["behavior_profile"],
        "life_domains":     saju["life_domains"],
        "branch_relations": {
            k: saju["branch_relations"].get(k, [])
            for k in ("sam_hap", "chung", "yuk_hap")
        },
    }
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd backend && uv run pytest tests/test_chat_tools.py::TestExtractSummary -v
```

Expected: 4개 PASS

- [ ] **Step 5: 커밋**

```bash
cd backend && git add llm/tools/ tests/test_chat_tools.py
git commit -m "feat: add extract_summary for chat agent state"
```

---

## Task 7: Tool 래퍼 — 기존 핸들러 (8개)

**Files:**
- Modify: `backend/llm/tools/saju_tools.py`

- [ ] **Step 1: 기존 핸들러 tool 래퍼 추가**

`saju_tools.py`에 imports와 tool 8개 추가:

```python
# saju_tools.py 상단에 추가
import asyncio
import json
from datetime import date as date_type
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig

from engine.handlers.calculate_saju import handle_calculate_saju
from engine.handlers.get_daily_fortune import handle_get_daily_fortune
from engine.handlers.get_wol_un import handle_get_wol_un
from engine.handlers.get_dae_un import handle_get_dae_un
from engine.handlers.get_yeon_un import handle_get_yeon_un
from engine.handlers.get_il_jin import handle_get_il_jin
from engine.handlers.convert_calendar import handle_convert_calendar
from engine.calc.ten_gods import calculate_ten_god
from engine.calc.se_un import calc_year_ganji, calc_month_ganji, get_element_interaction
from engine.calc.twelve_wun import get_twelve_wun
from engine.calc.ten_gods import get_branch_ten_god
from rag.search import handle_search_by_context


def _birth_info(config: RunnableConfig) -> dict:
    """RunnableConfig에서 birth_info 추출."""
    return config["configurable"]["birth_info"]


@tool
async def search_rag(query: str, domain: str = "general", config: RunnableConfig = None) -> str:
    """명리 지식 RAG 검색. domain: career/love/money/health/general"""
    results = await asyncio.to_thread(
        handle_search_by_context,
        context_ranking={"primary": [query], "secondary": []},
        life_domains={domain: [query]},
        concern=query,
    )
    return json.dumps(results, ensure_ascii=False)


@tool
async def get_daily_fortune(target_date: str | None = None, config: RunnableConfig = None) -> str:
    """오늘 또는 특정 날짜의 일진 운세. target_date: YYYY-MM-DD (생략 시 오늘)"""
    birth_info = _birth_info(config)
    result = await asyncio.to_thread(
        handle_get_daily_fortune,
        birth_date=birth_info["birth_date"],
        birth_time=birth_info.get("birth_time"),
        gender=birth_info["gender"],
        calendar=birth_info.get("calendar", "solar"),
        target_date=target_date,
    )
    return json.dumps(result, ensure_ascii=False)


@tool
async def get_wol_un(year: int | None = None, config: RunnableConfig = None) -> str:
    """특정 연도의 월운 12개. year 생략 시 올해."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day_stem = saju["day_pillar"]["stem"]
    target_year = year or date_type.today().year
    result = await asyncio.to_thread(handle_get_wol_un, year=target_year, day_stem=day_stem)
    return json.dumps(result, ensure_ascii=False)


@tool
async def get_dae_un(config: RunnableConfig = None) -> str:
    """대운 전체 목록 (12개)."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    return json.dumps(saju["dae_un_list"], ensure_ascii=False)


@tool
async def get_yeon_un(start_year: int | None = None, count: int = 5, config: RunnableConfig = None) -> str:
    """N년치 연운. start_year 생략 시 올해부터."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day_stem = saju["day_pillar"]["stem"]
    start = start_year or date_type.today().year
    result = await asyncio.to_thread(handle_get_yeon_un, start_year=start, count=min(count, 10), day_stem=day_stem)
    return json.dumps(result, ensure_ascii=False)


@tool
async def get_il_jin(year: int | None = None, month: int | None = None, config: RunnableConfig = None) -> str:
    """특정 월의 일진 달력. 생략 시 이번 달."""
    today = date_type.today()
    result = await asyncio.to_thread(
        handle_get_il_jin,
        year=year or today.year,
        month=month or today.month,
    )
    return json.dumps(result, ensure_ascii=False)


@tool
async def explain_past_event(target_date: str, config: RunnableConfig = None) -> str:
    """과거 특정 날짜/연도의 세운·월운 역산. target_date: YYYY-MM-DD 또는 YYYY"""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day_stem = saju["day_pillar"]["stem"]

    if len(target_date) == 4:  # YYYY
        year = int(target_date)
        result = await asyncio.to_thread(handle_get_yeon_un, start_year=year, count=1, day_stem=day_stem)
        return json.dumps({"type": "year", "data": result}, ensure_ascii=False)
    else:  # YYYY-MM-DD
        y, m, _ = map(int, target_date.split("-"))
        year_data = await asyncio.to_thread(handle_get_yeon_un, start_year=y, count=1, day_stem=day_stem)
        wol_data = await asyncio.to_thread(handle_get_wol_un, year=y, day_stem=day_stem)
        month_data = next((w for w in wol_data if w["month"] == m), None)
        return json.dumps({"type": "month", "year": year_data[0] if year_data else None, "month": month_data}, ensure_ascii=False)


@tool
async def convert_calendar(
    target_date: str,
    from_calendar: str = "solar",
    to_calendar: str = "lunar",
    config: RunnableConfig = None,
) -> str:
    """양력↔음력 변환. from_calendar/to_calendar: solar | lunar"""
    result = await asyncio.to_thread(
        handle_convert_calendar,
        date=target_date,
        from_calendar=from_calendar,
        to_calendar=to_calendar,
    )
    return json.dumps(result, ensure_ascii=False)
```

- [ ] **Step 2: import 확인**

```bash
cd backend && uv run python -c "from llm.tools.saju_tools import search_rag, get_daily_fortune; print('ok')"
```

Expected: `ok`

- [ ] **Step 3: 커밋**

```bash
git add backend/llm/tools/saju_tools.py
git commit -m "feat: add 8 existing-handler tool wrappers"
```

---

## Task 8: Tool 래퍼 — 신규 엔진 로직 (4개)

**Files:**
- Modify: `backend/llm/tools/saju_tools.py`
- Modify: `backend/tests/test_chat_tools.py`

- [ ] **Step 1: 신규 tool 테스트 추가**

```python
# tests/test_chat_tools.py에 추가

from llm.tools.saju_tools import (
    _compute_current_luck_overview,
    _compute_find_favorable_periods,
    _compute_evaluate_specific_date,
    _compute_check_current_sin_sal_timing,
)


class TestNewEngineTools:
    def test_current_luck_overview_keys(self):
        saju = _make_saju_result()
        result = _compute_current_luck_overview(saju)
        assert "current_dae_un" in result
        assert "se_un" in result
        assert "wol_un" in result
        assert "stem" in result["se_un"]

    def test_find_favorable_periods_domain(self):
        saju = _make_saju_result()
        result = _compute_find_favorable_periods(saju, domain="재물", years=3)
        assert "domain" in result
        assert "favorable" in result
        assert result["domain"] == "재물"

    def test_evaluate_specific_date_valid(self):
        saju = _make_saju_result()
        result = _compute_evaluate_specific_date(saju, target_date="2026-05-01", action="계약")
        assert "date" in result
        assert "ganji" in result
        assert "favorable" in result

    def test_check_sin_sal_timing_keys(self):
        saju = _make_saju_result()
        result = _compute_check_current_sin_sal_timing(saju)
        assert "in_sam_jae" in result
        assert "active_sin_sals" in result
        assert isinstance(result["in_sam_jae"], bool)
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd backend && uv run pytest tests/test_chat_tools.py::TestNewEngineTools -v
```

Expected: `ImportError`

- [ ] **Step 3: 신규 엔진 로직 구현 (순수 함수)**

```python
# saju_tools.py에 추가 (tool 정의 전에 순수 함수로 분리)

_DOMAIN_TEN_GODS: dict[str, list[str]] = {
    "연애": ["정관", "편관", "정재", "편재"],
    "재물": ["정재", "편재", "식신", "상관"],
    "직업": ["정관", "편관", "정인"],
    "이사": ["편관", "식신"],
    "general": [],
}

_SAM_JAE_MAP: dict[str, list[str]] = {
    "인": ["신", "유", "술"], "오": ["신", "유", "술"], "술": ["신", "유", "술"],
    "사": ["해", "자", "축"], "유": ["해", "자", "축"], "축": ["해", "자", "축"],
    "신": ["인", "묘", "진"], "자": ["인", "묘", "진"], "진": ["인", "묘", "진"],
    "해": ["사", "오", "미"], "묘": ["사", "오", "미"], "미": ["사", "오", "미"],
}


def _compute_current_luck_overview(saju: dict) -> dict:
    today = date_type.today()
    day_stem = saju["day_pillar"]["stem"]
    day_el = saju["day_pillar"]["stem_element"]
    yong_sin = saju["yong_sin"].get("primary", [])

    se_un_ganji = calc_year_ganji(today.year)
    se_un = {
        **se_un_ganji,
        "year": today.year,
        "stem_ten_god":   calculate_ten_god(day_stem, se_un_ganji["stem"]),
        "branch_ten_god": get_branch_ten_god(day_stem, se_un_ganji["branch"]),
        "twelve_wun":     get_twelve_wun(se_un_ganji["stem"], se_un_ganji["branch"]),
        "interaction_with_day_master": get_element_interaction(se_un_ganji["stem_element"], day_el),
        "interaction_with_yong_sin":   get_element_interaction(
            se_un_ganji["stem_element"], yong_sin[0] if yong_sin else ""
        ),
    }

    wol_ganji = calc_month_ganji(today.year, today.month)
    wol_un = {
        **wol_ganji,
        "month": today.month,
        "stem_ten_god":   calculate_ten_god(day_stem, wol_ganji["stem"]),
        "branch_ten_god": get_branch_ten_god(day_stem, wol_ganji["branch"]),
        "twelve_wun":     get_twelve_wun(wol_ganji["stem"], wol_ganji["branch"]),
        "interaction_with_day_master": get_element_interaction(wol_ganji["stem_element"], day_el),
    }

    return {
        "current_dae_un": saju["current_dae_un"],
        "se_un": se_un,
        "wol_un": wol_un,
        "yong_sin": yong_sin,
        "ji_sin": saju["yong_sin"].get("taboo", []),
    }


def _compute_find_favorable_periods(saju: dict, domain: str, years: int = 5) -> dict:
    day_stem = saju["day_pillar"]["stem"]
    yong_sin = saju["yong_sin"].get("primary", [])
    start = date_type.today().year
    from engine.handlers.get_yeon_un import handle_get_yeon_un
    yeon_un = handle_get_yeon_un(start_year=start, count=min(years, 10), day_stem=day_stem)

    domain_gods = _DOMAIN_TEN_GODS.get(domain, [])
    favorable, neutral = [], []
    for y in yeon_un:
        score = 0
        if y.get("stem_element") in yong_sin or y.get("branch_element") in yong_sin:
            score += 1
        if domain_gods and y.get("stem_ten_god") in domain_gods:
            score += 1
        entry = {**y, "favorability_score": score}
        (favorable if score >= 1 else neutral).append(entry)

    return {"domain": domain, "favorable": favorable, "neutral_or_unfavorable": neutral}


def _compute_evaluate_specific_date(saju: dict, target_date: str, action: str) -> dict:
    day_stem = saju["day_pillar"]["stem"]
    yong_sin = saju["yong_sin"].get("primary", [])
    ji_sin = saju["yong_sin"].get("taboo", [])

    y, m, _ = map(int, target_date.split("-"))
    il_jin_list = handle_get_il_jin(y, m)
    target_day = next((x for x in il_jin_list if x["date"] == target_date), None)
    if not target_day:
        return {"error": f"날짜를 찾을 수 없습니다: {target_date}"}

    return {
        "date": target_date,
        "ganji": target_day["ganji_name"],
        "stem": target_day["stem"],
        "branch": target_day["branch"],
        "stem_element": target_day.get("stem_element", ""),
        "branch_element": target_day.get("branch_element", ""),
        "stem_ten_god": calculate_ten_god(day_stem, target_day["stem"]),
        "branch_ten_god": get_branch_ten_god(day_stem, target_day["branch"]),
        "favorable": (
            target_day.get("stem_element") in yong_sin or
            target_day.get("branch_element") in yong_sin
        ),
        "unfavorable": (
            target_day.get("stem_element") in ji_sin or
            target_day.get("branch_element") in ji_sin
        ),
        "action": action,
    }


def _compute_check_current_sin_sal_timing(saju: dict) -> dict:
    today = date_type.today()
    year_ganji = calc_year_ganji(today.year)
    month_ganji = calc_month_ganji(today.year, today.month)
    year_branch = year_ganji["branch"]

    year_pillar_branch = saju["year_pillar"]["branch"]
    in_sam_jae = year_branch in _SAM_JAE_MAP.get(year_pillar_branch, [])

    active = []
    for sal in saju.get("sin_sals", []):
        if sal["name"] == "역마살":
            _YEOKMA = {"인": "신", "신": "인", "사": "해", "해": "사"}
            for pillar_key in ["year_pillar", "month_pillar"]:
                p_branch = saju.get(pillar_key, {}).get("branch", "")
                if _YEOKMA.get(p_branch) == year_branch:
                    active.append({**sal, "triggered_by": f"{today.year}년 세운", "reason": "역마충 발동"})
                    break

    return {
        "year": today.year,
        "month": today.month,
        "in_sam_jae": in_sam_jae,
        "active_sin_sals": active,
        "current_year_branch": year_branch,
        "current_month_branch": month_ganji["branch"],
    }
```

- [ ] **Step 4: @tool 래퍼 4개 추가**

```python
# saju_tools.py에 추가

@tool
async def get_current_luck_overview(config: RunnableConfig = None) -> str:
    """현재 대운+세운+월운 교차 분석. '지금 어떤 시기예요?' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    result = _compute_current_luck_overview(saju)
    return json.dumps(result, ensure_ascii=False)


@tool
async def find_favorable_periods(
    domain: str = "general",
    years: int = 5,
    config: RunnableConfig = None,
) -> str:
    """도메인별 길한 시기. domain: 연애/재물/직업/이사/general. years: 조회 연수(최대10)"""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    result = _compute_find_favorable_periods(saju, domain=domain, years=years)
    return json.dumps(result, ensure_ascii=False)


@tool
async def evaluate_specific_date(
    target_date: str,
    action: str = "일반",
    config: RunnableConfig = None,
) -> str:
    """특정 날짜 길흉 판단. target_date: YYYY-MM-DD, action: 계약/이사/결혼 등"""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    result = _compute_evaluate_specific_date(saju, target_date=target_date, action=action)
    return json.dumps(result, ensure_ascii=False)


@tool
async def check_current_sin_sal_timing(config: RunnableConfig = None) -> str:
    """현재 삼재 여부 및 활성화된 신살 확인. '지금 삼재인가요?' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    result = _compute_check_current_sin_sal_timing(saju)
    return json.dumps(result, ensure_ascii=False)
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd backend && uv run pytest tests/test_chat_tools.py -v
```

Expected: 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add backend/llm/tools/saju_tools.py backend/tests/test_chat_tools.py
git commit -m "feat: add 4 new engine tools for chat agent"
```

---

## Task 9: 시스템 프롬프트 + chat_report 프롬프트

**Files:**
- Create: `backend/llm/prompts/chat.py`

- [ ] **Step 1: chat.py 작성**

```python
# backend/llm/prompts/chat.py
"""채팅 에이전트 프롬프트 포맷터."""

from __future__ import annotations


def build_chat_system_prompt(saju_summary: dict) -> str:
    """매 턴 saju_summary를 시스템 프롬프트에 주입."""
    pillars = saju_summary.get("pillars", {})

    def pillar_str(p: dict) -> str:
        return f"{p['stem']}{p['branch']}"

    pillar_text = " / ".join(
        f"{name}주: {pillar_str(pillars[name])}"
        for name in ["year", "month", "day", "hour"]
        if name in pillars
    )

    sin_sals = saju_summary.get("sin_sals", [])
    sin_sal_text = ", ".join(s["name"] for s in sin_sals) if sin_sals else "없음"

    life_domains = saju_summary.get("life_domains", {})
    domain_text = "\n".join(
        f"  {k}: {', '.join(v)}" for k, v in life_domains.items()
    )

    yong_sin = saju_summary.get("yong_sin", [])
    ji_sin = saju_summary.get("ji_sin", [])

    return f"""당신은 수십 년 경력의 사주명리 전문 상담가입니다. 아래 사주 정보를 바탕으로 진심 어린 상담을 제공합니다.

[사용자 사주 정보]
일간: {saju_summary.get('day_stem', '')} ({saju_summary.get('day_element', '')})
격국: {saju_summary.get('gyeok_guk', '')}
일간강약: {saju_summary.get('strength', '')}
용신: {', '.join(yong_sin)} | 기신: {', '.join(ji_sin)}
사주원국: {pillar_text}
현재대운: {saju_summary.get('current_dae_un', {}).get('stem', '')}{saju_summary.get('current_dae_un', {}).get('branch', '')} ({saju_summary.get('current_dae_un', {}).get('start_age', '')}~{saju_summary.get('current_dae_un', {}).get('end_age', '')}세)
신살: {sin_sal_text}

[도메인별 특성]
{domain_text}

[상담 원칙]
- 고민이 불명확하면 tool 호출 전 핵심 질문 1개만 먼저 물어보세요
- 한 번에 질문은 1개 이하로 제한합니다
- tool은 계산 데이터만 반환합니다. 사주 해석과 조언은 당신이 직접 합니다
- 결론형 문장으로 핵심을 먼저 말한 뒤 근거를 설명하세요
- 어려운 용어는 쉽게 풀어서 설명하세요"""


def build_chat_report_prompt(saju_summary: dict, conversation: str) -> str:
    """채팅 히스토리 기반 리포트 생성 프롬프트."""
    return f"""아래 사주 상담 대화를 분석하여 JSON 형식의 상담 리포트를 작성하세요.

[사주 정보]
일간: {saju_summary.get('day_stem', '')} / 격국: {saju_summary.get('gyeok_guk', '')} / 강약: {saju_summary.get('strength', '')}

[상담 대화]
{conversation}

다음 JSON 형식으로만 응답하세요:
{{
  "summary": "상담 전체 요약 (3-5문장, 결론 중심)",
  "key_insights": ["인사이트1", "인사이트2", "인사이트3"],
  "advice": ["조언1", "조언2", "조언3"],
  "topics_covered": ["주제1", "주제2"]
}}

규칙:
- key_insights: 결론형 문장으로 3-5개 (단순 카테고리명 금지)
- advice: 구체적이고 실행 가능한 조언 3개
- topics_covered: 실제 대화에서 다룬 주제만"""
```

- [ ] **Step 2: import 확인**

```bash
cd backend && uv run python -c "from llm.prompts.chat import build_chat_system_prompt; print(build_chat_system_prompt({'day_stem':'갑','day_element':'목','gyeok_guk':'정관격','strength':'신약','yong_sin':['화'],'ji_sin':['금'],'pillars':{},'current_dae_un':{'stem':'임','branch':'술','start_age':32,'end_age':42},'sin_sals':[],'life_domains':{}})[:50])"
```

Expected: 프롬프트 첫 50자 출력

---

## Task 10: LangGraph 그래프 + Checkpointer

**Files:**
- Create: `backend/llm/pipelines/chat.py`
- Modify: `backend/main.py`

- [ ] **Step 1: chat.py (LangGraph 그래프) 작성**

```python
# backend/llm/pipelines/chat.py
"""LangGraph ReAct 채팅 에이전트 그래프."""

from __future__ import annotations
import json
from typing import Annotated

from langchain_core.messages import AIMessage, SystemMessage, HumanMessage, BaseMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from typing_extensions import TypedDict

from llm.guard import guard_and_classify
from llm.providers import get_llm
from llm.prompts.chat import build_chat_system_prompt
from llm.tools.saju_tools import (
    search_rag, get_daily_fortune, get_wol_un, get_dae_un,
    get_yeon_un, get_il_jin, convert_calendar,
    get_current_luck_overview, find_favorable_periods,
    evaluate_specific_date, explain_past_event, check_current_sin_sal_timing,
)

CHAT_TOOLS = [
    search_rag, get_daily_fortune, get_wol_un, get_dae_un,
    get_yeon_un, get_il_jin, convert_calendar,
    get_current_luck_overview, find_favorable_periods,
    evaluate_specific_date, explain_past_event, check_current_sin_sal_timing,
]


class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    birth_info: dict
    saju_summary: dict


async def guard_node(state: ChatState) -> dict:
    """입력 검증 + 차단."""
    last_msg = state["messages"][-1]
    history = [
        {"role": "user" if isinstance(m, HumanMessage) else "ai", "content": m.content}
        for m in state["messages"][:-1]
        if hasattr(m, "content")
    ]
    block_msg, _category, _is_instant = await guard_and_classify(
        question=last_msg.content,
        history=history[-6:],
    )
    if block_msg:
        return {"messages": [AIMessage(content=block_msg)]}
    return {}


def route_guard(state: ChatState) -> str:
    """guard 후 라우팅: 차단됐으면 END, 아니면 agent."""
    last = state["messages"][-1]
    if isinstance(last, AIMessage):
        return "blocked"
    return "agent"


async def agent_node(state: ChatState) -> dict:
    """LLM 추론 — saju_summary를 시스템 프롬프트에 주입."""
    llm = get_llm().bind_tools(CHAT_TOOLS)
    system = build_chat_system_prompt(state["saju_summary"])
    messages = [SystemMessage(content=system)] + list(state["messages"])
    response = await llm.ainvoke(messages)
    return {"messages": [response]}


def should_continue(state: ChatState) -> str:
    """tool 호출 여부에 따라 분기."""
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return "end"


def build_chat_graph(checkpointer):
    """LangGraph 그래프 빌드 + checkpointer 연결."""
    builder = StateGraph(ChatState)
    builder.add_node("guard", guard_node)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", ToolNode(CHAT_TOOLS))

    builder.set_entry_point("guard")
    builder.add_conditional_edges(
        "guard",
        route_guard,
        {"blocked": END, "agent": "agent"},
    )
    builder.add_conditional_edges(
        "agent",
        should_continue,
        {"tools": "tools", "end": END},
    )
    builder.add_edge("tools", "agent")

    return builder.compile(checkpointer=checkpointer)
```

- [ ] **Step 2: main.py lifespan에 checkpointer 추가**

```python
# main.py 상단 import에 추가
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

# lifespan 함수 교체
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 기존: DB create_all
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning("DB 연결 실패 (create_all 건너뜀): %s", e)

    # 신규: LangGraph checkpointer
    async with await AsyncPostgresSaver.from_conn_string(settings.postgres_url) as checkpointer:
        await checkpointer.setup()
        app.state.checkpointer = checkpointer
        yield
```

- [ ] **Step 3: import 확인**

```bash
cd backend && uv run python -c "from llm.pipelines.chat import build_chat_graph; print('ok')"
```

Expected: `ok`

- [ ] **Step 4: 커밋**

```bash
git add backend/llm/pipelines/chat.py backend/main.py backend/core/config.py
git commit -m "feat: add LangGraph chat graph with AsyncPostgresSaver"
```

---

## Task 11: 채팅 리포트 파이프라인

**Files:**
- Create: `backend/llm/pipelines/chat_report.py`

- [ ] **Step 1: chat_report.py 작성**

```python
# backend/llm/pipelines/chat_report.py
"""채팅 히스토리 → 상담 리포트 파이프라인."""

from __future__ import annotations
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel

from llm.providers import get_llm
from llm.prompts.chat import build_chat_report_prompt
from llm.writer import _parse_with_recovery


class ChatReportOutput(BaseModel):
    summary: str
    key_insights: list[str]
    advice: list[str]
    topics_covered: list[str]


async def run_chat_report(
    messages: list[BaseMessage],
    saju_summary: dict,
    provider: str | None = None,
) -> ChatReportOutput:
    """채팅 메시지 목록 + saju_summary → ChatReportOutput."""
    # 대화를 텍스트로 변환
    lines = []
    for m in messages:
        if isinstance(m, HumanMessage):
            lines.append(f"사용자: {m.content}")
        elif isinstance(m, AIMessage) and m.content:
            lines.append(f"상담사: {m.content}")
    conversation = "\n".join(lines)

    if not conversation.strip():
        return ChatReportOutput(
            summary="대화 내용이 없습니다.",
            key_insights=[],
            advice=[],
            topics_covered=[],
        )

    llm = get_llm(provider)
    parser = PydanticOutputParser(pydantic_object=ChatReportOutput)
    prompt = build_chat_report_prompt(saju_summary, conversation)

    from langchain_core.messages import SystemMessage
    raw = await llm.ainvoke([SystemMessage(content=prompt)])
    return await _parse_with_recovery(llm, raw, parser, parser.get_format_instructions())
```

- [ ] **Step 2: import 확인**

```bash
cd backend && uv run python -c "from llm.pipelines.chat_report import run_chat_report, ChatReportOutput; print('ok')"
```

Expected: `ok`

---

## Task 12: CRUD

**Files:**
- Create: `backend/crud/chat.py`

- [ ] **Step 1: crud/chat.py 작성**

```python
# backend/crud/chat.py
"""ChatSession, ChatReport CRUD."""

from __future__ import annotations
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import ChatSessionNotFoundException
from db.models import ChatSession, ChatReport


async def create_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: int,
    birth_info: dict,
) -> ChatSession:
    session = ChatSession(
        id=session_id,
        user_id=user_id,
        birth_info=birth_info,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session_or_404(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: int,
) -> ChatSession:
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ChatSessionNotFoundException(str(session_id))
    return session


async def list_sessions(
    db: AsyncSession,
    user_id: int,
    limit: int = 20,
) -> list[ChatSession]:
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.last_message_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def update_last_message_at(
    db: AsyncSession,
    session_id: uuid.UUID,
) -> None:
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session:
        session.last_message_at = datetime.now(timezone.utc)
        await db.commit()


async def create_report(
    db: AsyncSession,
    session_id: uuid.UUID,
    summary: str,
    key_insights: list[str],
    advice: list[str],
    topics_covered: list[str],
) -> ChatReport:
    report = ChatReport(
        session_id=session_id,
        summary=summary,
        key_insights=key_insights,
        advice=advice,
        topics_covered=topics_covered,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


async def get_report_by_session(
    db: AsyncSession,
    session_id: uuid.UUID,
) -> ChatReport | None:
    result = await db.execute(
        select(ChatReport)
        .where(ChatReport.session_id == session_id)
        .order_by(ChatReport.created_at.desc())
    )
    return result.scalar_one_or_none()
```

---

## Task 13: Service

**Files:**
- Create: `backend/services/chat.py`

- [ ] **Step 1: services/chat.py 작성**

```python
# backend/services/chat.py
"""채팅 에이전트 비즈니스 로직."""

from __future__ import annotations
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import CalcFailedException, LLMFailedException
from crud import chat as chat_crud
from db.models import ChatSession, ChatReport
from engine.handlers.calculate_saju import handle_calculate_saju
from llm.tools.saju_tools import extract_summary


async def create_chat_session(
    db: AsyncSession,
    user_id: int,
    birth_info: dict,
    checkpointer,
) -> ChatSession:
    """
    1. 만세력 1회 계산
    2. saju_summary 추출
    3. LangGraph initial state 저장
    4. ChatSession DB 저장
    """
    import asyncio
    try:
        saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    except ValueError as e:
        raise CalcFailedException(str(e)) from e

    saju_summary = extract_summary(saju)
    session_id = uuid.uuid4()

    # LangGraph initial state 저장
    from llm.pipelines.chat import build_chat_graph
    graph = build_chat_graph(checkpointer)
    config = {"configurable": {"thread_id": str(session_id), "birth_info": birth_info}}
    await graph.aupdate_state(config, {"birth_info": birth_info, "saju_summary": saju_summary})

    return await chat_crud.create_session(
        db=db,
        session_id=session_id,
        user_id=user_id,
        birth_info=birth_info,
    )


async def generate_chat_report(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: int,
    checkpointer,
) -> ChatReport:
    """채팅 히스토리 전체 → 리포트 생성."""
    from llm.pipelines.chat import build_chat_graph
    from llm.pipelines.chat_report import run_chat_report

    session = await chat_crud.get_session_or_404(db, session_id, user_id)

    # checkpointer에서 메시지 조회
    graph = build_chat_graph(checkpointer)
    config = {"configurable": {"thread_id": str(session_id)}}
    state_snapshot = await graph.aget_state(config)
    messages = state_snapshot.values.get("messages", [])
    saju_summary = state_snapshot.values.get("saju_summary", {})

    try:
        report_output = await run_chat_report(messages=messages, saju_summary=saju_summary)
    except Exception as e:
        raise LLMFailedException(str(e)) from e

    return await chat_crud.create_report(
        db=db,
        session_id=session_id,
        summary=report_output.summary,
        key_insights=report_output.key_insights,
        advice=report_output.advice,
        topics_covered=report_output.topics_covered,
    )
```

---

## Task 14: Router + main.py 등록

**Files:**
- Create: `backend/routers/chat.py`
- Modify: `backend/main.py`

- [ ] **Step 1: routers/chat.py 작성**

```python
# backend/routers/chat.py
"""채팅 에이전트 라우터."""

from __future__ import annotations
import json
import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user
from crud import chat as chat_crud
from db.models import User
from db.session import get_db
from llm.pipelines.chat import build_chat_graph
from schemas.chat import (
    ChatSessionCreate, ChatSessionResponse,
    ChatMessageRequest, ChatHistoryResponse, ChatHistoryMessage,
    ChatReportResponse,
)
from services.chat import create_chat_session, generate_chat_report

router = APIRouter(prefix="/api/chat", tags=["채팅 에이전트"])


def _get_checkpointer(request: Request):
    return request.app.state.checkpointer


@router.post("/session", response_model=ChatSessionResponse)
async def create_session(
    req: ChatSessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    checkpointer=Depends(_get_checkpointer),
):
    # profile_id 있으면 birth_info 조회
    if req.profile_id:
        from crud.profiles import get_profile_or_404
        profile = await get_profile_or_404(db, req.profile_id, user.id)
        birth_info = {
            "birth_date": str(profile.birth_date),
            "birth_time": str(profile.birth_time) if profile.birth_time else None,
            "gender": profile.gender,
            "calendar": profile.calendar,
            "is_leap_month": profile.is_leap_month,
        }
    else:
        birth_info = {
            "birth_date": req.birth_date,
            "birth_time": req.birth_time,
            "gender": req.gender,
            "calendar": req.calendar,
            "is_leap_month": req.is_leap_month,
        }

    session = await create_chat_session(
        db=db, user_id=user.id, birth_info=birth_info, checkpointer=checkpointer
    )
    return session


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await chat_crud.list_sessions(db, user.id)


@router.post("/{session_id}/message")
async def send_message(
    session_id: uuid.UUID,
    req: ChatMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    checkpointer=Depends(_get_checkpointer),
):
    session = await chat_crud.get_session_or_404(db, session_id, user.id)
    graph = build_chat_graph(checkpointer)
    config = {
        "configurable": {
            "thread_id": str(session_id),
            "birth_info": session.birth_info,
        }
    }

    async def event_stream():
        async for event in graph.astream_events(
            {"messages": [HumanMessage(content=req.message)]},
            config=config,
            version="v2",
        ):
            if event["event"] == "on_chat_model_stream":
                chunk = event["data"].get("chunk")
                if chunk and chunk.content:
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"
        await chat_crud.update_last_message_at(db, session_id)
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/{session_id}/history", response_model=ChatHistoryResponse)
async def get_history(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    checkpointer=Depends(_get_checkpointer),
):
    await chat_crud.get_session_or_404(db, session_id, user.id)
    graph = build_chat_graph(checkpointer)
    config = {"configurable": {"thread_id": str(session_id)}}
    snapshot = await graph.aget_state(config)
    messages = snapshot.values.get("messages", []) if snapshot else []

    from langchain_core.messages import HumanMessage as HM, AIMessage as AM
    result = []
    for m in messages:
        role = "human" if isinstance(m, HM) else "ai"
        if hasattr(m, "content") and m.content:
            result.append(ChatHistoryMessage(role=role, content=m.content))

    return ChatHistoryResponse(session_id=session_id, messages=result)


@router.post("/{session_id}/report", response_model=ChatReportResponse)
async def create_report(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    checkpointer=Depends(_get_checkpointer),
):
    report = await generate_chat_report(
        db=db, session_id=session_id, user_id=user.id, checkpointer=checkpointer
    )
    return report
```

- [ ] **Step 2: main.py에 chat router 등록**

```python
# main.py 상단 import 수정
from routers import saju, cities, auth, profiles, share, question, chat

# 라우터 등록 섹션에 추가
app.include_router(chat.router)
```

- [ ] **Step 3: 서버 실행 확인**

```bash
cd backend && uv run uvicorn main:app --reload --port 8000
```

Expected: 서버 정상 기동, `/docs`에서 `/api/chat/*` 엔드포인트 5개 확인

- [ ] **Step 4: 커밋**

```bash
git add backend/routers/chat.py backend/services/chat.py backend/crud/chat.py backend/schemas/chat.py backend/main.py
git commit -m "feat: add chat agent router, service, crud"
```

---

## Task 15: CLI

**Files:**
- Create: `backend/cli.py`

- [ ] **Step 1: cli.py 작성**

```python
# backend/cli.py
"""사주구리 CLI — typer 기반 터미널 채팅."""

from __future__ import annotations
import asyncio
import uuid
from typing import Optional

import typer
from dotenv import load_dotenv
load_dotenv()

app = typer.CLI(name="sajuguri")


async def _run_chat(birth_date: str, birth_time: str | None, gender: str) -> None:
    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    from langchain_core.messages import HumanMessage, AIMessage
    from engine.handlers.calculate_saju import handle_calculate_saju
    from llm.tools.saju_tools import extract_summary
    from llm.pipelines.chat import build_chat_graph
    from core.config import settings

    birth_info = {
        "birth_date": birth_date,
        "birth_time": birth_time,
        "gender": gender,
        "calendar": "solar",
        "is_leap_month": False,
    }

    typer.echo("사주를 분석하는 중...")
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    saju_summary = extract_summary(saju)
    session_id = str(uuid.uuid4())

    async with await AsyncPostgresSaver.from_conn_string(settings.postgres_url) as checkpointer:
        await checkpointer.setup()
        graph = build_chat_graph(checkpointer)
        config = {
            "configurable": {
                "thread_id": session_id,
                "birth_info": birth_info,
            }
        }
        await graph.aupdate_state(config, {"birth_info": birth_info, "saju_summary": saju_summary})

        typer.echo(f"\n사주구리 상담을 시작합니다. ({saju_summary['day_stem']}일간 {saju_summary['gyeok_guk']})")
        typer.echo("종료: Ctrl+C\n")

        while True:
            try:
                user_input = typer.prompt("나")
            except (KeyboardInterrupt, EOFError):
                typer.echo("\n상담을 종료합니다.")
                break

            response_text = ""
            typer.echo("상담사: ", nl=False)
            async for event in graph.astream_events(
                {"messages": [HumanMessage(content=user_input)]},
                config=config,
                version="v2",
            ):
                if event["event"] == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    if chunk and chunk.content:
                        typer.echo(chunk.content, nl=False)
                        response_text += chunk.content
            typer.echo()


@app.command()
def chat(
    birth_date: Optional[str] = typer.Option(None, "--birth-date", "-d", help="생년월일 (YYYY-MM-DD)"),
    birth_time: Optional[str] = typer.Option(None, "--birth-time", "-t", help="태어난 시간 (HH:MM)"),
    gender: Optional[str] = typer.Option(None, "--gender", "-g", help="성별 (male/female)"),
):
    """사주 상담 채팅 시작."""
    if not birth_date:
        birth_date = typer.prompt("생년월일 (YYYY-MM-DD)")
    if not birth_time:
        birth_time_input = typer.prompt("태어난 시간 (모르면 엔터)", default="")
        birth_time = birth_time_input or None
    if not gender:
        gender = typer.prompt("성별 (male/female)")

    asyncio.run(_run_chat(birth_date, birth_time, gender))


if __name__ == "__main__":
    app()
```

- [ ] **Step 2: CLI 실행 확인 (도움말)**

```bash
cd backend && uv run python cli.py --help
```

Expected:
```
Usage: cli.py [OPTIONS] COMMAND [ARGS]...
Commands:
  chat  사주 상담 채팅 시작.
```

- [ ] **Step 3: 커밋**

```bash
git add backend/cli.py
git commit -m "feat: add typer CLI for terminal chat"
```

---

## 자체 검토 결과

**스펙 커버리지:**
- ✅ 멀티턴 채팅 영구 저장 (AsyncPostgresSaver)
- ✅ 채팅 기반 리포트 (chat_report.py)
- ✅ CLI 진입점 (cli.py)
- ✅ 12개 tool
- ✅ saju_summary 시스템 프롬프트 주입
- ✅ guard_node + history 파라미터
- ✅ SSE 스트리밍 (astream_events)
- ✅ profile_id OR birth_info 세션 생성
- ✅ DB 모델 2개 (ChatSession, ChatReport)
- ✅ 5개 API 엔드포인트

**프론트엔드:** 별도 계획 파일 `2026-04-30-chat-agent-frontend.md` 참조
