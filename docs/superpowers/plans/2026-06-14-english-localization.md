# English Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/en` 로케일에서 UI 라벨과 AI 생성 본문이 모두 자연스러운 영어로 나오게 한다. 명리 용어는 음역+괄호 설명으로 통일.

**Architecture:** 번역 레이어/추가 LLM 호출 없이, `language=="en"`일 때 시스템 프롬프트 끝에 "영어로 출력 + glossary 준수" 지시(suffix)를 덧붙여 한 번에 영어로 생성. 한국어 프롬프트가 단일 소스. UI는 en.json 전수 영어화 + glossary 표기 일치. `language`는 프론트 로케일→요청→서비스→파이프라인→프롬프트로 흐른다.

**Tech Stack:** FastAPI(3-layer)·LangChain·Pydantic / Next.js 15 App Router·next-intl(ko/en) / Node 검증 스크립트.

**Source spec:** `docs/superpowers/specs/2026-06-13-english-localization-design.md`

---

## File Structure

- `backend/llm/prompts/glossary.py` (생성) — 명리 용어 단일 소스 dict + 렌더 헬퍼.
- `backend/llm/prompts/lang.py` (생성) — `english_output_directive(glossary)`; ko면 "".
- `backend/llm/prompts/{report,un_flow,question,daily_story,chat}.py` (수정) — system prompt에 조건부 suffix.
- `backend/llm/reports/{base,runner,compatibility}.py` (수정) — `system_prompt(language)` / `run_report(..., language)`.
- `backend/services/{reports,compatibility,question,chat,daily_story}.py` (수정) — language 전달.
- `backend/pipelines/...` & `backend/llm/pipelines/{saju_report,question,daily_story}.py` (수정) — language 전달.
- `backend/schemas/{question}.py` (수정) — `language` 필드 추가(report·compatibility는 이미 존재).
- `apps/web/messages/en.json` (수정) — 한글 잔존 값 영어화.
- `apps/web/lib/i18n/glossary.ts` (생성, 선택) — 프론트 보조 표기.
- `apps/web/app/[locale]/{report/new,compatibility/new}/page.tsx`, 한줄상담·운세·챗 생성 호출 (수정) — 로케일을 `language`로 전달.
- `scripts/` 또는 기존 i18n 체크 위치 `check-en-untranslated.mjs` (생성) — en.json Hangul 가드 + allowlist.

---

## Task 1: 명리 용어집 단일 소스 (backend glossary)

**Files:**
- Create: `backend/llm/prompts/glossary.py`
- Test: `backend/tests/test_glossary.py`

- [ ] **Step 1: 실패 테스트** — `SAJU_GLOSSARY`가 dict이고 핵심 키(용신·대운·격국·신살·지장간·상생·상극·일간·오행·십성)를 포함하며, 값이 영어 음역+괄호 형식("Yongsin (favorable element)" 등)인지. `render_glossary_lines()`가 "한글 → English" 줄 목록 문자열을 반환하는지.
- [ ] **Step 2: 실패 확인** — `pytest backend/tests/test_glossary.py -v` (UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest …)
- [ ] **Step 3: 구현** — spec §4 표기를 dict로. 최소 위 핵심 용어 + 가능한 한 manse.charts에 등장하는 모든 명리 용어. `render_glossary(glossary: dict) -> str` 헬퍼.
- [ ] **Step 4: 통과 확인**
- [ ] **Step 5: 커밋** — `feat: 명리 용어집 단일 소스 추가`

## Task 2: 영어 출력 지시 헬퍼

**Files:**
- Create: `backend/llm/prompts/lang.py`
- Test: `backend/tests/test_lang_directive.py`

- [ ] **Step 1: 실패 테스트** — `english_output_directive("ko")` == "" ; `english_output_directive("en")`에 "English", "Keep the same JSON structure", "numbers", "ganji", 그리고 glossary 핵심 표기("Yongsin (favorable element)")가 포함. 반말 지시 금지 문구 포함.
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — `english_output_directive(language: str) -> str` (기본 glossary 주입; spec §5 문안). ko/기타 → "".
- [ ] **Step 4: 통과 확인**
- [ ] **Step 5: 커밋** — `feat: 조건부 영어 출력 지시 헬퍼 추가`

## Task 3: 사주 리포트 영어 배선 (report + un_flow)

**Files:**
- Modify: `backend/llm/prompts/report.py`, `backend/llm/prompts/un_flow.py`, `backend/llm/pipelines/saju_report.py`, `backend/services/reports.py`
- Test: `backend/tests/test_report_language.py`

- [ ] **Step 1: 실패 테스트** — report 시스템 프롬프트 빌더가 `language="en"`이면 영어 지시+glossary를 포함, `"ko"`면 미포함. service/pipeline이 요청 `language`를 프롬프트까지 전달(문자열 단위, LLM 호출 없음).
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — report.py/un_flow.py에 `build_system_prompt(language="ko")` (또는 기존 상수 + 조합 함수) 도입, 끝에 `english_output_directive(language)` 덧붙임. `saju_report.py`·`reports.py`가 `req.language`를 전달. 기존 호출 하위호환(기본 "ko").
- [ ] **Step 4: 통과 + 전체 백엔드 회귀** — `pytest backend/tests -q`
- [ ] **Step 5: 커밋** — `feat: 사주 리포트 영어 출력 배선`

## Task 4: 궁합 리포트 영어 배선 (ReportModule 계약 확장)

**Files:**
- Modify: `backend/llm/reports/base.py`, `backend/llm/reports/runner.py`, `backend/llm/reports/compatibility.py`, `backend/llm/prompts/compatibility_report.py`(있으면), `backend/services/compatibility.py`
- Test: `backend/tests/test_compatibility_language.py`

- [ ] **Step 1: 실패 테스트** — `run_report(module, inputs, request_topics=…, language="en")`가 모듈 `system_prompt("en")`을 쓰고 영어 지시 포함. `"ko"`면 미포함. service가 `CompatibilityReportRequest.language` 전달.
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — `ReportModule.system_prompt(self, language: str = "ko")`로 계약 확장(기존 구현 하위호환), `run_report(..., language: str = "ko")`가 `module.system_prompt(language)` 호출. compatibility 모듈 prompt에 suffix. service가 language 전달.
- [ ] **Step 4: 통과 + 회귀** — `pytest backend/tests -q`
- [ ] **Step 5: 커밋** — `feat: 궁합 리포트 영어 출력 배선`

## Task 5: 오늘의 운세 영어 배선

**Files:**
- Modify: `backend/llm/prompts/daily_story.py`, `backend/llm/pipelines/daily_story.py`, `backend/services/daily_story.py` (+ 필요 시 `schemas/daily.py`에 language)
- Test: `backend/tests/test_daily_story_language.py`

- [ ] **Step 1: 실패 테스트** — daily story 리라이트 시스템 프롬프트가 `language="en"`이면 영어 지시 포함. `build_daily_story(..., language="en")` 경로가 프롬프트까지 전달.
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — `build_daily_story(req, *, profile_name, date, language="ko")`로 확장, `_rewrite`/`rewrite_chunk`가 시스템 프롬프트에 suffix 부착. service/router가 로케일 전달(요청 또는 쿼리).
- [ ] **Step 4: 통과 + 회귀**
- [ ] **Step 5: 커밋** — `feat: 오늘의 운세 영어 출력 배선`

## Task 6: 한줄 상담 영어 배선

**Files:**
- Modify: `backend/schemas/question.py`(language 추가), `backend/llm/prompts/question.py`, `backend/llm/pipelines/question.py`, `backend/services/question.py`(있으면)
- Test: `backend/tests/test_question_language.py`

- [ ] **Step 1: 실패 테스트** — `QuestionRequest`에 `language: str = "ko"` 존재. question 시스템 프롬프트가 en이면 영어 지시 포함. 파이프라인이 language 전달.
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — schema language 추가, prompt suffix, pipeline 배선.
- [ ] **Step 4: 통과 + 회귀**
- [ ] **Step 5: 커밋** — `feat: 한줄 상담 영어 출력 배선`

## Task 7: 챗 영어 배선 (세션 로케일 저장)

**Files:**
- Modify: `backend/llm/prompts/chat.py`, `backend/services/chat.py`, `backend/schemas/chat.py`, (세션 테이블에 language 저장 — 기존 partner_info 패턴 참조; 마이그레이션 필요 시 alembic 0015)
- Test: `backend/tests/test_chat_language.py`

- [ ] **Step 1: 실패 테스트** — 챗 시스템 프롬프트 빌더가 `language="en"`이면 영어 지시 포함. 세션 생성 시 저장된 로케일이 매 메시지 프롬프트에 반영.
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — `build_chat_system_prompt(saju_summary, language="ko")` 확장 + suffix. 세션 생성 시 로케일 저장(컬럼 추가 시 alembic head=0014 다음 0015), 메시지 처리에서 사용. **마이그레이션 추가 시 신규 컬럼 nullable + 기본 'ko'.**
- [ ] **Step 4: 통과 + 회귀 + (마이그레이션이면) `alembic upgrade head` 로컬 검증**
- [ ] **Step 5: 커밋** — `feat: 챗 영어 출력 배선`

## Task 8: 프론트 로케일 → language 전달

**Files:**
- Modify: `apps/web/app/[locale]/report/new/page.tsx`, `apps/web/app/[locale]/compatibility/new/page.tsx`, 한줄상담 호출, 운세 생성 호출, 챗 세션 생성 호출
- Test: 해당되면 `apps/web` vitest (호출 인자 검증) 또는 타입체크

- [ ] **Step 1: 현황 파악** — `grep -rn "language" apps/web` 로 하드코딩된 `language:'ko'`와 생성 호출 위치 찾기.
- [ ] **Step 2: 구현** — 각 생성 호출이 `useLocale()`(client)/`getLocale()`(server)로 얻은 현재 로케일을 `language`로 전달. 하드코딩 'ko' 제거.
- [ ] **Step 3: 타입체크** — `cd apps/web && npx tsc --noEmit`
- [ ] **Step 4: 커밋** — `feat: 생성 호출이 현재 로케일을 language로 전달`

## Task 9: en.json 전수 영어화

**Files:**
- Modify: `apps/web/messages/en.json`
- (참고) Create 선택: `apps/web/lib/i18n/glossary.ts`

- [ ] **Step 1: 잔존 한글 감사** — `node -e` 또는 grep으로 en.json 값 중 `[가-힣]` 포함 항목 전부 나열.
- [ ] **Step 2: 영어화** — 각 값을 자연스러운 영어로. 명리 용어는 Task1 glossary 표기와 **정확히 일치**. 의도된 한글(언어명 `한국어`, 병기 라벨)은 그대로 두고 allowlist 후보로 기록.
- [ ] **Step 3: parity 확인** — 기존 `check-i18n`(ko/en 키 parity) 통과.
- [ ] **Step 4: 커밋** — `feat: en.json 잔존 한글 값 영어화`

## Task 10: en.json Hangul 회귀 가드

**Files:**
- Create: `apps/web/scripts/check-en-untranslated.mjs` (또는 기존 i18n 체크 위치)
- Modify: `package.json`/turbo 파이프라인 또는 기존 check 스크립트에 연결

- [ ] **Step 1: 실패 테스트** — en.json에 (allowlist 외) 한글 값이 있으면 비0 종료. allowlist(언어명 등)는 통과.
- [ ] **Step 2: 구현** — 재귀로 문자열 값 스캔, `[가-힣]` 정규식, allowlist 경로/값 예외. 위반 시 경로+값 출력 후 exit 1.
- [ ] **Step 3: 실행 확인** — Task 9 이후 상태에서 통과. 일부러 한글 넣으면 실패.
- [ ] **Step 4: 커밋** — `chore: en.json 미번역 한글 가드 추가`

## Task 11: 통합 검증

- [ ] **Step 1: 백엔드 전체** — `pytest backend/tests -q` 전부 통과.
- [ ] **Step 2: 프론트** — `cd apps/web && npx tsc --noEmit`; `check-i18n`; `check-en-untranslated`.
- [ ] **Step 3: 배선 점검** — 각 도메인(report/compat/daily/question/chat)에서 language=en→프롬프트 suffix 도달을 단위 테스트로 재확인.
- [ ] **Step 4: 요약** — 변경 파일·테스트 결과·수동 스모크 체크리스트(`/en`에서 5개 생성 본문 영어+용어 음역+숫자/간지 보존)를 정리.

---

## Self-Review Notes
- glossary 표기는 backend dict와 en.json 값이 **동일 문자열**이어야 함(Task 1·9 교차 확인).
- 모든 `system_prompt`/`run_report`/`build_*` 시그니처는 `language` 기본값 "ko"로 하위호환 — 기존 호출 깨지지 않음.
- 마이그레이션(Task 7)은 nullable+기본 'ko', 로컬 `alembic upgrade head` 검증. 프로덕션은 CI 배포 시 자동 적용(Dockerfile CMD).
- 커밋: Co-Authored-By 금지, scope 괄호 금지, 독립 변경 분리.
