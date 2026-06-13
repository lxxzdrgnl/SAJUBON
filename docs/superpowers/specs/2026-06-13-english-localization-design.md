# 영문(English) 지원 설계

> 작성일: 2026-06-13 · 상태: 설계 승인 대기

## 1. 목표

`/en` 로케일에서 **UI 라벨과 AI 생성 본문이 모두 영어로** 나오는 진짜 영문 서비스를 만든다. 명리 전문용어는 **음역 + 괄호 설명**(예: `Yongsin (favorable element)`, `Daeun (luck pillars)`)으로 통일한다.

## 2. 현재 실태 (감사)

- next-intl ko/en 구성. `check-i18n`이 ko/en 키 **존재(parity)** 는 보장하지만 **번역 품질은 미검사**.
- `apps/web/messages/en.json` 에 한글 잔존 값 ~31개 — 대부분 `manse.charts.*` 명리 용어, 일부는 의도된 것(언어명 `한국어`, 병기 라벨 `Great Luck (대운)`).
- **AI 본문은 항상 한국어**: `language` 파라미터가 `schemas/report.py`에 "현재 ko 고정" 주석으로만 있고 프롬프트에 안 물림. report·daily_story·question·compatibility_report·chat 프롬프트 전부 한국어 전용.

## 3. 범위

**In scope (UI + AI 전부):**
- UI 라벨 en.json 전수 영어화 (명리 용어는 glossary 정책 적용).
- AI 생성 본문 영어화: 사주 리포트·오늘의 운세·한줄 상담·궁합 리포트·챗 — 프롬프트 영어 분기 + `language` 배선.
- 프론트의 생성 호출이 현재 로케일을 `language`로 전달.
- 명리 용어집(glossary) 단일 소스 — UI·AI 일관성.

**Out of scope (YAGNI):**
- 한국어/영어 외 추가 언어.
- 영어 RAG 지식베이스 재색인 — 1차는 한국어 RAG 컨텍스트 + 영어 출력(프롬프트가 "한국어 근거를 영어로 서술"). 영어 코퍼스는 후속.
- OG 이미지 영어 폰트 — 영어는 기본 라틴 폰트로 충분, 기존 Noto 서브셋 경로 유지.

## 4. 명리 용어집 (Glossary) — 단일 소스

UI와 AI가 같은 표기를 쓰도록 용어집을 한 곳에 둔다.

- **Backend**: `backend/llm/prompts/glossary.py` — 예: `{ "용신": "Yongsin (favorable element)", "대운": "Daeun (luck pillars)", "격국": "Gyeokguk (chart structure)", "신살": "Sinsal (symbolic stars)", "지장간": "Jijanggan (hidden stems)", "상생": "generating cycle", "상극": "controlling cycle", "일간": "Day Master", "오행": "Five Elements", ... }`. 영어 프롬프트에 "Use these exact term renderings: …"로 주입.
- **Frontend**: 동일 표기를 en.json 값에 확정 반영(필요 시 `apps/web/lib/i18n/glossary.ts` 보조).
- 두 소스의 표기가 일치해야 함 — 용어집 표를 이 spec에 1벌 두고 양쪽이 따른다.

## 5. AI 콘텐츠 영어화 — 프롬프트 language 분기

각 프롬프트 모듈에 ko/en 시스템 프롬프트를 두고, `language`를 파이프라인→모듈→프롬프트까지 배선한다.

- **패턴**: 프롬프트 모듈에 `system_prompt(language="ko")` 형태. en이면 "Write in natural English. Render saju terms per the glossary." + 영어 톤 가이드. 출력 스키마(헤드라인/탭/JSON)는 언어 무관 — 본문 문자열만 영어.
- **대상 + 배선 지점**:
  - 사주 리포트: `schemas/report.py` language(이미 존재) → `services/reports.py` → `llm/pipelines/saju_report.py` → `prompts/report.py`.
  - 궁합 리포트: `CompatibilityReportRequest.language` → `services/compatibility.py` → `llm/reports/compatibility.py`/`runner` → `prompts/compatibility_report.py`. (runner의 `_invoke_writer`가 language를 모듈 prompt에 전달하도록 시그니처 보강.)
  - 오늘의 운세: `prompts/daily_story.py` 리라이트 프롬프트 en 분기 + `pipelines/daily_story.py`에 language.
  - 한줄 상담: `prompts/question.py` + `pipelines/question.py` + `QuestionRequest.language`(없으면 추가).
  - 챗: `prompts/chat.py` 시스템 프롬프트 en 분기. language는 세션/요청에서 — 세션 생성 시 로케일 저장 또는 메시지 요청에 동봉.
- **ReportModule 계약 영향**: `system_prompt`/`format_message`가 `language`를 받도록 시그니처 확장(기본 "ko"로 하위호환). `runner.run_report(module, inputs, *, request_topics, language="ko")`.

## 6. 프론트 로케일 배선

- 생성 호출이 현재 next-intl 로케일을 `language`로 전달:
  - `report/new` (현재 `language:'ko'` 하드코딩 → 로케일), `compatibility/new`(동일), 한줄상담(`question`), 운세 생성, 챗 세션 생성.
- 로케일 획득: `useLocale()` (client) / `getLocale()` (server).

## 7. UI 라벨 영어화

- `en.json` 전수 감사 → 한글 잔존 값 영어화. 명리 용어는 glossary 표기 적용. 의도된 한글(언어명 `한국어`, 병기 라벨)은 allowlist로 유지.
- 신규 `compatibility.*`/`chat.*`/`my.*` 키도 자연스러운 영어로 재검토(에이전트가 채운 값 품질 점검).

## 8. 가드 (회귀 방지)

- `check-i18n` 확장 (또는 신규 `check-en-untranslated.mjs`): `en.json` 값에 한글(`[가-힣]`)이 있으면 실패. 단 의도된 항목은 allowlist(언어명 등). 이후 영어 미번역이 새로 들어오면 CI에서 잡힌다.

## 9. 테스트

- Backend: 각 파이프라인에 `language="en"` 인자 시 영어 프롬프트가 선택되는지 단위 테스트(Writer 모킹, system prompt에 영어 지시·glossary 포함 확인).
- Frontend: 생성 호출이 로케일을 language로 넘기는지. en.json Hangul 가드 통과.
- 수동 스모크: `/en`에서 리포트·운세·궁합·한줄상담·챗 생성 → 본문 영어 + 용어 음역 확인.

## 10. 단계 (구현 순서 후보)

1. 용어집 확정(backend glossary + en.json 명리 값) + Hangul 가드.
2. en.json 전수 영어화 + 프론트 로케일 배선.
3. AI 프롬프트 language 분기 — 리포트류(사주·궁합) 먼저, 그다음 운세·한줄상담·챗.
4. 통합 검증 + 수동 스모크.

## 11. 재사용·일관성

- 커밋 규칙: Co-Authored-By 금지, scope 괄호 금지, 독립 변경 분리.
- glossary 단일 소스 원칙 — UI/AI 표기 불일치 금지.
