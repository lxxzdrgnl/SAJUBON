# 영문(English) 지원 설계

> 작성일: 2026-06-13 · 상태: 설계 승인 대기

## 1. 목표

`/en` 로케일에서 **UI 라벨과 AI 생성 본문이 모두 영어로** 나오는 진짜 영문 서비스를 만든다. 명리 전문용어는 **음역 + 괄호 설명**(예: `Yongsin (favorable element)`, `Daeun (luck pillars)`)으로 통일한다.

## 2. 현재 실태 (감사)

- next-intl ko/en 구성. `check-i18n`이 ko/en 키 **존재(parity)** 는 보장하지만 **번역 품질은 미검사**.
- `apps/web/messages/en.json` 에 한글 잔존 값 ~31개 — 대부분 `manse.charts.*` 명리 용어, 일부는 의도된 것(언어명 `한국어`, 병기 라벨 `Great Luck (대운)`).
- **AI 본문은 항상 한국어**: `language` 파라미터가 `schemas/report.py`에 "현재 ko 고정" 주석으로만 있고 프롬프트에 안 물림. report·daily_story·question·compatibility_report·chat 프롬프트 전부 한국어 전용.

## 3. 범위

**핵심 로직: 생성 시 영어 출력 지시(suffix)** — 별도 번역 레이어/추가 호출 없음. 한국어 프롬프트는 단일 소스, `language=="en"`일 때만 "본문은 영어로, 구조·숫자·간지는 보존, 용어는 glossary대로" 지시 + glossary를 시스템 프롬프트 끝에 덧붙여 한 번에 영어로 생성. 한국어 프롬프트를 고쳐도 영어가 자동 추종(이중 관리 없음), RAG는 한국어 생성에만 쓰이므로 영어 RAG 불필요. (표준·구조적 근거는 §5.)

**In scope (UI + AI 전부):**
- UI 라벨 en.json 전수 영어화 (명리 용어는 glossary 정책 적용).
- AI 생성 본문 영어화: 사주 리포트·오늘의 운세·한줄 상담·궁합 리포트·챗 — **조건부 영어 출력 지시(suffix)** 적용.
- 프론트의 생성 호출이 현재 로케일을 `language`로 전달 (백엔드가 영어 지시 부착 판단).
- 명리 용어집(glossary) 단일 소스 — UI·프롬프트 suffix 일관성.

**Out of scope (YAGNI):**
- 한국어/영어 외 추가 언어.
- 영어 RAG 지식베이스 재색인 — 1차는 한국어 RAG 컨텍스트 + 영어 출력(프롬프트가 "한국어 근거를 영어로 서술"). 영어 코퍼스는 후속.
- OG 이미지 영어 폰트 — 영어는 기본 라틴 폰트로 충분, 기존 Noto 서브셋 경로 유지.

## 4. 명리 용어집 (Glossary) — 단일 소스

UI와 AI가 같은 표기를 쓰도록 용어집을 한 곳에 둔다.

- **Backend**: `backend/llm/prompts/glossary.py` — 예: `{ "용신": "Yongsin (favorable element)", "대운": "Daeun (luck pillars)", "격국": "Gyeokguk (chart structure)", "신살": "Sinsal (symbolic stars)", "지장간": "Jijanggan (hidden stems)", "상생": "generating cycle", "상극": "controlling cycle", "일간": "Day Master", "오행": "Five Elements", ... }`. 영어 프롬프트에 "Use these exact term renderings: …"로 주입.
- **Frontend**: 동일 표기를 en.json 값에 확정 반영(필요 시 `apps/web/lib/i18n/glossary.ts` 보조).
- 두 소스의 표기가 일치해야 함 — 용어집 표를 이 spec에 1벌 두고 양쪽이 따른다.

## 5. AI 콘텐츠 영어화 — 조건부 영어 출력 지시(suffix), 단일 호출

별도 번역 레이어/추가 호출 없이, **생성 시 출력 언어를 지정**한다(생성형 LLM 앱 표준). 한국어 프롬프트는 단일 소스로 두고, `language=="en"`일 때만 **공통 영어 출력 지시 + glossary**를 시스템 프롬프트 끝에 붙인다. 점수·간지·숫자는 모델이 *같은 구조화 출력 안에서* 채우므로 보존이 보장된다(별도 번역기보다 구조적으로 안전). 호출 +0회.

- **공통 suffix 헬퍼**: `backend/llm/prompts/lang.py` — `english_output_directive(glossary) -> str`:
  > "Write all natural-language fields (headlines, body, summaries) in natural, fluent English. Keep the same JSON structure, all numbers, scores, and ganji (간지) exactly as-is — do not translate names of people or pillar characters. Render saju terms EXACTLY per this glossary: …(glossary 주입). Keep headlines punchy and conclusion-style; do not apply Korean speech-level (반말) instructions."
  - ko면 빈 문자열 → 기존 한국어 프롬프트 그대로.
- **배선**: 각 프롬프트의 `system_prompt(language="ko")`가 끝에 `english_output_directive`를 조건부로 덧붙인다. `language`를 요청→서비스→파이프라인→프롬프트로 전달.
  - 사주 리포트: `schemas/report.py` language(존재) → `services/reports.py` → `pipelines/saju_report.py` → `prompts/report.py`. (`un_flow`도 동일.)
  - 궁합 리포트: `CompatibilityReportRequest.language` → `services/compatibility.py` → `runner.run_report(..., language=)` → 모듈 `system_prompt(language)`.
  - 오늘의 운세: `prompts/daily_story.py` 리라이트 시스템 프롬프트에 suffix + `pipelines/daily_story.py`에 language.
  - 한줄 상담: `prompts/question.py` + `pipelines/question.py` + `QuestionRequest.language`(없으면 추가).
  - 챗: `prompts/chat.py` 시스템 프롬프트에 동일 suffix. language는 세션 생성 시 로케일 저장(메시지 요청마다 재전달 불필요).
- **저장 정책**: 리포트류는 생성 시점 언어로 본문이 나오므로 그대로 스냅샷 저장(language 고정). 공유 페이지 재생성 없음.
- **ReportModule 계약 영향(최소)**: `system_prompt`가 `language` 인자를 받도록 확장(기본 "ko" 하위호환), `runner.run_report(module, inputs, *, request_topics, language="ko")`. `format_message`는 무관(신호 직렬화).

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

- Backend suffix: `language="en"`이면 `system_prompt`에 영어 출력 지시 + glossary가 포함되고, `"ko"`면 안 붙는지(문자열 단위 테스트, LLM 호출 불필요). glossary 용어 표기가 지시문에 들어가는지.
- 배선: 각 서비스/파이프라인이 요청 `language`를 프롬프트까지 전달하는지.
- Frontend: 생성 호출이 현재 로케일을 `language`로 넘기는지. en.json Hangul 가드 통과.
- 수동 스모크: `/en`에서 리포트·운세·궁합·한줄상담·챗 생성 → 본문 영어 + 용어 음역 확인, 점수·간지·숫자 보존 확인.

## 10. 단계 (구현 순서 후보)

1. 용어집 확정(backend glossary + en.json 명리 값) + Hangul 가드.
2. en.json 전수 영어화 + 프론트 로케일 배선(`language` 전달).
3. 영어 출력 지시 헬퍼(`llm/prompts/lang.py`) + 프롬프트 suffix 부착 + `language` 배선 — 리포트류(사주·궁합) 먼저, 그다음 운세·한줄상담·챗.
4. 통합 검증 + 수동 스모크.

## 11. 재사용·일관성

- 커밋 규칙: Co-Authored-By 금지, scope 괄호 금지, 독립 변경 분리.
- glossary 단일 소스 원칙 — UI/AI 표기 불일치 금지.
