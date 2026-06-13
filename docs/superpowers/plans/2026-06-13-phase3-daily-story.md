# Phase 3 — 오늘의 운세 Wrapped 스토리 구현 계획 (백엔드/프론트 트랙)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.
> ⚠️ **실행 전제: Phase 2가 dev에 머지된 후** — alembic 체인·`/my`·홈 파일이 겹치므로 병렬 금지.

**Goal:** spec §6 — 홈 배너 → 만세력 선택 시트 → 딥 틸 풀스크린 스토리(탭 넘김, 카드 ~10장) → 요약 카드(이미지 저장 + 링크 공유). 만세력별 1일 1회, GPT 리라이트(반말 직설 톤), 마이 운세 기록.

**참조:** spec §6 (6.0~6.3)·§7.5, design.md §2.4·§5.6·§6(스토리 톤 = 직설 친구 반말), 목업 v10 스토리 화면

---

## 공통 API 계약 (양 트랙 절대 기준)

```
POST /api/daily/story                  # 게스트 허용 (인증 선택적)
  body: { birth_input: <SajuCalcRequest>, date: "YYYY-MM-DD",   # 사용자 로컬 날짜 (spec §7.5)
          language?: "ko" }
  → 200 DailyStoryResponse
  # 로그인 + 동일 (user, birth해시, date) 레코드 존재 시 → 저장본 그대로 반환 (1일 1회)
  # 게스트 → 매 호출 생성 (클라가 localStorage 캐시로 1일 1회 동작 보장)

GET  /api/daily/records                # 로그인 — 마이 운세 기록
  → 200 DailyRecordSummary[]
GET  /api/daily/records/{record_id}    # 저장본 재생 (소유자)
  → 200 DailyStoryResponse
```

```typescript
interface StoryCard {
  kind: 'intro' | 'overall' | 'category' | 'caution' | 'color' | 'summary'
  category_key?: string      // kind=category: exam|money|love|career|health|social
  title: string              // 질문 라벨 — "오늘의 금전운"
  score?: number             // overall·category만
  headline: string           // 큰 문구 — "지갑 열되 큰 건 멈춰"
  body: string               // 1~2문장 반말
}
interface DailyStoryResponse {
  date: string
  day_ganji: { stem: string; branch: string }
  profile_name: string
  cards: StoryCard[]         // intro → overall → category×6 → caution → color → summary
  scores: Record<string, number>   // summary 카드 바 렌더용 {exam: 87, ...}
  keyword: string            // 오늘의 키워드 — 요약 카드 타이포
  record_id: number | null   // 로그인 시 저장 레코드
  rewritten: boolean         // GPT 리라이트 성공 여부 (false = 템플릿 폴백)
}
interface DailyRecordSummary { id: number; date: string; profile_name: string; keyword: string }
```

영역 분리: 트랙 A = backend만 / 트랙 B = apps/web·packages만.

---

## 트랙 A — 백엔드 (모델: opus)

기존 자산: `POST /api/saju/daily`(엔진 기반 — `DailyFortuneResponse`: overall·caution·basis·clothing_color·fortunes 6종·day_ganji), `llm/providers.py`(Strategy — **openai provider 존재 여부 확인**, 없으면 추가: `langchain-openai`, `settings.openai_api_key`), share 패턴, 1b의 인증 의존성(`get_current_user` — 선택적 인증용 변형 필요).

### A1. OpenAI provider 확보
`llm/providers.py`를 읽고 openai 지원이 없으면 추가 (`get_llm("openai")` — gpt-4o-mini 기본). `settings.openai_api_key: str = ""`. 키 없으면 폴백 동작(아래 A2)이 보장되므로 하드 의존 금지. 커밋: `feat: OpenAI provider 추가` (이미 있으면 스킵)

### A2. 스토리 조립 + GPT 리라이트 파이프라인 (TDD)
`llm/pipelines/daily_story.py` 신규:
1. 기존 daily 엔진 핸들러 호출 → `DailyFortuneResponse` 데이터
2. **결정론 조립**: 엔진 텍스트로 카드 11장 구성 (intro=일진, overall, category×6, caution, color, summary — summary의 keyword는 최고점 카테고리 기반 규칙 생성)
3. **GPT 리라이트 1회**: 카드들의 title 외 텍스트(headline·body)를 반말 직설 톤으로 일괄 변환 — 단일 호출, JSON 출력 파싱(`_parse_with_recovery` 패턴). **점수·간지·사실 변경 금지** 프롬프트 명시. 톤 예시(design.md §6): "64점. 지갑 열되 큰 건 멈춰."
4. **실패 시 graceful degrade**: 리라이트 실패·키 없음 → 엔진 템플릿 원문 + `rewritten: false` (spec §8 — 스토리는 항상 뜬다)
- 테스트: 조립(스텁 엔진 데이터 → 카드 11장·kind 순서), 리라이트 성공(LLM 스텁)·실패 폴백
- 커밋: `feat: 운세 스토리 파이프라인 추가 (조립 + GPT 리라이트)`

### A3. DailyFortuneRecord 모델 + 마이그레이션
```python
class DailyFortuneRecord(Base):
    __tablename__ = "daily_fortune_records"
    id: int (PK); user_id: int (FK, index)
    birth_hash: str (index)        # birth_input 정규화 문자열의 sha256 — 만세력별 1일 1회 키
    date: date; profile_name: str; keyword: str
    payload: JSON                  # DailyStoryResponse 전체
    created_at: datetime
    # unique (user_id, birth_hash, date)
```
커밋: `feat: 운세 기록 모델 추가`

### A4. 라우터 — 계약 3개 엔드포인트
- `routers/daily_story.py`: POST는 **선택적 인증** (`get_current_user_optional` 의존성 신규 — 쿠키/Bearer 있으면 유저, 없으면 None. 기존 get_current_user를 깨지 말고 별도 함수). 로그인 + 기존 레코드 → 저장본 반환, 없으면 생성+저장. 게스트 → 생성만
- `report_daily_limit` 같은 비용 통제는 불필요 (리라이트는 1일 1회 저장 구조 + 게스트는 경량 모델)... 단 게스트 어뷰즈 대비 `daily_story_guest_limit_per_ip: int | None = None` 설정값 자리만
- ASGI 테스트: 게스트 생성, 로그인 1일 1회(두 번째 호출 = 동일 payload), 기록 목록/단건 권한
- 커밋: `feat: 운세 스토리 API 추가`

### A5. 검증
`uv run pytest -q` 전체 그린 + 기존 `/api/saju/daily` 회귀 없음. LLM 실호출 금지(스텁) — 통합 1회는 컨트롤러.

---

## 트랙 B — 프론트 (모델: sonnet)

기존 자산: 홈 배너(`app/[locale]/page.tsx` — 현재 미링크), `RecentList`의 localStorage 최근 입력, `lib/manse/query.ts`, `currentUser()`/`serverAuthApi()`, 마이 탭의 "운세 기록" 비활성 자리, BrutalCard/Chip, 마스코트. 목업 v10의 스토리 인터랙션(좌/우 탭, 프로그레스 바, ✕)이 시각 기준.

### B1. api-client — daily 함수 + 계약 타입 (TDD)
`packages/api-client/src/daily.ts`: 계약 타입 + `createDailyStory(api, body)`, `listDailyRecords(api)`, `getDailyRecord(api, id)`. 커밋: `feat: api-client에 운세 스토리 함수 추가`

### B2. 진입 시트 — 홈 배너 연결
- 홈 배너 클릭 → **만세력 선택 바텀시트** (클라 컴포넌트): "누구의 운세를 볼까?" + 로그인 시 저장 만세력(listProfiles) + 게스트 최근 입력(localStorage) + [직접 입력하기 → /manse/new]. 항목 선택 → `/fortune?{birth 쿼리}` 이동. 안내 캡션 없음 (사용자 확정)
- **오늘 본 만세력 표시**: localStorage에 `(birthKey, date) → record됨` 캐시 — "다시 보기" 라벨
- 커밋: `feat: 운세 진입 만세력 선택 시트 추가`

### B3. 스토리 화면 — `/fortune`
- 클라 페이지: 마운트 시 localStorage 캐시 확인(게스트 1일 1회) → 없으면 `createDailyStory` (date = **사용자 로컬 날짜** `new Date()` 기반 YYYY-MM-DD) → 응답 localStorage 캐시
- 풀스크린 오버레이: 딥 틸 그라디언트(`story.gradientFrom→To` 토큰), 상단 프로그레스 바(채움 옐로), **좌 1/3 탭=뒤로·우 2/3 탭=다음**, ✕ 닫기(홈으로), 힌트 문구 없음, 이모지 없음
- 카드 렌더: kind별 — intro(마스코트+일진), overall/category(점수 54px `story.score` 오렌지 + 헤드라인 26px/900 + body), caution/color, **summary**(마스코트 + 카테고리 가로 점수 바 6개 — 저점만 `#FF8A2E` + "오늘의 키워드" 인용 타이포 + 버튼 2개)
- 로딩: 마스코트 + 문구 (리라이트 수 초 대비)
- 커밋: `feat: 운세 스토리 화면 구현`

### B4. 요약 카드 — 이미지 저장 + 링크 공유
- **이미지 저장**: 요약 카드를 캔버스로 렌더(외부 라이브러리 없이 Canvas API 직접 — 배경 그라디언트·텍스트·바·하단 "사주구리 sajuguri" 워터마크. **한글 폰트는 document.fonts.ready 대기 후** 그리기) → `toBlob` → a[download]. 1080×1920 (인스타 스토리 비율)
- **링크 공유**: record_id 있으면(로그인) `/fortune/r/{record_id}` 공유 URL 복사… 단 비로그인 열람 가능해야 하므로 **백엔드 share 토큰이 필요** — Phase 3 범위에선 record 공유는 보류하고 **이미지 저장만 1차 구현**, 링크 공유 버튼은 기존 DailyShare(`POST /api/share/daily` — `routers/share.py`에서 실제 경로 확인) 재사용해 레거시 공유 페이지 URL 복사. 두 방식이 안 맞으면 SKIPPED 기록
- 커밋: `feat: 운세 요약 카드 이미지 저장·공유 추가`

### B5. 마이 — 운세 기록 활성화
`/my`의 "운세 기록" 자리 → `listDailyRecords` 목록 (날짜 · 만세력 이름 · 키워드), 탭 → `/fortune?record={id}` (저장본 재생 — B3에서 record 파라미터 지원). 커밋: `feat: 마이 탭 운세 기록 연결`

### B6. 검증
`pnpm build/test/typecheck` 그린. 캔버스 로직 중 순수 부분(레이아웃 계산)은 `lib/fortune/*.ts` 분리 + 테스트.

### 공통 규칙
i18n ko/en(`fortune.*`) — 단 **스토리 카드 본문은 백엔드 생성 텍스트**라 UI 크롬만 메시지 키. 이모지 금지, 토큰만, G6 커밋, 스토리 화면도 max-w 640px 안에서 풀스크린(fixed inset-0).
