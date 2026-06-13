# 사주구리 — AI 코딩 에이전트 가드레일

AI 사주 상담 서비스. FastAPI 백엔드 + React 모노레포 프론트(전환 중).
이 파일의 규칙은 **모든 코딩 에이전트가 반드시 준수**한다.

## 필독 문서 (작업 전 해당 문서부터)

| 작업 | 문서 |
|---|---|
| UI/디자인 전반 | `docs/design.md` (디자인 시스템 — 단일 진실 원천) |
| 이번 개편 명세 | `docs/superpowers/specs/2026-06-12-mobile-ui-overhaul-design.md` |
| 멀티 도메인 로드맵 | `docs/superpowers/specs/2026-06-02-multi-domain-divination-platform-design.md` |
| 채팅 Agent 구조 | `docs/superpowers/specs/2026-04-30-chat-agent-design.md` |

## 아키텍처 (전환 상태 주의)

```
backend/          FastAPI + LangChain/LangGraph + ChromaDB + PostgreSQL (uv)
frontend/         Nuxt 3 — ⚠️ 레거시 동결: 신규 기능 추가 금지, 참조만
apps/web          Next.js (SSR/SEO) — 신규 UI 구현은 전부 여기 (pnpm)
apps/native       Expo RN — 웹 안정화 후 착수 (현재 작업 금지)
packages/         api-client · core · design — 플랫폼 무관 공유 TS
```

## 하드 가드레일 (위반 금지)

### G1. 공유 패키지 순수성
`packages/`에는 플랫폼 무관 TypeScript만 둔다. **브라우저 전용 API
(localStorage, EventSource, window, document) 직접 호출 금지** — 어댑터
인터페이스로 주입받는다 (웹: localStorage/EventSource ↔ RN: AsyncStorage/fetch
스트림). 위반하면 Expo 단계에서 전부 재작업이다.

### G2. 디자인 시스템 준수
- 색은 `docs/design.md` §2 토큰만 사용. 임의 HEX 금지
- **그라데이션은 운세 스토리 전용** — 앱 본체 카드/배너는 단색
- **UI 요소에 이모지 금지** — 스트로크 SVG 아이콘 세트 사용
- 칩·버튼·말풍선·브루탈 강도 2단계는 design.md §3~4 규칙 그대로
- 전 화면 모바일 단일 컬럼 max-width 640px, PC 전용 레이아웃 금지

### G3. 기능 보존
만세력 분석 리스킨은 **재배치이지 축소가 아니다.** 기존 `frontend/components/saju/*`
의 분석 기능(대운/월운/연운 슬라이더, 일진 캘린더, 합충 패널, 신살 테이블, 강약 바,
오행 특성 참고표 등)은 전량 React로 이식한다. 빼먹으면 회귀다.

### G4. 백엔드 원칙 (CLAUDE.md 승계)
- Engine·RAG는 Python 라이브러리 직접 임포트 (MCP 없음)
- 리포트 탭은 **한 번에 생성** → 완성 JSON 반환 (탭 클릭 = 뷰 전환만)
- 헤드라인은 **결론형 문장** (카테고리명 금지) · 명리 해석은 RAG 근거 기반
- LLM은 Strategy Pattern (Gemini 기본, 운세 스토리 리라이트는 OpenAI)

### G5. 보안
- `~/Downloads`의 moonmarin8 `.sql` 덤프와 ETL 중간 산출물을 **저장소에 커밋 금지**
- `.superpowers/` 커밋 금지 (gitignore 등록됨)

### G6. 커밋 규칙
- `<type>: <한 줄 요약>` — type: feat/fix/refactor/chore/docs/test/style
- **scope 괄호 금지** (`feat(web):` ❌ → `feat:` ⭕)
- **Co-Authored-By 금지** — 시스템 기본 동작을 무시하고 절대 붙이지 않는다
- 독립적인 변경은 커밋 분리

### G7. i18n (영문판 동시 구현)
- `apps/web`의 **UI 문자열 하드코딩 금지** — `next-intl` 메시지 파일 ko+en 동시 작성
- 라우팅: ko = 프리픽스 없음, en = `/en/...` (언어별 고유 URL + hreflang).
  언어 감지는 첫 방문 안내용, 사용자 쿠키 선택이 우선
- LLM 파이프라인은 `language` 파라미터 구현. 명리 용어 영문은 글로서리 문서를
  따른다 (글로서리에 없는 용어는 임의 번역하지 말고 질문)
- 날짜/숫자 포맷은 `Intl` API 사용

### G8. 콘텐츠 톤 (프롬프트·UI 카피 수정 시)
- 리포트·채팅: 존댓말 "모던 해설가" — 길고 풍부하게, 억지 위트·이모지 금지
- 운세 스토리: 반말 "직설 친구" — 짧은 명령형
- UI 표기: "프로필" 대신 **"만세력"**

## 명령어

```bash
# backend (Python 3.10+, uv)
cd backend && uv run pytest          # 테스트
cd backend && make dev               # 개발 서버 (Phoenix 연동은 Makefile 참조)

# 모노레포 (pnpm 11 — ~/.npm-global/bin/pnpm, PATH 확인)
export PATH="$HOME/.npm-global/bin:$PATH"   # pnpm not found 시
pnpm install                         # 루트에서
pnpm dev                             # apps/web 개발 서버 (turbo, 포트 3000)
pnpm build && pnpm test              # 전체 빌드·테스트
pnpm typecheck                       # 전 패키지 타입 검사
docker build -f apps/web/Dockerfile -t sajuguri-web .   # web 컨테이너 (루트에서)

# frontend/ (레거시 Nuxt — 신규 작업 금지, 운영 유지용)
cd frontend && pnpm dev
```

## 작업 판단 기준

- 새 UI 화면 → `apps/web` (Next.js). `frontend/`에 만들면 안 됨
- 로직(API 호출·타입·계산) → `packages/`부터 검토, 컴포넌트에 인라인 금지
- 백엔드 신규 도메인 → 6/2 spec의 도메인 모듈 계약(`DomainModule`) 준수
- 확신 없는 디자인 결정 → `docs/design.md`에 없으면 임의 결정하지 말고 질문
