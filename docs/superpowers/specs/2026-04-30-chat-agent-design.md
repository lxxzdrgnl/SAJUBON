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
  POST /api/chat/{id}/message     메시지 전송 (SSE: LangGraph .astream_events() 사용)
  GET  /api/chat/{id}/history     히스토리 조회
  POST /api/chat/{id}/report      채팅 종료 후 리포트 생성
  GET  /api/chat/sessions         세션 목록
       │
       ▼
Router → Service → LangGraph ReAct Agent
                         │
                    [guard_node]     입력 검증 + 차단
                         │
                    [agent_node]     LLM 추론 (saju_summary 시스템 프롬프트 주입)
                         │
                    [tools_node]     tool 실행 (12개)
                         │
          ┌──────────────┼───────────────────────┐
          ▼              ▼                        ▼
      RAG 검색      운세 계산 tool            날짜/시기 tool
    (search_rag)  (daily/wol/dae/yeon/il_jin) (evaluate_date, past_event, sinsal)
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
    birth_info: dict       # {date, time, gender, calendar}
    saju_summary: dict     # 세션 시작 시 1회 계산, 이후 재사용
```

**saju_summary 구조 (세션 내내 시스템 프롬프트에 주입):**
```python
{
    # 핵심 결론
    "day_stem": "갑",
    "day_element": "목",
    "gyeok_guk": "정관격",
    "yong_sin": ["화", "토"],
    "ji_sin": ["금", "수"],
    "strength": "신약",

    # 4기둥
    "pillars": {
        "year":  {"stem": "경", "branch": "오"},
        "month": {"stem": "무", "branch": "자"},
        "day":   {"stem": "갑", "branch": "진"},
        "hour":  {"stem": "병", "branch": "인"},
    },

    # 운
    "current_dae_un": {"stem": "임", "branch": "술", "start_age": 32, "end_age": 42},
    "wuxing_pct": {"목": 25.0, "화": 12.5, "토": 37.5, "금": 12.5, "수": 12.5},

    # Agent 해석용 (tool 없이 직업/재물/관계/건강 질문에 바로 답하기 위해)
    "ten_gods_distribution": {
        "비견": 0.0, "겁재": 0.0, "식신": 20.0, "상관": 0.0,
        "편재": 0.0, "정재": 0.0, "편관": 0.0, "정관": 35.0,
        "편인": 10.0, "정인": 35.0,
    },
    "structure_patterns": ["식신생재 구조"],   # detect_structure_patterns() 결과
    "sin_sals": [
        {"name": "천을귀인", "type": "lucky", "priority": "medium"},
        {"name": "역마살",   "type": "neutral", "priority": "low"},
    ],
    "behavior_profile": {"독립성": 0.8, "사교성": 0.4, "추진력": 0.6},
    "life_domains": {
        "직업": ["안정적", "조직적", "전문직"],
        "연애": ["늦은 결혼", "관성 약함"],
        "재물": ["재성 중간", "식신생재"],
        "건강": ["목 기운 과다", "토 허약"],
    },
    "branch_relations": {
        "삼합": [{"branches": ["인","오","술"], "element": "화"}],
        "충":   [{"pair": ["자","오"]}],
        "yuk_hap": [],
    },
}
```

전체 엔진 결과(~50개 키)가 아닌 이 요약만 저장 → 체크포인트 비대화 방지.

---

## 4. 사주 데이터 전략

### 세션 생성 시 (1회)
```
POST /api/chat/session  { birth_info? | profile_id? }
  └─ profile_id 있으면 → DB에서 birth_info 조회
  └─ handle_calculate_saju(**birth_info) 호출
  └─ extract_summary() → saju_summary
  └─ LangGraph initial state 저장 (birth_info + saju_summary)
  └─ ChatSession DB 저장 (thread_id + user_id + birth_info)
```

### 이후 매 턴
재계산 없음. `saju_summary`를 system prompt에 동적 주입:

```python
def agent_node(state: ChatState):
    system = build_chat_system_prompt(state["saju_summary"])
    messages = [SystemMessage(content=system)] + state["messages"]
    return {"messages": [llm_with_tools.invoke(messages)]}
```

### Agent 직접 해석 (tool 불필요)
saju_summary에 이미 있는 데이터로 agent가 바로 답변:

| 질문 유형 | 사용 데이터 | 보완 |
|---|---|---|
| "나한테 맞는 직업은?" | `life_domains["직업"]` + `gyeok_guk` | `search_rag` |
| "돈 버는 팔자인가요?" | `ten_gods_distribution` + `structure_patterns` | `search_rag` |
| "왜 연애가 안 될까요?" | `sin_sals` + `life_domains["연애"]` | `search_rag` |
| "어디 몸이 약한가요?" | `life_domains["건강"]` + `ji_sin` | `search_rag` |
| "내 성격이 어때요?" | `behavior_profile` + `gyeok_guk` | `search_rag` |

### CLI 세션 생성
- 인자(`--birth-date`, `--birth-time`, `--gender`) 있으면 즉시 계산
- 인자 없으면 대화형 입력 후 계산

---

## 5. Agent Tools (12개)

모든 tool은 `async def` + `asyncio.to_thread()` 패턴으로 이벤트 루프 블로킹 방지.  
데이터 반환만 담당, 해석은 Agent가 수행.

**birth_info 주입 방식**: tool 래퍼는 graph 컴파일 시 `birth_info`를 클로저로 캡처하거나,
`RunnableConfig`의 `configurable`을 통해 전달받아 엔진 핸들러에 넘긴다.

**신규 구현 필요 tool** (기존 핸들러 없음, `saju_tools.py`에서 새로 작성):
- `get_current_luck_overview` — 현재 대운+세운+월운 교차 계산
- `find_favorable_periods` — 연운 목록에서 용신 매칭 시기 추출
- `evaluate_specific_date` — 특정 날짜 일진 + 사주 충합 계산
- `check_current_sin_sal_timing` — 세운+대운 교차 신살 활성화 판단

### RAG
| Tool | 설명 |
|---|---|
| `search_rag(query, domain)` | 명리 지식 RAG 검색 |

### 운세 계산
| Tool | 설명 | 답하는 질문 |
|---|---|---|
| `get_daily_fortune(date?)` | 오늘/특정일 운세 | "오늘 운세 어때요?" |
| `get_wol_un(year)` | 특정 연도 월운 12개 | "이번 달 운세는?" |
| `get_dae_un()` | 대운 전체 목록 | "앞으로 대운 흐름은?" |
| `get_yeon_un(start, count)` | N년치 연운 | "향후 5년 운세 보여줘" |
| `get_il_jin(year, month)` | 일진 달력 | "좋은 날 언제예요?" |
| `get_current_luck_overview()` | 현재 대운+세운+월운 교차 | "지금 어떤 시기예요?" |
| `find_favorable_periods(domain, years)` | 도메인별 길한 시기 | "결혼/사업 언제가 좋아요?" |

### 날짜·시기 특수 계산
| Tool | 설명 | 답하는 질문 |
|---|---|---|
| `evaluate_specific_date(date, action)` | 특정 날짜 길흉 판단 | "3월 20일에 계약해도 될까요?" |
| `explain_past_event(date)` | 과거 시기 세운/월운 역산 | "작년에 왜 그렇게 힘들었나요?" |
| `check_current_sin_sal_timing()` | 현재 신살 발동 여부 | "지금 삼재인가요?" |

### 유틸
| Tool | 설명 | 답하는 질문 |
|---|---|---|
| `convert_calendar(date, from, to)` | 음력↔양력 변환 | "음력 생일인데요" |

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
│   │   └── saju_tools.py         # @tool 래퍼 12개 + extract_summary()
│   ├── pipelines/
│   │   ├── chat.py               # LangGraph StateGraph 정의
│   │   └── chat_report.py        # 채팅→리포트 파이프라인
│   └── prompts/
│       └── chat.py               # 채팅 system prompt 포맷터 (build_chat_system_prompt)
├── routers/
│   └── chat.py
├── services/
│   └── chat.py
├── crud/
│   └── chat.py
├── models/
│   └── chat.py                   # ChatSession, ChatReport
└── cli.py                        # typer CLI 진입점
```

---

## 9. Agent 대화 전략

- **선제 질문**: 고민이 불명확하면 tool 호출 전 맥락 파악 질문 1개 먼저
- **질문 제한**: 한 번에 1개 이하 (대화 흐름 방해 방지)
- **해석 원칙**: tool은 데이터만 반환, 사주 해석은 항상 Agent가 수행
- **효과**: 대화 히스토리에 사용자 맥락이 쌓여 채팅 리포트 품질 향상

---

## 10. 에러 처리

- Tool 실패 → 구조화된 에러 메시지 반환 (RuntimeError 미전파), agent가 fallback 응답
- Guard 차단 → guard_node에서 early return, 차단 메시지 스트리밍
- LLM 파싱 실패 → `_parse_with_recovery` 2회 재시도, 그래도 실패 시 degraded 응답

---

## 11. 프론트엔드 UI

### 진입 흐름
```
my-profiles.vue
  └─ [AI 상담하기] 버튼 → /chat?profile_id=xxx → 세션 자동 생성
```

### 레이아웃 (/chat, /chat/[id])
```
┌──────────────┬────────────────────────────┐
│ 이전 대화 목록 │     채팅 영역              │
│              │                            │
│ + 새 상담    │  [메시지들... SSE 스트리밍] │
│ ──────────── │                            │
│ • 오늘 운세  │  [리포트 생성 버튼]         │
│ • 결혼 상담  │                            │
│ • 재물운     │  [입력창______________↑]    │
└──────────────┴────────────────────────────┘
```

### 추가 파일
```
frontend/pages/chat/index.vue      # 세션 목록 + 새 채팅 시작
frontend/pages/chat/[id].vue       # 특정 세션 채팅
```

### 주요 동작
- SSE 스트리밍 — 토큰 단위 실시간 출력
- 사이드바 — 세션 목록, 클릭 시 해당 대화로 이동
- 리포트 생성 버튼 — `POST /api/chat/{id}/report` 호출 후 결과 표시
- 모바일 — 사이드바 숨김, 햄버거 메뉴로 목록 접근

---

## 12. 보류 (이후)

- `get_compatibility_detail` — 궁합 tool (Phase 5)
- `find_best_timing` — 월운+일진 교차 최적 날짜 (구현 복잡)
- `get_child_luck` — 자녀 인연 분석
- 세션 title 자동 생성
- 프론트엔드 채팅 UI
