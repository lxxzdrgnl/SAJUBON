# 사주구리 채팅 Agent 설계

**작성일:** 2026-04-30  
**상태:** 승인 대기

---

## 1. 개요

Dexter 스타일의 사주 상담 채팅 Agent. LangGraph ReAct 패턴 + PostgreSQL 영구 저장.

### 기능 범위
- **멀티턴 채팅**: 영구 저장, 언제든 이어서 대화 가능
- **채팅 기반 리포트**: 대화 종료 후 전체 히스토리 → 요약 + 핵심 인사이트 + 맞춤 조언
- **CLI 진입점**: FastAPI와 동일한 그래프, 터미널에서 실행

---

## 2. 아키텍처

```
[Web Frontend]
  POST /api/chat/session          세션 생성 (birth_info OR profile_id)
  POST /api/chat/{id}/message     메시지 전송 (SSE 스트리밍)
  GET  /api/chat/{id}/history     히스토리 조회
  POST /api/chat/{id}/report      채팅 종료 후 리포트 생성
  GET  /api/chat/sessions         세션 목록
       │
       ▼
Router → Service → LangGraph ReAct Agent
                         │
                    [guard_node]          입력 검증 + 차단
                         │
                    [agent_node]          LLM 추론
                         │
                    [tools_node]          tool 실행
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     search_rag   get_daily_fortune  get_wol_un / get_dae_un
     (RAG)        (engine handler)   (engine handlers)
          │
          ▼
    AsyncPostgresSaver (기존 PostgreSQL)

[CLI]
  python -m cli chat [--birth-date ...] [--birth-time ...] [--gender ...]
  → 인자 없으면 대화형 입력
  → 동일한 LangGraph 그래프 사용
```

---

## 3. LangGraph State

```python
class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    birth_info: dict          # {date, time, gender, calendar}
    saju_summary: dict        # 세션 시작 시 1회 계산, 이후 재사용
```

**saju_summary 구조:**
```python
{
    "day_stem": "갑",
    "day_element": "목",
    "gyeok_guk": "정관격",
    "yong_sin": ["화", "토"],
    "ji_sin": ["금", "수"],
    "strength": "신약",
    "pillars": {
        "year":  {"stem": "경", "branch": "오"},
        "month": {"stem": "무", "branch": "자"},
        "day":   {"stem": "갑", "branch": "진"},
        "hour":  {"stem": "병", "branch": "인"},
    },
    "current_dae_un": {"stem": "임", "branch": "술", "start_age": 32, "end_age": 42},
    "wuxing_pct": {"목": 25.0, "화": 12.5, "토": 37.5, "금": 12.5, "수": 12.5},
}
```

전체 엔진 결과(~50개 키)는 저장하지 않음 → 체크포인트 비대화 방지.

---

## 4. 사주 데이터 전략

### 세션 생성 시 (1회)
```
POST /api/chat/session
  └─ handle_calculate_saju() 호출
  └─ extract_summary() → saju_summary
  └─ LangGraph initial state 저장
  └─ ChatSession DB 저장 (thread_id + user_id)
```

### 이후 매 턴
재계산 없음. `saju_summary`를 system prompt에 동적 주입:

```python
def agent_node(state: ChatState):
    system = f"""당신은 사주 상담가입니다.

[사용자 사주]
일간: {state['saju_summary']['day_stem']} ({state['saju_summary']['day_element']})
격국: {state['saju_summary']['gyeok_guk']}
용신: {', '.join(state['saju_summary']['yong_sin'])}
...
"""
    messages = [SystemMessage(content=system)] + state["messages"]
    return {"messages": [llm_with_tools.invoke(messages)]}
```

### CLI 세션 생성
- 인자(`--birth-date`, `--birth-time`, `--gender`) 있으면 즉시 계산
- 인자 없으면 대화형 입력 후 계산

---

## 5. Agent Tools

| Tool | 설명 | 내부 호출 |
|---|---|---|
| `search_rag` | 명리 지식 검색 | `handle_search_by_context()` |
| `get_daily_fortune` | 오늘/특정일 운세 | `handle_get_daily_fortune()` |
| `get_wol_un` | 월운 | `get_wol_un()` handler |
| `get_dae_un` | 대운 목록 | `get_dae_un()` handler |

모든 tool은 `async def` + `asyncio.to_thread()` 패턴으로 블로킹 방지.

---

## 6. 채팅 기반 리포트

### 포맷
10탭 saju_report와 별개. 대화 맥락 기반 자유 형식:

```python
class ChatReportOutput(BaseModel):
    summary: str              # 상담 전체 요약 (3-5문장)
    key_insights: list[str]   # 핵심 인사이트 3-5개 (결론형 문장)
    advice: list[str]         # 맞춤 조언 3개
    topics_covered: list[str] # 대화에서 다룬 주제들
```

### 파이프라인
```
POST /api/chat/{id}/report
  └─ checkpointer에서 thread_id로 전체 메시지 조회
  └─ saju_summary + 대화 히스토리 → chat_report 프롬프트
  └─ LLM 호출 → ChatReportOutput 파싱
  └─ DB 저장 후 반환
```

---

## 7. DB 모델

```python
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: UUID (PK)              # = LangGraph thread_id
    user_id: int (FK)
    title: str | None          # 보류
    birth_info: JSON           # {date, time, gender, calendar} — saju_summary 재생성용
    created_at: datetime
    last_message_at: datetime

class ChatReport(Base):
    __tablename__ = "chat_reports"

    id: int (PK, autoincrement)
    session_id: UUID (FK → chat_sessions.id)
    summary: str
    key_insights: JSON         # list[str]
    advice: JSON               # list[str]
    topics_covered: JSON       # list[str]
    created_at: datetime
```

메시지는 LangGraph `AsyncPostgresSaver`가 자체 테이블(`checkpoints` 등)에 관리.  
`GET /api/chat/{id}/history`는 checkpointer에서 thread_id로 메시지를 읽어 반환.

---

## 8. 파일 구조

```
backend/
├── llm/
│   ├── tools/
│   │   └── saju_tools.py         # @tool 래퍼 4개 + extract_summary()
│   ├── pipelines/
│   │   ├── chat.py               # LangGraph StateGraph 정의
│   │   └── chat_report.py        # 채팅→리포트 파이프라인
│   └── prompts/
│       └── chat.py               # 채팅 system prompt 포맷터
├── routers/
│   └── chat.py
├── services/
│   └── chat.py
├── crud/
│   └── chat.py
├── models/
│   └── chat.py                   # ChatSession
└── cli.py                        # typer CLI 진입점
```

---

## 9. Agent 대화 전략

- **선제 질문**: 고민이 불명확하면 tool 호출 전 맥락 파악 질문 1개 먼저
- **질문 제한**: 한 번에 1개 이하 (대화 흐름 방해 방지)
- **효과**: 대화 히스토리에 사용자 맥락이 쌓여 리포트 품질 향상

---

## 10. 에러 처리

- Tool 실패 → 구조화된 에러 메시지 반환 (RuntimeError 미전파), agent가 fallback 응답
- Guard 차단 → LangGraph 노드에서 early return, 차단 메시지 스트리밍
- LLM 파싱 실패 → `_parse_with_recovery` 2회 재시도, 그래도 실패 시 degraded 응답

---

## 11. 보류 (Phase 5 이후)

- 궁합 tool 추가
- 세션 title 자동 생성
- 프론트엔드 채팅 UI
