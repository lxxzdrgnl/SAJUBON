# 영문(English) 지원 설계

> 작성일: 2026-06-13 · 상태: 설계 승인 대기

## 1. 목표

`/en` 로케일에서 **UI 라벨과 AI 생성 본문이 모두 영어로** 나오는 진짜 영문 서비스를 만든다. 명리 전문용어는 **음역 + 괄호 설명**(예: `Yongsin (favorable element)`, `Daeun (luck pillars)`)으로 통일한다.

## 2. 현재 실태 (감사)

- next-intl ko/en 구성. `check-i18n`이 ko/en 키 **존재(parity)** 는 보장하지만 **번역 품질은 미검사**.
- `apps/web/messages/en.json` 에 한글 잔존 값 ~31개 — 대부분 `manse.charts.*` 명리 용어, 일부는 의도된 것(언어명 `한국어`, 병기 라벨 `Great Luck (대운)`).
- **AI 본문은 항상 한국어**: `language` 파라미터가 `schemas/report.py`에 "현재 ko 고정" 주석으로만 있고 프롬프트에 안 물림. report·daily_story·question·compatibility_report·chat 프롬프트 전부 한국어 전용.

## 3. 범위

**핵심 로직: 한국어로 생성 → 공통 번역 레이어로 영어화** (로직 B). 프롬프트는 전부 한국어 단일 소스로 두고, 생성된 결과 본문만 번역 레이어 1개가 영어로 바꾼다. 한국어 프롬프트를 고쳐도 영어가 자동으로 따라오고(이중 관리 없음), RAG는 한국어 생성에만 쓰이므로 영어 RAG 불필요.

**In scope (UI + AI 전부):**
- UI 라벨 en.json 전수 영어화 (명리 용어는 glossary 정책 적용).
- AI 생성 본문 영어화: 사주 리포트·오늘의 운세·한줄 상담·궁합 리포트·챗 — **공통 번역 레이어** 적용 (챗만 예외, §5 참고).
- 프론트의 생성 호출이 현재 로케일을 `language`로 전달 (백엔드가 번역 여부 판단).
- 명리 용어집(glossary) 단일 소스 — UI·번역 레이어 일관성.

**Out of scope (YAGNI):**
- 한국어/영어 외 추가 언어.
- 영어 RAG 지식베이스 재색인 — 1차는 한국어 RAG 컨텍스트 + 영어 출력(프롬프트가 "한국어 근거를 영어로 서술"). 영어 코퍼스는 후속.
- OG 이미지 영어 폰트 — 영어는 기본 라틴 폰트로 충분, 기존 Noto 서브셋 경로 유지.

## 4. 명리 용어집 (Glossary) — 단일 소스

UI와 AI가 같은 표기를 쓰도록 용어집을 한 곳에 둔다.

- **Backend**: `backend/llm/prompts/glossary.py` — 예: `{ "용신": "Yongsin (favorable element)", "대운": "Daeun (luck pillars)", "격국": "Gyeokguk (chart structure)", "신살": "Sinsal (symbolic stars)", "지장간": "Jijanggan (hidden stems)", "상생": "generating cycle", "상극": "controlling cycle", "일간": "Day Master", "오행": "Five Elements", ... }`. 영어 프롬프트에 "Use these exact term renderings: …"로 주입.
- **Frontend**: 동일 표기를 en.json 값에 확정 반영(필요 시 `apps/web/lib/i18n/glossary.ts` 보조).
- 두 소스의 표기가 일치해야 함 — 용어집 표를 이 spec에 1벌 두고 양쪽이 따른다.

## 5. AI 콘텐츠 영어화 — 공통 번역 레이어

프롬프트는 **전부 한국어 그대로 단일 소스**. 생성된 한국어 결과의 **본문 필드만** 공통 번역 레이어가 영어로 바꾼다. 프롬프트·RAG·ReportModule 계약은 **무수정**.

- **번역 레이어**: `backend/llm/translate.py` — `translate_fields(value, *, target="en") -> 동형 구조`.
  - 지정한 텍스트 필드(헤드라인, 탭 본문, 요약, 운세 문구 등)만 번역하고 **키·숫자·간지·사람 고유명사·구조는 보존**.
  - 모델은 저렴한 nano/mini. 시스템 프롬프트: "Translate the given Korean string values to natural English. Preserve JSON structure, numbers, and Korean personal names. Render saju terms EXACTLY per this glossary: …(glossary 주입). Keep headlines punchy and conclusion-style."
  - 구현은 dict/list 재귀 + "번역 대상 필드 화이트리스트"로 안전하게(점수·간지 같은 비번역 필드 건드리지 않게).
- **적용 지점 (서비스/파이프라인에서 생성 직후, `language=="en"`일 때 1회)**:
  - 사주 리포트: `services/reports.py` — 생성된 `tabs`/`year_flow`/`dae_un_analysis` 본문 필드 번역 후 **번역본을 스냅샷 저장**(리포트는 language 고정).
  - 궁합 리포트: `services/compatibility.py` — `run_compatibility_report` 결과 `tabs` 본문 번역 후 저장.
  - 오늘의 운세: `pipelines/daily_story.py` 또는 서비스 — 카드 headline/body 번역.
  - 한줄 상담: `services`/`pipelines/question.py` — 결과 본문 번역. (`QuestionRequest.language` 없으면 추가.)
- **저장 정책**: 리포트류는 **생성 시점에 1회 번역해 영어 스냅샷 저장**. 공유 페이지는 재계산·재번역 없음(스냅샷 그대로).
- **챗 (예외)**: 스트리밍이라 사후 번역은 UX가 나쁨(한국어 떴다가 교체). 챗만 `prompts/chat.py`에 **영어 시스템 프롬프트 분기**를 둬서 처음부터 영어로 스트리밍. language는 세션 생성 시 로케일 저장. (챗은 번역 레이어 미적용.)
- **ReportModule 계약/`runner` 무수정** — 번역은 서비스 레이어에서 결과에 적용하므로 모듈·러너·프롬프트를 안 건드린다. 새 리포트 추가해도 번역 레이어 그대로 재사용.

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

- Backend 번역 레이어: 본문 필드만 번역하고 **점수·간지·숫자·사람 이름·구조는 보존**하는지(번역 LLM 모킹). glossary 용어가 시스템 프롬프트에 주입되는지. `language=="en"`일 때만 서비스가 번역 레이어를 호출하고 ko면 패스하는지.
- 챗: `language="en"`에서 영어 시스템 프롬프트가 선택되는지.
- Frontend: 생성 호출이 현재 로케일을 `language`로 넘기는지. en.json Hangul 가드 통과.
- 수동 스모크: `/en`에서 리포트·운세·궁합·한줄상담·챗 생성 → 본문 영어 + 용어 음역 확인, 점수·간지 한국어/숫자 보존 확인.

## 10. 단계 (구현 순서 후보)

1. 용어집 확정(backend glossary + en.json 명리 값) + Hangul 가드.
2. en.json 전수 영어화 + 프론트 로케일 배선(`language` 전달).
3. 공통 번역 레이어(`llm/translate.py`) + 서비스 적용 — 리포트류(사주·궁합) 먼저, 그다음 운세·한줄상담.
4. 챗 영어 프롬프트 분기 (번역 레이어 예외).
5. 통합 검증 + 수동 스모크.

## 11. 재사용·일관성

- 커밋 규칙: Co-Authored-By 금지, scope 괄호 금지, 독립 변경 분리.
- glossary 단일 소스 원칙 — UI/AI 표기 불일치 금지.
