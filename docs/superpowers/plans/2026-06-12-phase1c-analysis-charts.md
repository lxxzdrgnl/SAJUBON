# Phase 1c — 분석 화면 차트 전량 이식 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 만세력 분석 화면(`/manse/result`)에 레거시 분석 기능을 **전량**(G3) 이식 — 오행 밸런스·십성 구조·강약/용신·대운/연운/월운·일진 캘린더·합충·신살/12운성/지장간 상세·오행 특성표.

**Architecture:** 각 레거시 Vue 컴포넌트(`frontend/components/saju/*`)를 **읽고** 캔디 브루탈 디자인 언어로 **재설계 이식**한다 — 1:1 복제가 아니라 spec §4.5·design.md §5.3 구조에 맞춘 재구성. 차트는 순수 SVG(라이브러리 금지, spec §7.5). calc 응답(`SajuCalcResponse`)에 있는 데이터는 서버 컴포넌트로, 추가 API(연운/월운/일진)는 클라이언트 컴포넌트로.

**Tech Stack:** React 19 서버/클라 컴포넌트, 순수 SVG, `@sajuguri/design` 토큰, vitest(로직만)

**이식 매핑 (레거시 → 신규):** 모든 신규 파일은 `apps/web/components/manse/` 하위.

| Task | 레거시 소스 (읽기 전용) | 신규 | 데이터 |
|---|---|---|---|
| 1 | `Table.vue`(하단부)·`ResultPanel.vue` | `DetailAccordion.tsx` — 12운성·신살·지장간 접이식 (기둥별) | `*_pillar.twelve_wun/twelve_sin_sal`, `ji_jang_gan`, `sin_sals` 전체 |
| 2 | `WuxingBalanceTable.vue`·`WuxingPentagram.vue`·`WuxingDonutChart.vue` | `WuxingBalanceCard.tsx` — 균형도 블랙 뱃지 + 오행 5색 가로 바 + 판정 칩(과다=오렌지 틴트·부족=틸 틴트) + **펜타그램 SVG 탭 전환** | `wuxing_count_hap`, `dominant_elements`, `weak_elements` |
| 3 | `SipseongDonutChart.vue` | `TenGodsCard.tsx` — SVG 도넛(중앙 핵심 구조) + 비겁/인성/재성/식상/관성 요약 바 | `ten_gods_distribution`, `structure_patterns` |
| 4 | `StrengthBar.vue`·`StrengthChart.vue`·`YongSinBadge.vue` | `StrengthCard.tsx` — 강약 게이지 + 득령/득지/득시/득세 칩 + 용신/희신/기신 뱃지 | `day_master_strength`, `yong_sin` |
| 5 | `DaeUnSlider.vue` | `DaeUnTimeline.tsx`(클라) — 대운 가로 스크롤 카드, 현재 대운 오렌지 강조 | `dae_un_list`, `current_dae_un`, `dae_un_start_age` |
| 6 | `YeonUnSlider.vue`·`WolUnSlider.vue` | `YeonWolUn.tsx`(클라) — 연운/월운 탭 + API 호출 | `GET /api/saju/yeon-un`·`/wol-un` (실제 경로·파라미터는 `backend/routers/saju.py` 101·114행 라우트와 `frontend/composables/useSajuApi.ts` 확인 후 일치시킬 것) |
| 7 | `IlJinCalendar.vue` | `IlJinCalendar.tsx`(클라) — 월 달력 + 일진 간지·길흉 | `GET /api/saju/il-jin` (동일하게 라우터 확인) |
| 8 | `HapChungPanel.vue` | `HapChungPanel.tsx` — 삼합/육합/충/형/파/해 관계 카드 | `branch_relations` |
| 9 | `WuxingFeatureTable.vue` | `WuxingFeatureTable.tsx` — 오행 특성 참고표 (접이식, 정적 데이터는 레거시에서 추출) | 정적 |
| 10 | — | `result/page.tsx` 조립 + 전체 검증 | — |

---

## 공통 이식 규칙 (전 태스크)

1. **레거시 파일을 먼저 읽고** 데이터 가공 로직(퍼센트 계산·판정·달력 생성 등)은 보존, **표현만** 캔디 브루탈로 재설계
2. 색: `lib/ohaeng.ts`(`ohaengColor`/`ohaengTintColor`)와 `@sajuguri/design` 토큰만. 점수/판정 색 의미: 피크·과다=오렌지, 중간=옐로, 저점·부족=틸 (design.md §2.3)
3. 카드 래퍼는 `components/ui/BrutalCard.tsx`, 칩은 `components/ui/Chip.tsx` 재사용
4. **이모지 금지**, 그라데이션 금지, 모바일 640px 단일 컬럼 안에서 가로 스크롤 허용(타임라인류)
5. i18n: 모든 신규 UI 문자열은 `messages/ko.json`+`en.json`의 `manse.charts.*`에 ko/en 동시 추가. 단 간지·오행·십성·신살 등 **명리 용어는 한글 그대로** (영문 글로서리 확정 전 — AGENTS.md G7)
6. 데이터 가공 함수(퍼센트·판정·달력 계산)는 컴포넌트에 인라인하지 말고 `apps/web/lib/manse/*.ts`로 분리 + **vitest 테스트** (`lib/**/*.test.ts` 글롭에 잡히게)
7. 태스크당 커밋 1개: `feat: <카드명> 이식` 형식, Co-Authored-By 금지, scope 괄호 금지
8. 검증: 태스크마다 `pnpm --filter web build` + 백엔드 가동 시 `curl /manse/result?...`로 해당 섹션 텍스트 grep. 백엔드 없으면 빌드까지

## 페이지 조립 순서 (Task 10 — spec §4.5)

일주 히어로 → 태그 칩 → 기둥 카드(기존) → **DetailAccordion** → **WuxingBalanceCard** → **TenGodsCard** → **StrengthCard** → **DaeUnTimeline** → **YeonWolUn** → **IlJinCalendar** → **HapChungPanel** → **WuxingFeatureTable**(접이식) → CTA([AI 리포트 생성]·[상담하기] — 라우트 미존재 시 비활성 스타일)

기존 `chartsComing` 안내 문구는 Task 10에서 제거.

## 예시 — Task 2 `WuxingBalanceCard`의 바 부분 (스타일 기준점)

```tsx
function ElementBar({ name, pct, verdict }: { name: string; pct: number; verdict: '과다' | '부족' | '적정' }) {
  const color = ohaengColor(name)
  const chip = verdict === '과다' ? 'bg-orange-tint text-[#B34800]'
    : verdict === '부족' ? 'bg-teal-tint text-[#00665F]' : 'bg-[#F3EDDD] text-text-sub'
  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <span className="w-5 font-black" style={{ color }}>{name}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F3EDDD]">
        <i className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-12 text-right text-xs font-bold text-text-sub">{pct}%</span>
      <span className={`w-10 rounded-md py-0.5 text-center text-[10px] font-extrabold ${chip}`}>{verdict}</span>
    </div>
  )
}
```

판정 로직(`과다/부족/적정`)은 레거시 `WuxingBalanceTable.vue`의 기준을 그대로 가져와 `lib/manse/wuxing.ts`에 테스트와 함께 둘 것.

## 완료 기준

- [ ] 레거시 분석 컴포넌트 중 분석 화면 소관 전부가 대응 신규 컴포넌트로 존재 (스킵: InputForm=이식 완료, ProfileList=1b, DailyResultPanel=Phase 3, Table 상단부=기둥 카드로 대체 완료)
- [ ] `pnpm build && pnpm test && pnpm typecheck` 그린
- [ ] 백엔드 E2E: 분석 화면에 12개 섹션 렌더
