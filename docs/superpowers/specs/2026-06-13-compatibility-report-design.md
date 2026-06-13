# 궁합 레포트 (Compatibility Report) 설계

> 작성일: 2026-06-13 · 상태: 설계 승인 대기

## 1. 목표 (Goal)

두 사람의 사주를 분석해 **연애/부부 관점의 결론형 헤드라인 탭 리포트**를 1회 생성·저장·공유한다. 기존 사주 리포트(`/report`) 아키텍처를 그대로 미러링하되, 입력이 두 명이고 엔진이 궁합 점수(`check_compatibility` + `compute_synastry`)를 산출한다는 점만 다르다.

> "성격 차이" (X) → "물과 나무처럼, 서로의 부족함을 채우며 자라는 궁합" (O)

## 2. 핵심 컨셉

- **결론형 헤드라인**: 단순 카테고리("연애운")가 아닌 그 커플만을 위한 결론 문장.
- **한 번에 생성**: 완성된 JSON 1회 반환, 탭 클릭 = 뷰 전환만 (스트리밍·재계산 없음).
- **유동적 탭**: 고정 8탭이 아니라, 그 커플에게 가장 두드러지는 관계 측면을 Writer가 선택해 **5~8개**를 생성한다. 앵커 탭 3개(종합 케미·갈등 포인트·관계 조언)는 항상 포함하고, 나머지는 엔진 신호(충 지지·보완 오행·십성 조화 등)에 따라 가변. 사용자가 입력한 `request_topics`는 사주 리포트와 동일하게 "요청" 뱃지 탭으로 추가.
- **공유가 핵심**: 추측 불가능한 토큰으로 무권한 공개 페이지 + 카카오톡 OG 프리뷰. 저장 스냅샷이라 열람 시 재분석 없음.

## 3. 전체 아키텍처

```
/compatibility/new  (두 사람 슬롯 A·B)
  슬롯 A: 기본값 = 내 대표 만세력 (변경 가능)
  슬롯 B: 저장됨 / 최근 본 / 직접입력 — 공용 BirthInputForm·픽시트 재사용
  (옵션) request_topics: "결혼 시기" 등 추가 주제
        │  POST /api/compatibility
        ▼
Backend (3-layer: Router → Service → CRUD)
  engine   : calculate_saju(A), calculate_saju(B)
             → compute_synastry(c1,c2)     # 서술의 주 소스 (방향성 신호)
             → check_compatibility(s1,s2)  # 점수 오버뷰용 숫자만
  rag      : 관계·궁합 도메인 컨텍스트 조립 (rag_builder 확장)
  writer   : get_llm("openai","gpt-4.1") + PydanticOutputParser → 탭 JSON (+ 파싱 재시도)
  persist  : compatibility_reports 테이블 (입력·점수·탭 스냅샷)
        ▼
/compatibility/[id]  결과
  점수 오버뷰(종합 + 4세부 바) + 헤드라인 탭 아코디언 (ReportView 패턴 재사용)
  공유 버튼 → POST /api/compatibility/{id}/share → 토큰
        ▼
/compatibility/shared/[token]  공개 (무권한·저장 스냅샷·재분석 X) + next/og OG 이미지
```

## 4. 파일 구조 (File Structure)

신규(사주 리포트 미러링):

| 영역 | 파일 | 책임 |
|---|---|---|
| Engine | (재사용) `engine/handlers/check_compatibility.py`, `engine/calc/compatibility.py`, `engine/calc/synastry.py` | 점수·시너지 계산 |
| Prompt | `backend/llm/prompts/compatibility_report.py` | 시스템 프롬프트 + 포맷터 + 유동 탭 가이드 |
| Pipeline | `backend/llm/pipelines/compatibility_report.py` | engine→rag→writer 오케스트레이션 |
| Schema | `backend/schemas/compatibility.py` | 요청/응답/탭 Pydantic 모델 |
| Router | `backend/routers/compatibility.py` | HTTP 입출력, 의존성 주입 |
| Service | `backend/services/compatibility.py` | 흐름 제어, 예외 변환, 단일 commit |
| CRUD | `backend/crud/compatibility.py` | DB 접근 (저장·조회·공유 토큰) |
| Model | `backend/db/models.py` 에 `CompatibilityReport` + `CompatibilityShare` 추가 |
| Migration | `backend/alembic/versions/XXXX_compatibility_report.py` | 테이블 2개 생성 |
| API client | `packages/api-client/src/compatibility.ts` + types | createCompatibilityReport / get / share / getShared |
| Frontend | `apps/web/app/[locale]/compatibility/new/page.tsx` | 두 슬롯 입력 폼 |
| Frontend | `apps/web/app/[locale]/compatibility/[id]/page.tsx` | 결과 |
| Frontend | `apps/web/app/[locale]/compatibility/shared/[token]/page.tsx` | 공개 공유 |
| Frontend | `apps/web/components/compatibility/CompatibilityView.tsx` | 페이지 조립 (overview + TabbedReport) |
| Frontend | `apps/web/components/compatibility/ScoreOverview.tsx` | 히어로 점수 + 4세부 바 |
| Frontend | `apps/web/components/compatibility/ElementFlowDiagram.tsx` | 천간합화·상생·보완 방향 다이어그램 |
| Frontend | `apps/web/components/compatibility/PersonSlotPicker.tsx` | 슬롯 A·B 선택/입력 (BirthInputForm·픽시트 재사용) |
| Frontend | `apps/web/components/chat/CompatibilityReportCTA.tsx` | 챗 인라인 "궁합 리포트 보러가기" CTA (from-session 호출) |
| Frontend | `apps/web/components/report/TabbedReport.tsx` | 제네릭 탭 리포트 뷰 (사주·궁합 공용, overview 슬롯) |
| Frontend | `apps/web/lib/records/registry.ts` (신규) | 레코드 타입 레지스트리 (saju·fortune·consultation·compatibility) |
| Frontend | `apps/web/components/my/MyRecordsClient.tsx` (수정) | 레지스트리 순회 렌더로 리팩터 |
| Docs | `CLAUDE.md`, `backend/CLAUDE.md` (수정) | 모듈화 규약 추가 |
| OG | `apps/web/app/[locale]/compatibility/shared/[token]/opengraph-image.tsx` | OG 이미지 |

재사용: `BirthInputForm`, 만세력 픽시트(저장됨/최근), `ReportView`의 탭 아코디언 시각, 공유 토큰·OG 인프라, `Markdown` 컴포넌트, `rag_builder`/`writer`/`get_llm`.

## 5. 데이터 모델 (스냅샷 저장)

```
CompatibilityReport
  id (PK)
  user_id (FK users, CASCADE, index)
  person_a (JSONB)        # birth_input A (이름 포함)
  person_b (JSONB)        # birth_input B
  request_topics (Text, nullable)
  language (String(10), default "ko")
  score (JSONB)           # total + 4 세부점수
  synastry (JSONB)        # compute_synastry 방향성 신호 (흐름 다이어그램 소스)
  tabs (JSONB)            # 유동 탭 배열 (category·headline·content·requested)
  created_at

CompatibilityShare
  id (PK)
  report_id (FK compatibility_reports, CASCADE)
  share_token (UUID, unique, index, default uuid4)
  mask_birth (Boolean, default False)   # 열람 시 생년월일·시각 가림
  created_at
```

`SajuReport`/`ReportShare`와 동일 패턴. 토큰은 UUID (사주 리포트와 통일).

## 6. 스키마 (Pydantic / TS)

```
CompatibilityReportRequest
  person_a: BirthInput   # name?, birth_date, birth_time?, gender, calendar, is_leap_month, birth_longitude?
  person_b: BirthInput
  request_topics: str | None
  language: str = "ko"

CompatibilityScore            # check_compatibility 기반 숫자 (오버뷰 시각용)
  total: int                  # 예: 97
  day_pillar: int
  element_harmony: int
  branch_relation: int
  ten_gods: int

CompatibilitySynastry         # compute_synastry 기반 방향성 신호 (서술 + 흐름 다이어그램)
  stem_hap: str | None        # 천간합화 오행 (예: "수") — 둘이 만나 생기는 기운
  day_ten_god: str            # A 기준 B 일간의 십성 (예: "정재")
  element_synergy: str | None # 상생 | 상극 | 동기 — A일간→B일간 방향
  clash_pairs: list[[str,str]]# 지지충 쌍
  complement_a_to_b: list[str]# A가 B의 결핍을 채워주는 오행 (방향)
  complement_b_to_a: list[str]# B가 A의 결핍을 채워주는 오행 (방향)
  yongsin_help: str | None    # "b_helps_a" | "a_helps_b" | "mutual" | None (용신 보완 방향)
  interaction_tags: list[str] # RAG 쿼리 seed

CompatibilityTab
  category: str          # 짧은 라벨 (예: "갈등 포인트")
  headline: str          # 결론형 한 줄
  content: str           # 마크다운 본문 (Markdown 컴포넌트로 렌더)
  requested: bool = False

CompatibilityReportDetail
  id: int
  person_a: BirthInput
  person_b: BirthInput
  score: CompatibilityScore
  synastry: CompatibilitySynastry
  tabs: list[CompatibilityTab]
  created_at
```

## 7. 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/compatibility` | 필요 | 두 입력 → 리포트 생성·저장 → Detail 반환 |
| POST | `/api/compatibility/from-session/{session_id}` | 소유자 | 챗 세션의 person A+B로 리포트 생성 (챗 인라인 CTA용) |
| GET | `/api/compatibility` | 소유자 | 내 궁합 리포트 목록 (내 기록/히스토리용) |
| GET | `/api/compatibility/{id}` | 소유자 | 저장 리포트 조회 |
| POST | `/api/compatibility/{id}/share` | 소유자 | 공유 토큰 발급 (mask_birth 옵션) |
| GET | `/api/compatibility/shared/{token}` | 무권한 | 공개 스냅샷 (재분석 X) |

레이트리밋·예외 변환은 사주 리포트(`reports.py`)와 동일 정책. 엔진 `ValueError`→`CalcFailedException`, LLM `RuntimeError`→`LLMFailedException`.

## 8. 유동 탭 생성 규칙 (프롬프트)

- **앵커 탭(항상 포함, 순서 고정)**: ① 종합 케미(total_score 기반 결론 헤드라인) · ② 갈등 포인트(conflict_branches/충) · ③ 관계 조언(실천 팁).
- **가변 탭(2~5개, Writer가 신호 보고 선택)**: 첫인상·끌림(일주/오행), 연애 스타일(십성), 가치관·금전, 보완·시너지(complement_elements), 장기 전망·결혼, 소통·신뢰 등 팔레트에서 그 커플에 두드러진 것 선택. complement_elements가 비면 시너지 탭 대신 다른 측면을 고르는 식.
- **요청 탭**: `request_topics`를 쉼표 분리해 각 주제를 "요청" 뱃지 탭으로 추가.
- 총 5~8탭. 모든 헤드라인은 결론형, 본문은 RAG 근거 기반.

## 8.5 시각 자료 (Visual Overview) — 메인 요소

순수 텍스트 리포트가 아니라, 결정론 엔진 값을 그대로 그리는 시각 자료가 상단 메인이다. 모두 엔진 계산값이라 LLM·재계산 불필요. 사주 리포트보다 운세 Wrapped에 가까운 톤(큰 숫자·굵은 타이포·브루탈).

- **히어로 스코어**: 종합 점수 큰 숫자 (예: `97/100`) + 한 줄 결론 헤드라인 + 카운트업 연출(운세 카운트업 재사용 검토).
- **4세부 점수 바**: 일주·오행 조화·지지 관계·십성 4개를 가로 바/링으로. (`CompatibilityScore`)
- **오행 흐름 다이어그램** (`CompatibilitySynastry`):
  - 천간합화: `A일간 + B일간 → {stem_hap}` 노드 (둘이 만나 생기는 기운).
  - 상생/상극 화살표: `element_synergy` 방향 (A→B 생/극).
  - 보완 방향 화살표: `complement_a_to_b` / `complement_b_to_a` 오행 칩을 화살표로 (누가 누구를 채우는지).
  - 용신 보완 뱃지: `yongsin_help`.
- **지지충 마커**: `clash_pairs` 를 충 라벨 칩으로 (갈등 탭과 연결).
- **십성 라벨**: `day_ten_god` (A 기준 B 역할).

신규 컴포넌트 `apps/web/components/compatibility/ScoreOverview.tsx` + `ElementFlowDiagram.tsx`. 색은 디자인 토큰만(check-colors --strict).

## 8.6 엔진 신호 감사 결과 (2026-06-13)

`compute_synastry`는 방향성 신호를 충분히 제공한다 — 천간합화·용신 보완 방향·결핍 보완 양방향·십성 관계·상생상극·지지충. **서술과 흐름 다이어그램의 주 소스로 사용.**

`check_compatibility`는 점수 오버뷰용으로만 쓰되 거친 부분을 정리한다(파이프라인 단계에서 보정 또는 엔진 소폭 수정):
- `_ten_gods_score`가 실제 십성이 아니라 일간 오행조화도 재탕(`_element_harmony`) — 라벨과 불일치. 십성 기반으로 교체하거나, 오버뷰에서 의미를 "일간 합" 으로 정직하게 표기.
- `complement_elements`가 단방향(`weak1 & strong2`)뿐 — 방향성 시각은 `compute_synastry`의 양방향 보완을 사용(이미 양방향 계산함).

엔진 수정은 최소·하위호환으로 한정하고, 기존 `check_compatibility` 호출부(챗 `handle_check_compatibility`)가 깨지지 않게 한다.

## 9. LLM / RAG 정책

- Writer = `gpt-4.1` (사주 리포트와 동일, 드물게 쓰는 풀 모델). 보조 단계가 생기면 nano.
- RAG 임베딩 = OpenAI text-embedding-3-small (pgvector). **재미나이 미사용.**
- 관계/궁합 지식은 기존 RAG에 있는 십성·오행·신살 도메인 문서를 태그·필드 조회로 재사용. 부족하면 색인 보강은 별도 작업(이 spec 범위 밖).

## 9.5 챗 인라인 연계 (Chat → Report CTA)

채팅에서 상대를 첨부하고 궁합(`check_compatibility` 툴)을 본 직후, 대화 흐름 안에 **"궁합 리포트 보러가기"** 인라인 CTA를 띄운다. 누르면 그 세션의 두 사주로 바로 리포트를 생성한다.

- **트리거**: ChatView가 `tool_result` 블록 중 `tool === 'check_compatibility'`를 감지하면(상대 첨부 상태) 해당 카드 아래 CTA 블록 렌더. (기존 `inline_partner` 블록 패턴 재사용 — 백엔드 SSE 신규 이벤트 불필요.)
- **동작**: CTA 클릭 → `POST /api/compatibility/from-session/{session_id}` → 세션에 저장된 person A(birth_info) + person B(partner)로 리포트 생성·저장 → `/compatibility/[id]`로 이동.
- 세션에 양쪽 사주가 이미 있으므로 사용자는 재입력 없이 리포트로 직행.

## 10. 범위 밖 (YAGNI)

- 관계 유형 선택(친구·동업·가족) — 연애/부부 고정. 추후 확장.
- 기존 `saju_report.py`의 ReportModule 이관 — 후속 작업.
- 궁합 점수 시계열·대운 교차 분석 — 1차 범위 밖.
- 실시간 스트리밍 — 사주 리포트와 동일하게 1회 반환.

## 10.5 모듈화 / 확장성 (Report Module 패턴)

향후 리포트류(신년운세·직업운·타로 등) 추가를 쉽게 하기 위해, 궁합을 **제네릭 리포트 모듈**로 구현한다. 단 YAGNI — 투기적 플러그인 레지스트리·설정 DSL은 만들지 않고, 이미 사주·궁합 2개에서 반복되는 seam만 추출한다. (`docs/superpowers/specs/2026-06-02-multi-domain-divination-platform-design.md`와 정합.)

**Backend — 리포트 모듈 계약**
```
backend/llm/reports/
  base.py     # ReportModule 프로토콜:
              #   assemble_signals(inputs) -> dict          (engine 호출 결과)
              #   build_rag_context(signals) -> str
              #   output_schema() -> type[BaseModel]
              #   system_prompt() / format_message(signals) -> str
              #   assemble_tabs(parsed, signals, request_topics) -> list[Tab]
  runner.py   # run_report(module, inputs): signals → rag → writer(parse+retry) → tabs
              # 공통 오케스트레이션·파싱 재시도·예외 변환을 한 곳에서
  compatibility.py  # CompatibilityReportModule (이번 구현)
```
- 제네릭 `runner`가 engine→rag→writer→parse→tab 흐름과 재시도를 1회 정의. 새 리포트 = 모듈 1개 작성.
- 기존 `saju_report.py`는 **이번에 건드리지 않는다**(하위호환). 다만 같은 `ReportModule` 형태로 추후 이관 가능하도록 runner 인터페이스를 사주 리포트 흐름과 호환되게 설계. (사주 이관은 별도 후속 작업, 이 spec 범위 밖.)
- `writer.py`/`rag_builder.py`/`get_llm`은 그대로 공유.

**Frontend — 제네릭 탭 리포트 뷰**
```
apps/web/components/report/TabbedReport.tsx   # 제네릭: tabs[] + overview 슬롯(ReactNode) + 공유 버튼
```
- 탭 아코디언 + `Markdown` + 공유 모달을 제네릭화. `overview` prop으로 도메인별 상단 시각을 꽂음:
  - 사주: `<YearFlowSection/> <DaeUnSection/>`
  - 궁합: `<ScoreOverview/> <ElementFlowDiagram/>`
- `ReportView`를 `TabbedReport` 기반으로 소폭 리팩터(같은 트리·동작 보존). `CompatibilityView`도 동일 뷰 재사용.
- 공유 `ReportTab` 타입을 사주·궁합이 함께 사용.

이로써 신규 리포트 추가 = (1) Backend `ReportModule` 1개 + (2) Frontend `overview` 컴포넌트 1개 + (3) 라우터/스키마/마이그레이션. 공통 흐름·탭 UI·공유·OG는 재사용.

## 10.7 내 기록 / 히스토리 모듈화 (레코드 타입 레지스트리)

글로벌 바텀냅(홈/만세력/상담/마이) 4탭은 유지한다. 진짜 확장성 문제는 **마이 페이지의 콘텐츠 히스토리** — 콘텐츠 종류(리포트·운세·한줄상담·궁합·미래)가 늘 때마다 `MyRecordsClient`에 탭을 하드코딩하면 안 된다.

**레코드 타입 레지스트리**로 모듈화한다:
```
apps/web/lib/records/registry.ts
  RecordType = {
    key: string                 // 'saju' | 'fortune' | 'consultation' | 'compatibility' | ...
    label: () => string         // i18n 탭 라벨
    fetch: (api) => Promise<RecordItem[]>
    href: (item) => string      // 상세 경로
    renderCard: (item) => ReactNode  // 카드 표현
    groupBy?: (item) => string  // 옵션: 프로필별 그룹 키
  }
  RECORD_TYPES: RecordType[]     // 등록 배열
```
**UI 패턴 — 탭 폐기, 피드+섹션 하이브리드** (콘텐츠 종류 N개여도 안 깨짐):
- **마이 페이지(허브, `MyRecordsClient`)**: 타입별 **그룹 섹션 미리보기**. 각 섹션 = 제목+개수, 카드 2~3개, "전체 보기 →". `RECORD_TYPES` 순회로 섹션 스택. (현재의 3탭 폐기.)
- **`/my/history`**: **통합 시간순 피드 + 가로 스크롤 필터 칩**(전체·타입별). 기본 "전체"는 모든 종류 섞어 최신순. 칩은 `RECORD_TYPES`에서 생성, 종류 늘면 가로로 스크롤.
- 편집 토글·그룹핑은 제네릭 골격에서 처리. 카드 표현은 각 타입의 `renderCard`.
- 신규 콘텐츠 추가 = `RECORD_TYPES`에 항목 1개 등록(+ 목록 fetch). 허브·히스토리 코드는 불변, 탭 폭증 없음.
- 이번 작업: 기존 3종(saju·fortune·consultation)을 레지스트리로 이관 + **compatibility 항목 추가**.
- 궁합 카드: 두 이름 + 종합 점수 뱃지(예: `이용재 ♥ 유다연 · 97`) + 생성일 → `/compatibility/[id]`. 그룹핑은 단순 목록(두 명이라 프로필 그룹 부적합).
- 목록 조회: `GET /api/compatibility`(소유자). i18n: 탭 라벨 ko/en.

## 10.8 문서화 (모듈화 규약 → CLAUDE.md)

모듈화 구현이 끝난 뒤, 규약을 프로젝트 지침에 박아 앞으로의 기능이 같은 패턴을 따르게 한다. (계획 마지막 태스크)
- 루트 `CLAUDE.md`: "리포트류 신규 기능은 backend `ReportModule` + `runner`, frontend `TabbedReport`(overview 슬롯) + 레코드 레지스트리 항목으로 추가한다" 규약 + 신규 리포트 추가 체크리스트.
- `backend/CLAUDE.md`: `llm/reports/` 모듈 계약(assemble_signals/build_rag_context/output_schema/assemble_tabs)과 runner 사용법.
- 서비스/레코드 레지스트리 위치와 추가 절차 명시.

## 11. 테스트 전략

- Engine: `check_compatibility`/`compute_synastry`는 기존 테스트 보유 — 파이프라인이 올바른 입력을 넘기는지 단위 테스트.
- Pipeline: Writer를 모킹해 유동 탭(앵커 3 + 요청 탭) 보장·파싱 재시도 검증.
- Router/Service: 생성·조회·공유·공개열람 경로, 소유자 권한, 무권한 공개 접근 테스트 (`test_compatibility_*`).
- Frontend: 슬롯 A 기본 대표 프리필, 두 슬롯 미충족 시 제출 비활성, 공유 페이지 스냅샷 렌더 vitest.
- 가드: check-i18n(ko/en 패리티), check-colors --strict.

## 12. 재사용·일관성 체크

- 공용 `BirthInputForm`(방금 추출) — 슬롯 입력에 그대로.
- 공유 토큰·OG·Markdown — 사주 리포트/한줄상담과 동일.
- 커밋 규칙: Co-Authored-By 금지, scope 괄호 금지, 독립 변경 분리 커밋.
