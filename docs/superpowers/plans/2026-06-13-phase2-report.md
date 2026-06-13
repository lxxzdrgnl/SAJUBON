# Phase 2 — 10탭 AI 리포트 구현 계획 (백엔드/프론트 병렬 트랙)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. 트랙 A(백엔드)와 트랙 B(프론트)는 **별도 에이전트가 병렬 실행** — 자기 트랙 섹션만 구현하되 「공통 API 계약」은 양쪽 모두 절대 기준.

**Goal:** spec §4 — 만세력에서 리포트 생성(추가 주제 입력) → 헤드라인 아코디언 + 올해의 흐름 + 대운 분석 페이지 → DB 저장·마이 목록·공유(개인정보 토글)까지.

**참조:** spec(`2026-06-12-mobile-ui-overhaul-design.md`) §4·§4.5·§7.5, `docs/design.md` §5.4·§6, 목업 v10

---

## 공통 API 계약 (양 트랙 절대 기준 — 변경 금지)

```
POST /api/reports                      # 생성+저장 (로그인 필수, get_current_user)
  body: { birth_input: <SajuCalcRequest 형태>, request_topics?: string,
          profile_id?: number, language?: "ko" }
  → 201 ReportDetail
  → 429 { detail } (report_daily_limit 초과 시)

GET  /api/reports                      # 내 목록 (로그인)
  → 200 ReportSummary[]

GET  /api/reports/{report_id}          # 단건 (소유자만)
  → 200 ReportDetail / 404

POST /api/reports/{report_id}/share    # 공유 토큰 발급 (소유자)
  body: { mask_birth: boolean }
  → 200 { share_token: string(uuid), share_url: string }

GET  /api/share/reports/{share_token}  # 비로그인 열람
  → 200 ReportDetail (mask_birth면 birth_input.birth_date·birth_time이 null,
        name은 유지) / 404
```

```typescript
// TypeScript 표현 (트랙 B는 packages/api-client/src/reports.ts에 이대로 정의)
interface ReportTab {
  category: string          // 짧은 태그 — "성격" | "재물" | ... | 요청 주제명
  headline: string          // 결론형 문장
  content: string           // 3~4문단 (비유→근거→조언, \n\n 구분)
  requested: boolean        // 사용자가 추가 요청한 주제 탭이면 true
}
interface YearFlowMonth { month: number; keyword: string; memo: string }
interface YearFlow {
  year: number
  first_half: string        // 상반기 요약 2~3문장
  second_half: string
  months: YearFlowMonth[]   // 12개
}
interface DaeUnAnalysis {
  current: { ganji: string; period: string; text: string }   // period 예: "현재 ~2026"
  next:    { ganji: string; period: string; text: string }
  caution: string           // 주의점 1문단
}
interface ReportSummary {
  id: number
  first_headline: string
  profile_name: string      // birth_input.name
  request_topics: string | null
  created_at: string
}
interface ReportDetail extends ReportSummary {
  birth_input: SajuCalcRequest      // mask 시 birth_date/birth_time null
  language: string
  tabs: ReportTab[]                 // 10개 + 요청 주제 수만큼
  year_flow: YearFlow
  dae_un_analysis: DaeUnAnalysis
}
```

마이그레이션 충돌 방지: 트랙 A만 DB·alembic을 만진다. 트랙 B는 백엔드 파일 수정 금지, 트랙 A는 apps/web·packages 수정 금지. **공유 영역인 packages/api-client는 트랙 B 소관.**

---

## 트랙 A — 백엔드 (모델: opus)

기존 자산: `llm/pipelines/saju_report.py`(run_saju_report — Engine→RAG→Writer),
`llm/prompts/report.py`(10탭·고민 탭 프롬프트), `schemas/report.py`(TabContent),
`routers/share.py`(공유 토큰 패턴), `db/models.py`, alembic.

### A1. Writer 프롬프트·스키마 개편 (TDD — golden 키워드 검증)
- `schemas/report.py`의 `TabContent`에 `category: str`, `requested: bool = False` 추가
- `llm/prompts/report.py` 개편: ① "고민" → **"추가로 보고 싶은 주제"** (쉼표 구분 여러 개 → 각각 별도 탭, requested=true, category=주제명) ② 본문 **3단 구성 지시**: 비유 스토리텔링 → 명리 근거 → 현실 조언, 문단 사이 빈 줄, 탭당 3~4문단 ③ **모던 해설가 톤** 명문화: 존댓말, 단문, 비유 유지, "결론부터 말씀드리면" 류 단정 화법, 이모지·억지 위트 금지 (design.md §6)
- 테스트: 프롬프트 빌드 결과에 지시 키워드 존재, 파서가 category/requested 파싱
- 커밋: `feat: Writer 탭 스키마에 카테고리·요청 플래그 추가`

### A2. 올해의 흐름·대운 해설 생성 단계
- `llm/pipelines/saju_report.py`에 후속 LLM 호출 1회 추가(또는 Writer 출력 스키마 확장 — 토큰 길이 고려해 **별도 호출 권장**): 입력 = 엔진의 연운 12개월·현재/다음 대운 데이터(기존 핸들러 재사용), 출력 = 계약의 `YearFlow` + `DaeUnAnalysis` (PydanticOutputParser, `_parse_with_recovery` 패턴 재사용)
- 프롬프트: 월별 keyword는 2~4자 명사형, memo는 1문장. 톤 동일
- 커밋: `feat: 올해의 흐름·대운 해설 생성 단계 추가`

### A3. SajuReport·ReportShare 모델 + 마이그레이션
```python
class SajuReport(Base):
    __tablename__ = "saju_reports"
    id: int (PK)
    user_id: int (FK users.id, index)
    profile_id: int | None (FK profiles.id, SET NULL)
    birth_input: JSON
    request_topics: str | None
    language: str (default "ko")
    tabs: JSON; year_flow: JSON; dae_un_analysis: JSON
    created_at: datetime

class ReportShare(Base):
    __tablename__ = "report_shares"
    id: int (PK)
    report_id: int (FK saju_reports.id, CASCADE)
    share_token: UUID (unique, index)
    mask_birth: bool
    created_at: datetime
```
기존 모델 파일·share 모델 패턴을 읽고 관례(타입·네이밍) 일치. alembic revision 생성·적용 테스트. 커밋: `feat: 사주 리포트 저장·공유 모델 추가`

### A4. 라우터·서비스 — 계약 그대로 5개 엔드포인트
- `routers/reports.py` + `services/reports.py` + `crud/reports.py` (기존 chat/share 구조 관례)
- `settings.report_daily_limit: int | None = None` — 초과 시 429 (user_id·created_at 당일 카운트)
- 공유 열람의 mask 처리: birth_date·birth_time → None (이름 유지)
- ASGI 테스트: 생성(LLM은 monkeypatch로 스텁)·목록·단건 권한·공유 발급/열람/마스킹·429
- 커밋: `feat: 리포트 생성·목록·공유 API 추가`

### A5. 검증
`UV_PROJECT_ENVIRONMENT=...` 불필요 (worktree에서 `uv sync`). `uv run pytest -q` 전체 그린 + 기존 `/api/saju/report`(무저장 게스트용 기존 라우트) 회귀 없음.

---

## 트랙 B — 프론트 (모델: sonnet)

기존 자산: 아코디언 스타일 기준 = 목업 v10·design.md §5.4, `BrutalCard`/`Chip`,
원국 요약은 분석 화면 컴포넌트 재사용 가능(`PillarCard` 등), `serverAuthApi()`/`currentUser()`,
`lib/manse/query.ts`. **백엔드 미완성 전제** — 계약 타입으로 구현하고 E2E는 머지 후 컨트롤러가 수행.

### B1. api-client — reports 함수 + 계약 타입 (TDD)
`packages/api-client/src/reports.ts`: 계약의 인터페이스 전부 + `createReport(api, body)`, `listReports(api)`, `getReport(api, id)`, `shareReport(api, id, maskBirth)`, `getSharedReport(api, token)`. cities.ts 패턴, 테스트는 mock fetch로 경로·직렬화 검증. 커밋: `feat: api-client에 리포트 함수 추가`

### B2. 생성 동선 — `/report/new`
- `/manse/result`의 [AI 리포트 생성] CTA를 활성 링크로: birth 쿼리 그대로 `/report/new?...`에 전달
- `/report/new`: 비로그인이면 로그인 유도("로그인이 필요해요" + 구글 버튼 — 마이 탭 패턴 재사용). 로그인 시: **"추가로 보고 싶은 것" 입력(선택, 예시 placeholder "이직 시기, 부모님 건강")** + [리포트 생성] 오렌지 CTA → `createReport` 호출, **로딩 화면**(마스코트 + "사주를 읽고 있어요…" 류 문구 순환, 수십 초 대비) → 성공 시 `/report/{id}` replace
- 커밋: `feat: 리포트 생성 동선 구현`

### B3. 리포트 페이지 — `/report/[id]`
서버 컴포넌트(`serverAuthApi`로 GET). 구조 (design.md §5.4):
1. 헤더: 만세력 요약 한 줄(이름·일주·생년월일) — 접이식 원국은 v2로 미루고 한 줄만 (YAGNI)
2. 안내: "각 제목을 클릭하면 해설이 펼쳐져요"
3. **헤드라인 아코디언**: `# {category}` 오렌지 태그(+ requested면 오렌지 "요청" 뱃지) / 헤드라인 15.5px·800 / 펼침=오렌지 보더·섀도 / 본문 문단 분리, 마지막 문단을 "현실 조언" 박스(`#FFF4E3`)로 — 분석 화면 아코디언과 동일 패턴(클라 컴포넌트)
4. **올해의 흐름**: 상/하반기 카드 2장 + 월 12행 표(월=오렌지 굵게·키워드·메모, 처음 4행 + 펼치기)
5. **대운 비교**: 현재(soft)/다음(오렌지 풀 브루탈) 카드 + 주의점 박스
6. CTA: [공유(틸)] [다시 생성(화이트 — `/report/new`로, birth 쿼리 보존)]
커밋: `feat: 리포트 페이지 구현 (아코디언·올해 흐름·대운)`

### B4. 공유 — 모달 + 공개 페이지
- 공유 모달(클라): **"생년월일시 공개" 토글**(기본 off) → `shareReport` → URL 복사 버튼
- `/share/report/[token]`: 비로그인 서버 렌더(`api` 베이스는 serverApi, 쿠키 불필요), 리포트 페이지와 같은 뷰 재사용(공유 모드 — CTA 없음), **`robots: noindex` 메타 + OG 타이틀 `"{이름}님의 사주 리포트 | 사주구리"`** (spec §7.5 — 미리보기가 핵심)
- 커밋: `feat: 리포트 공유 모달과 공개 페이지 추가`

### B5. 마이 탭 "내 리포트" 활성화
`/my`의 비활성 자리에 `listReports` 목록 연결: 첫 헤드라인 + `생성일 · 만세력 이름 · 요청 주제` (목업 v10 마이 탭 형식), 탭 → `/report/{id}`. 커밋: `feat: 마이 탭 내 리포트 목록 연결`

### B6. 검증
`pnpm build/test/typecheck` 그린. 페이지는 백엔드 미가동 시 에러 fallback 렌더 확인까지.

### 공통 규칙 (양 트랙)
i18n ko/en 동시(`report.*`), 이모지 금지, 디자인 토큰만, 커밋 규칙(G6), 명리 용어 한글 유지. 막히면 SKIPPED 기록 후 진행.
