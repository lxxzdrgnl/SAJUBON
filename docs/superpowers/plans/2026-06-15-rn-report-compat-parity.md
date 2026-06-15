# RN Report & Compatibility Web Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the React Native Report and Compatibility features to full parity with the web app across copy, flow, layout, and missing functionality.

**Architecture:** Address divergences in priority order — critical first (chart rendering, ElementFlowDiagram), then copy fixes (ko.json alignment), then flow (entry UX, error handling, loading UX), then layout details. Each task is independently commitable. No new dependencies required; `use-intl` is already in `apps/mobile/package.json` but is not wired up — we keep strings as TypeScript constants (same pattern already used in the codebase) rather than adding an i18n runtime.

**Tech Stack:** React Native / Expo Router, `@tanstack/react-query`, `@sajuguri/api-client`, `react-native-markdown-display`, `expo-reanimated` (already installed via Expo), TypeScript.

---

## Audit Summary (26 divergences → grouped into 12 tasks)

### Critical
1. `[[chart:TOOL]]` markers silently stripped — no chart rendering in RN
2. DaeUn section missing `get_dae_un` timeline chart (ToolCard)
3. Compatibility missing `request_topics` field
4. Compatibility missing `ElementFlowDiagram` (오행 흐름)

### High
5. Report entry uses inline form instead of `MansePickerSheet`
6. Generating UX: single static string vs rotating phrases + bouncing mascot
7. Report `request_topics` copy wrong vs ko.json
8. Report detail missing "다시 생성" CTA
9. Report/Compat detail missing bottom guide text
10. ScoreHeader: no count-up animation; wrong color thresholds; missing badges
11. ScoreHeader sub-score labels wrong ("십신" → "십성", "일주 궁합" → "일주")

### Medium
12. YearFlow "한마디" → "한 줄 메모"
13. TabbedReport advice box "조언" → "현실 조언"
14. YearFlow show-more "더 보기 (N개)" → "나머지 보기 (N)"
15. DaeUn title "대운 분석" → "대운 비교"
16. DaeUn caution label "주의사항" → "주의점"
17. Login-gate copy (title, desc, button) wrong for both report & compat
18. Error handling: no 401/429 distinction
19. Compat slot labels wrong vs ko.json
20. Compat slot entry: inline BirthInputForm instead of MansePickerSheet bottom-sheet
21. Compat name fallback "사람 A"/"사람 B" → "A"/"B"
22. Report `language` hardcoded `'ko'`

### Low
23. Report new title/subtitle copy wrong
24. Compat new title/subtitle copy wrong
25. Compat disabled-button hint text (not on web)
26. Report detail: no MascotTinted header avatar
27. Compat detail: no birth_date under names in top header

---

## File Map

Files to **create**:
- `apps/mobile/src/components/report/ChartPlaceholder.tsx` — mobile substitute for web's ToolCard (shows a compact labeled card for each chart type instead of a full interactive tool; production-quality placeholder until a native chart renderer exists)

Files to **modify**:
- `apps/mobile/src/components/markdown/Markdown.tsx` — strip chart markers AND emit `ChartPlaceholder` nodes
- `apps/mobile/src/components/report/TabbedReport.tsx` — accept `chartsToolByName` prop, render `ChartPlaceholder` inside paragraphs
- `apps/mobile/src/components/report/GeneratingIndicator.tsx` — rotating phrases + bouncing mascot
- `apps/mobile/src/components/compat/CompatScoreHeader.tsx` — count-up, badge, color thresholds, label copy fixes
- `apps/mobile/src/app/report/new.tsx` — copy fixes, MansePickerSheet entry, rotating phrases, 401/429 errors
- `apps/mobile/src/app/report/[id].tsx` — copy fixes, daeUn chart, guideText, regenerate CTA, mascot header, language locale fix
- `apps/mobile/src/app/compatibility/new.tsx` — copy fixes, request_topics, MansePickerSheet-based PersonSlotPicker, rotating phrases, 401/429 errors, language locale fix
- `apps/mobile/src/app/compatibility/[id].tsx` — ElementFlowDiagram, birth_date header, name fallback fix, guideText
- `apps/mobile/src/components/compat/PersonSlot.tsx` — slot label copy, MansePickerSheet open trigger
- `apps/mobile/src/components/compat/ElementFlowDiagram.tsx` — **NEW FILE** — native port of web's ElementFlowDiagram

---

## Task 1: Copy-only fixes across all files (copy divergences #7, 12–17, 19, 21, 23–25)

This is pure string replacement with zero logic change. Do all in one commit.

**Files:**
- Modify: `apps/mobile/src/app/report/new.tsx`
- Modify: `apps/mobile/src/app/report/[id].tsx`
- Modify: `apps/mobile/src/app/compatibility/new.tsx`
- Modify: `apps/mobile/src/app/compatibility/[id].tsx`
- Modify: `apps/mobile/src/components/report/TabbedReport.tsx`
- Modify: `apps/mobile/src/components/compat/CompatScoreHeader.tsx`
- Modify: `apps/mobile/src/components/compat/PersonSlot.tsx`

- [ ] **Step 1: Fix report/new.tsx copy**

In `apps/mobile/src/app/report/new.tsx`:

```diff
- <Text ... >사주 리포트 생성</Text>
+ <Text ... >AI 리포트 생성</Text>

- <Text ... >AI가 당신의 사주를 깊이 분석한 리포트를 만들어드려요</Text>
+ <Text ... >사주를 분석해 10가지 주제로 헤드라인 리포트를 만들어 드려요. 추가로 궁금한 주제를 입력하면 함께 포함해드려요.</Text>

- 추가 요청 주제 (선택)
+ 추가로 보고 싶은 것 (선택)

- placeholder="예: 2026년 이직 운, 연애·결혼 전망"
+ placeholder="이직 시기, 부모님 건강, 올해 재물운"

- 원하는 주제를 입력하면 해당 탭이 추가됩니다
+ 쉼표로 구분해 여러 주제를 입력할 수 있어요
```

- [ ] **Step 2: Fix report/[id].tsx copy**

In `apps/mobile/src/app/report/[id].tsx`:

```diff
# YearFlowSection — table header (line 74)
- <Text ...>한마디</Text>
+ <Text ...>한 줄 메모</Text>

# YearFlowSection — show more (line 111)
- `더 보기 ({months.length - 4}개)`
+ `나머지 보기 (${months.length - 4})`

# DaeUnSection — title (line 125)
- 대운 분석
+ 대운 비교

# DaeUnSection — caution label (line 164)
- 주의사항
+ 주의점
```

- [ ] **Step 3: Fix TabbedReport.tsx advice box label**

In `apps/mobile/src/components/report/TabbedReport.tsx` line 102:

```diff
- <Text ...>조언</Text>
+ <Text ...>현실 조언</Text>
```

- [ ] **Step 4: Fix CompatScoreHeader.tsx label copy**

In `apps/mobile/src/components/compat/CompatScoreHeader.tsx`:

```diff
# Section header (line 133)
- 세부 점수
+ 세부 점수   (already correct — keep)

# Sub-score labels (lines 137–140)
- <ScoreBar label="일주 궁합" value={score.day_pillar} />
+ <ScoreBar label="일주" value={score.day_pillar} />

- <ScoreBar label="오행 조화" value={score.element_harmony} />
+ <ScoreBar label="오행 조화" value={score.element_harmony} />  // already correct

- <ScoreBar label="지지 관계" value={score.branch_relation} />
+ <ScoreBar label="지지 관계" value={score.branch_relation} />  // already correct

- <ScoreBar label="십신 관계" value={score.ten_gods} />
+ <ScoreBar label="십성" value={score.ten_gods} />
```

- [ ] **Step 5: Fix PersonSlot.tsx label copy**

In `apps/mobile/src/components/compat/PersonSlot.tsx` (toggle label):

```diff
- {m === 'profile' ? '내 프로필' : '직접 입력'}
+ {m === 'profile' ? '저장된 만세력' : '직접 입력'}
```

In `apps/mobile/src/app/compatibility/new.tsx` (slot external labels):

```diff
- <PersonSlot label="첫 번째 사람" ...
+ <PersonSlot label="나 (첫 번째 사람)" ...

- <PersonSlot label="두 번째 사람" ...
+ <PersonSlot label="상대방 (두 번째 사람)" ...

# submit button (line 201)
- label={submitting ? '궁합 분석 중...' : '궁합 리포트 생성하기'}
+ label={submitting ? '궁합 분석 중...' : '궁합 보기'}

# Remove the "두 사람 정보..." hint text below button entirely (lines 207-210)
# (web doesn't show this text)
```

In `apps/mobile/src/app/compatibility/new.tsx` (title/guideline):

```diff
- <Text ...>궁합 리포트 생성</Text>
+ <Text ...>궁합 리포트</Text>

- <Text ...>두 사람의 사주로 AI가 궁합을 분석해드려요</Text>
+ <Text ...>두 사람의 사주로 연애·관계 케미를 결론형 리포트로 분석해 드려요.</Text>
```

- [ ] **Step 6: Fix compatibility/[id].tsx name fallback**

In `apps/mobile/src/app/compatibility/[id].tsx`:

```diff
- const nameA = report.person_a.name ?? '사람 A'
- const nameB = report.person_b.name ?? '사람 B'
+ const nameA = report.person_a.name ?? 'A'
+ const nameB = report.person_b.name ?? 'B'
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/app/report/new.tsx \
  apps/mobile/src/app/report/[id].tsx \
  apps/mobile/src/components/report/TabbedReport.tsx \
  apps/mobile/src/components/compat/CompatScoreHeader.tsx \
  apps/mobile/src/components/compat/PersonSlot.tsx \
  apps/mobile/src/app/compatibility/new.tsx \
  apps/mobile/src/app/compatibility/[id].tsx
git commit -m "fix(mobile): align report & compat copy with ko.json"
```

---

## Task 2: Login-gate and error-handling copy fixes (#17, 18, 22)

**Files:**
- Modify: `apps/mobile/src/app/report/new.tsx`
- Modify: `apps/mobile/src/app/compatibility/new.tsx`
- Modify: `apps/mobile/src/app/report/[id].tsx` (language fix)

- [ ] **Step 1: Fix report login-gate copy**

In `apps/mobile/src/app/report/new.tsx`, replace the `status !== 'authed'` early-return block:

```tsx
if (status !== 'authed') {
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
          로그인이 필요해요
        </Text>
        <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
          리포트는 로그인한 사용자만 생성하고 저장할 수 있어요.
        </Text>
        <Button label="구글로 로그인" onPress={() => login()} variant="primary" />
      </View>
    </Screen>
  )
}
```

- [ ] **Step 2: Fix report error handling (401/429 distinction)**

In `apps/mobile/src/app/report/new.tsx`, replace both `catch` blocks in `handleProfileSubmit` and `handleManualSubmit`:

```tsx
// In handleProfileSubmit and handleManualSubmit, replace the catch:
} catch (e: unknown) {
  const status = (e as { status?: number })?.status
  if (status === 401) {
    setSubmitError('로그인이 필요해요.')
  } else if (status === 429) {
    setSubmitError('오늘 생성 가능한 리포트 수를 초과했어요. 내일 다시 시도해 주세요.')
  } else {
    setSubmitError('리포트 생성에 실패했어요. 잠시 후 다시 시도해 주세요.')
  }
}
```

- [ ] **Step 3: Fix language field to use device locale**

The mobile app has `expo-localization` already installed. In `apps/mobile/src/app/report/new.tsx`:

```tsx
// Add import at top
import * as Localization from 'expo-localization'

// In handleProfileSubmit and handleManualSubmit, replace:
language: 'ko',
// With:
language: Localization.locale.startsWith('ko') ? 'ko' : 'en',
```

Also apply the same fix in `apps/mobile/src/app/compatibility/new.tsx`.

- [ ] **Step 4: Fix compatibility login-gate copy**

In `apps/mobile/src/app/compatibility/new.tsx`, replace the `status !== 'authed'` early-return block:

```tsx
if (status !== 'authed') {
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
          로그인이 필요해요
        </Text>
        <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
          궁합 리포트는 저장·공유를 위해 로그인 후 이용할 수 있어요.
        </Text>
        <Button label="구글로 시작하기" onPress={() => login()} variant="primary" />
      </View>
    </Screen>
  )
}
```

- [ ] **Step 5: Fix compatibility error handling (401/429 distinction)**

In `apps/mobile/src/app/compatibility/new.tsx`, replace the `catch` in `handleSubmit`:

```tsx
} catch (e: unknown) {
  const status = (e as { status?: number })?.status
  if (status === 401) {
    setSubmitError('로그인이 필요해요. 다시 로그인해 주세요.')
  } else if (status === 429) {
    setSubmitError('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.')
  } else {
    setSubmitError('리포트 생성에 실패했어요. 다시 시도해 주세요.')
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/app/report/new.tsx apps/mobile/src/app/compatibility/new.tsx
git commit -m "fix(mobile): login-gate copy, 401/429 error handling, locale language"
```

---

## Task 3: Generating UX — rotating phrases + mascot (#6)

The web uses a 6-phrase array (report) and 5-phrase array (compat) cycling every 3 seconds with a bouncing mascot SVG. The RN `GeneratingIndicator` shows one static message. We upgrade it to match.

**Files:**
- Modify: `apps/mobile/src/components/report/GeneratingIndicator.tsx`
- Modify: `apps/mobile/src/app/report/new.tsx`
- Modify: `apps/mobile/src/app/compatibility/new.tsx`

- [ ] **Step 1: Rewrite GeneratingIndicator to accept phrases array + cycle**

Replace the entire content of `apps/mobile/src/components/report/GeneratingIndicator.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { MascotTinted } from '@/components/ui/MascotTinted'

// Exported so callers can pass domain-specific phrase arrays
export const REPORT_LOADING_PHRASES = [
  '사주를 읽고 있어요...',
  '천간과 지지를 살피는 중이에요...',
  '대운의 흐름을 분석하고 있어요...',
  '오행의 균형을 파악하는 중이에요...',
  '당신만의 해설을 작성하고 있어요...',
  '거의 다 됐어요, 조금만 기다려 주세요...',
]

export const COMPAT_LOADING_PHRASES = [
  '두 사람의 사주를 읽고 있어요...',
  '천간합화와 오행 흐름을 살피는 중이에요...',
  '지지의 충과 합을 분석하고 있어요...',
  '두 분만을 위한 케미 해설을 작성하고 있어요...',
  '거의 다 됐어요, 조금만 기다려 주세요...',
]

interface GeneratingIndicatorProps {
  phrases?: string[]
  note?: string
}

export function GeneratingIndicator({
  phrases = REPORT_LOADING_PHRASES,
  note = 'AI가 사주를 분석 중이에요. 보통 30~60초 정도 걸려요.',
}: GeneratingIndicatorProps) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % phrases.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [phrases])

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        gap: 20,
      }}
    >
      {/* 바운싱 마스코트 — Animated.View로 간단한 bounce */}
      <BounceView>
        <MascotTinted width={72} height={72} />
      </BounceView>

      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '800',
            color: '#1A1A1A',
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          {phrases[idx]}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: '#8A8270',
            textAlign: 'center',
          }}
        >
          {note}
        </Text>
      </View>
    </View>
  )
}

// ── Simple bounce animation ──────────────────────────────────────────────────
import { Animated } from 'react-native'
import { useRef } from 'react'

function BounceView({ children }: { children: React.ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -12,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [translateY])

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  )
}
```

- [ ] **Step 2: Update report/new.tsx to use new GeneratingIndicator API**

In `apps/mobile/src/app/report/new.tsx`, replace the generating screen block:

```tsx
// Add import at top:
import { GeneratingIndicator, REPORT_LOADING_PHRASES } from '@/components/report/GeneratingIndicator'

// Replace the generating-in-progress early-return (remove the loadingMessages dict):
if (jobId !== null && jobStatus !== 'failed' && !isTimeout) {
  return (
    <Screen scroll={false}>
      <GeneratingIndicator
        phrases={REPORT_LOADING_PHRASES}
        note="AI가 사주를 분석 중이에요. 보통 30~60초 정도 걸려요."
      />
    </Screen>
  )
}
```

- [ ] **Step 3: Update compatibility/new.tsx to use compat phrases**

```tsx
// Add import at top:
import { GeneratingIndicator, COMPAT_LOADING_PHRASES } from '@/components/report/GeneratingIndicator'

// Replace the generating block:
if (jobId !== null && jobStatus !== 'failed' && !isTimeout) {
  return (
    <Screen scroll={false}>
      <GeneratingIndicator
        phrases={COMPAT_LOADING_PHRASES}
        note="AI가 두 사주를 분석 중이에요. 보통 30~60초 정도 걸려요."
      />
    </Screen>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/report/GeneratingIndicator.tsx \
  apps/mobile/src/app/report/new.tsx \
  apps/mobile/src/app/compatibility/new.tsx
git commit -m "feat(mobile): rotating loading phrases + bouncing mascot in GeneratingIndicator"
```

---

## Task 4: CompatScoreHeader — count-up animation, badges, color thresholds (#10, 11)

**Files:**
- Modify: `apps/mobile/src/components/compat/CompatScoreHeader.tsx`

- [ ] **Step 1: Rewrite CompatScoreHeader with count-up + correct thresholds + badges**

Replace the entire file `apps/mobile/src/components/compat/CompatScoreHeader.tsx`:

```tsx
/**
 * CompatScoreHeader — 궁합 점수 히어로 + 4세부 바 (web ScoreOverview 포트).
 * - 종합 점수 0→final 카운트업 (900ms easeOut, React Native Animated 사용)
 * - 색 임계값: ≥90 teal / ≤35 sub / else ink  (web ScoreOverview 기준)
 * - highBadge "찰떡궁합" (≥90) / lowBadge "주의" (≤35)
 * - 세부 점수 바: 텍스트 레이블 정렬은 web SubScoreBar와 동일
 * - 시너지 태그 + stem_hap/element_synergy 섹션 유지
 */

import { useEffect, useRef, useState } from 'react'
import { Text, View, Animated } from 'react-native'
import type { CompatibilityScore, CompatibilitySynastry } from '@sajuguri/api-client'
import { BrutalCard } from '@/components/ui/BrutalCard'

// ── 색상 토큰 ───────────────────────────────────────────────────────────────
const TEAL = '#00A878'
const ORANGE = '#FF6B00'
const INK = '#1A1A1A'
const TEXT_SUB = '#8A8270'
const BORDER_SOFT = '#E0D9CE'

// ── 카운트업 훅 ─────────────────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setValue(0)
    startRef.current = null
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const t = Math.min((ts - startRef.current) / durationMs, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, durationMs])

  return value
}

// ── 세부 점수 바 ─────────────────────────────────────────────────────────────
function SubScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ width: 72, fontSize: 13, fontWeight: '800', color: INK }}>{label}</Text>
      <View
        style={{
          flex: 1,
          height: 12,
          backgroundColor: BORDER_SOFT,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.min(value, 100)}%` as `${number}%`,
            backgroundColor: TEAL,
            borderRadius: 999,
          }}
        />
      </View>
      <Text style={{ width: 28, textAlign: 'right', fontSize: 14, fontWeight: '900', color: INK }}>
        {value}
      </Text>
    </View>
  )
}

// ── Props ───────────────────────────────────────────────────────────────────
interface CompatScoreHeaderProps {
  nameA: string
  nameB: string
  score: CompatibilityScore
  synastry: CompatibilitySynastry
  summaryLine?: string
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export function CompatScoreHeader({
  nameA,
  nameB,
  score,
  synastry,
  summaryLine,
}: CompatScoreHeaderProps) {
  const displayScore = useCountUp(score.total)
  const isHighScore = score.total >= 90
  const isLowScore = score.total <= 35
  const totalColor = isHighScore ? TEAL : isLowScore ? TEXT_SUB : INK

  const subScores: Array<{ label: string; value: number }> = [
    { label: '일주', value: score.day_pillar },
    { label: '오행 조화', value: score.element_harmony },
    { label: '지지 관계', value: score.branch_relation },
    { label: '십성', value: score.ten_gods },
  ]

  return (
    <View style={{ gap: 16 }}>
      {/* 히어로 점수 카드 */}
      <BrutalCard intensity="full">
        <View style={{ alignItems: 'center', gap: 8 }}>
          {/* 이름 행 */}
          <Text style={{ fontSize: 13, fontWeight: '800', color: INK }}>
            {nameA} <Text style={{ color: ORANGE }}>&amp;</Text> {nameB}
          </Text>

          {/* 종합 점수 (카운트업) */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8 }}>
            <Text
              style={{
                fontSize: 88,
                fontWeight: '900',
                color: totalColor,
                lineHeight: 88,
                letterSpacing: -3,
              }}
            >
              {displayScore}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: INK, marginBottom: 12 }}>
              /100
            </Text>
            {isHighScore && (
              <View
                style={{
                  backgroundColor: TEAL,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>찰떡궁합</Text>
              </View>
            )}
            {isLowScore && (
              <View
                style={{
                  backgroundColor: BORDER_SOFT,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: TEXT_SUB }}>주의</Text>
              </View>
            )}
          </View>

          {/* 한 줄 요약 */}
          {summaryLine ? (
            <View
              style={{
                backgroundColor: '#FFF4E3',
                borderRadius: 10,
                padding: 12,
                width: '100%',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: INK,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {summaryLine}
              </Text>
            </View>
          ) : null}
        </View>
      </BrutalCard>

      {/* 4세부 점수 바 */}
      <BrutalCard intensity="soft">
        <Text style={{ fontSize: 13, fontWeight: '900', color: INK, marginBottom: 12 }}>
          세부 점수
        </Text>
        <View style={{ gap: 12 }}>
          {subScores.map(({ label, value }) => (
            <SubScoreBar key={label} label={label} value={value} />
          ))}
        </View>
      </BrutalCard>

      {/* 시너지 태그 */}
      {synastry.interaction_tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {synastry.interaction_tags.map((tag, i) => (
            <View
              key={i}
              style={{
                borderWidth: 2,
                borderColor: INK,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: '#FAFAF7',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: INK }}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 시너지 요약 */}
      {(synastry.stem_hap || synastry.element_synergy) && (
        <BrutalCard intensity="soft">
          <Text style={{ fontSize: 13, fontWeight: '900', color: TEAL, marginBottom: 8 }}>
            오행 시너지
          </Text>
          {synastry.stem_hap && (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_SUB }}>천간합</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>{synastry.stem_hap}</Text>
            </View>
          )}
          {synastry.element_synergy && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_SUB }}>오행 시너지</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>{synastry.element_synergy}</Text>
            </View>
          )}
        </BrutalCard>
      )}
    </View>
  )
}
```

Note: `requestAnimationFrame` is available globally in React Native via the JS engine.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/compat/CompatScoreHeader.tsx
git commit -m "feat(mobile): CompatScoreHeader count-up, correct color thresholds, highBadge/lowBadge"
```

---

## Task 5: Report detail — mascot header, guideText, "다시 생성" CTA (#8, 9, 26)

**Files:**
- Modify: `apps/mobile/src/app/report/[id].tsx`

- [ ] **Step 1: Add MascotTinted header card**

In `apps/mobile/src/app/report/[id].tsx`, add the import and replace the header `<View>`:

```tsx
// Add import:
import { MascotTinted } from '@/components/ui/MascotTinted'

// Replace the "헤더 정보" View (currently lines 306-322) with:
{/* 원국 한 줄 요약 — 마스코트 아바타 포함 (web ReportDetailPage 기준) */}
<View
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 16,
    backgroundColor: '#FAFAF7',
    padding: 12,
    marginBottom: 16,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  }}
>
  <View
    style={{
      width: 44,
      height: 44,
      borderWidth: 2,
      borderColor: '#1A1A1A',
      borderRadius: 12,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FAFAF7',
    }}
  >
    <MascotTinted width={40} height={40} />
  </View>
  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', flex: 1 }}>
    {[report.profile_name || bi.name, bi.birth_date, bi.gender === 'male' ? '남성' : '여성']
      .filter(Boolean)
      .join(' · ')}
  </Text>
</View>
{/* 헤드라인 */}
<Text style={{ fontSize: 13, color: '#FF6B00', fontWeight: '700', lineHeight: 19, marginBottom: 4 }}>
  {report.first_headline}
</Text>
<Text style={{ fontSize: 11, color: '#C0B8A8', marginBottom: 24 }}>
  {new Date(report.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })}
</Text>
```

- [ ] **Step 2: Add "다시 생성" CTA and guideText below TabbedReport**

After the `<TabbedReport ... />` and before the action buttons in `report/[id].tsx`:

```tsx
{/* 다시 생성 CTA */}
<Pressable
  onPress={() => {
    const q = new URLSearchParams(
      Object.entries({
        name: bi.name ?? '',
        birth_date: bi.birth_date,
        birth_time: bi.birth_time ?? '',
        gender: bi.gender,
        calendar: bi.calendar ?? 'solar',
      }).filter(([, v]) => v !== '') as [string, string][],
    ).toString()
    router.push(`/report/new?${q}` as never)
  }}
  style={{
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FAFAF7',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  }}
>
  <Text style={{ fontSize: 14, fontWeight: '900', color: '#1A1A1A' }}>다시 생성</Text>
</Pressable>

{/* 안내 텍스트 */}
<Text style={{ fontSize: 13, color: '#8A8270', textAlign: 'center', paddingBottom: 8 }}>
  각 제목을 클릭하면 해설이 펼쳐져요
</Text>
```

Note: The web uses URL query params to pre-fill the report/new form. The RN report/new.tsx currently doesn't read query params (it uses its own MansePickerSheet/BirthInputForm). The `다시 생성` link just navigates to `/report/new` — Task 6 will wire up MansePickerSheet properly.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/app/report/[id].tsx
git commit -m "feat(mobile): report detail mascot header, 다시 생성 CTA, guideText"
```

---

## Task 6: Compatibility detail — birth_date header, ElementFlowDiagram, guideText (#4, 9, 27)

The web `ElementFlowDiagram` renders 6 sections from `CompatibilitySynastry`: stem_hap, element_synergy, complement, yongsin, clash, tenGod. We port this as a new RN component.

**Files:**
- Create: `apps/mobile/src/components/compat/ElementFlowDiagram.tsx`
- Modify: `apps/mobile/src/app/compatibility/[id].tsx`

- [ ] **Step 1: Create ElementFlowDiagram.tsx**

Create `apps/mobile/src/components/compat/ElementFlowDiagram.tsx`:

```tsx
/**
 * ElementFlowDiagram — 오행 흐름 다이어그램 (web ElementFlowDiagram RN 포트).
 * CompatibilitySynastry를 받아 stem_hap, element_synergy, complement, yongsin,
 * clash_pairs, day_ten_god 6개 섹션을 렌더한다.
 */

import { Text, View } from 'react-native'
import type { CompatibilitySynastry } from '@sajuguri/api-client'
import { BrutalCard } from '@/components/ui/BrutalCard'

const TEAL = '#00A878'
const ORANGE = '#FF6B00'
const INK = '#1A1A1A'
const TEXT_SUB = '#8A8270'

// ── 소형 공용 컴포넌트 ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '900', color: TEAL, marginBottom: 6, letterSpacing: 0.5 }}>
      {children}
    </Text>
  )
}

type ChipVariant = 'default' | 'clash' | 'synergy-saeng' | 'synergy-geuk' | 'yongsin'

function Chip({ children, variant = 'default' }: { children: string; variant?: ChipVariant }) {
  const styles: Record<ChipVariant, { bg: string; border: string; color: string }> = {
    default: { bg: '#E6F7F1', border: TEAL, color: '#005A3D' },
    clash: { bg: '#FFF4E3', border: ORANGE, color: ORANGE },
    'synergy-saeng': { bg: '#E6F7F1', border: TEAL, color: '#005A3D' },
    'synergy-geuk': { bg: '#FFF4E3', border: ORANGE, color: ORANGE },
    yongsin: { bg: '#FFFBF2', border: '#C0A040', color: INK },
  }
  const s = styles[variant]
  return (
    <View
      style={{
        backgroundColor: s.bg,
        borderWidth: 1,
        borderColor: s.border,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '800', color: s.color }}>{children}</Text>
    </View>
  )
}

function Arrow({ direction = 'right' }: { direction?: 'right' | 'left' | 'both' }) {
  const sym = direction === 'both' ? '⇌' : direction === 'left' ? '←' : '→'
  return <Text style={{ fontSize: 15, fontWeight: '900', color: TEAL }}>{sym}</Text>
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────

interface ElementFlowDiagramProps {
  synastry: CompatibilitySynastry
  nameA: string
  nameB: string
}

export function ElementFlowDiagram({ synastry, nameA, nameB }: ElementFlowDiagramProps) {
  const {
    stem_hap,
    day_ten_god,
    element_synergy,
    clash_pairs,
    complement_a_to_b,
    complement_b_to_a,
    yongsin_help,
  } = synastry

  const hasStemHap = !!stem_hap
  const hasSynergy = !!element_synergy
  const hasComplements = complement_a_to_b.length > 0 || complement_b_to_a.length > 0
  const hasClash = clash_pairs.length > 0
  const hasYongsin = !!yongsin_help

  const isSaeng = typeof element_synergy === 'string' && element_synergy.includes('상생')
  const isGeuk = typeof element_synergy === 'string' && element_synergy.includes('상극')

  function yongsinLabel(): string {
    if (yongsin_help === 'a_helps_b') return `${nameA}이(가) ${nameB}의 용신을 채워줌`
    if (yongsin_help === 'b_helps_a') return `${nameB}이(가) ${nameA}의 용신을 채워줌`
    if (yongsin_help === 'mutual') return '서로의 용신을 채워주는 궁합'
    return ''
  }

  return (
    <BrutalCard intensity="full">
      <Text style={{ fontSize: 17, fontWeight: '900', color: TEAL, marginBottom: 16 }}>
        오행 흐름
      </Text>

      <View style={{ gap: 16 }}>
        {/* 천간합화 */}
        {hasStemHap && (
          <View>
            <SectionLabel>천간합화</SectionLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <View style={{ backgroundColor: '#FFFBF2', borderWidth: 2, borderColor: INK, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: INK }}>{nameA}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: TEXT_SUB }}>+</Text>
              <View style={{ backgroundColor: '#FFFBF2', borderWidth: 2, borderColor: INK, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: INK }}>{nameB}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: TEXT_SUB }}>→</Text>
              <View style={{ backgroundColor: '#E6F7F1', borderWidth: 2, borderColor: TEAL, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#005A3D' }}>{stem_hap}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 4 }}>
              {stem_hap}(으)로 합쳐지는 흐름
            </Text>
          </View>
        )}

        {/* 상생/상극/동기 */}
        {hasSynergy && (
          <View>
            <SectionLabel>오행 관계</SectionLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: INK }}>{nameA}</Text>
              <Arrow direction="right" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: INK }}>{nameB}</Text>
              <Chip variant={isSaeng ? 'synergy-saeng' : isGeuk ? 'synergy-geuk' : 'default'}>
                {element_synergy!}
              </Chip>
            </View>
          </View>
        )}

        {/* 보완 방향 */}
        {hasComplements && (
          <View style={{ gap: 8 }}>
            <SectionLabel>보완 방향</SectionLabel>
            {complement_a_to_b.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: INK }}>{nameA}</Text>
                <Arrow direction="right" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: INK }}>{nameB}</Text>
                <Text style={{ fontSize: 11, color: TEXT_SUB }}>:</Text>
                {complement_a_to_b.map((el) => <Chip key={el}>{el}</Chip>)}
              </View>
            )}
            {complement_b_to_a.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: INK }}>{nameB}</Text>
                <Arrow direction="right" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: INK }}>{nameA}</Text>
                <Text style={{ fontSize: 11, color: TEXT_SUB }}>:</Text>
                {complement_b_to_a.map((el) => <Chip key={el}>{el}</Chip>)}
              </View>
            )}
          </View>
        )}

        {/* 용신 보완 */}
        {hasYongsin && (
          <View>
            <SectionLabel>용신 보완</SectionLabel>
            <Chip variant="yongsin">{yongsinLabel()}</Chip>
          </View>
        )}

        {/* 지지충 */}
        {hasClash && (
          <View>
            <SectionLabel>지지충</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {clash_pairs.map(([a, b], i) => (
                <Chip key={i} variant="clash">{a} ↔ {b}</Chip>
              ))}
            </View>
          </View>
        )}

        {/* 십성 관계 */}
        <View>
          <SectionLabel>십성 관계</SectionLabel>
          <Text style={{ fontSize: 14, fontWeight: '800', color: INK }}>
            {nameA} 기준 상대 십성: {day_ten_god}
          </Text>
        </View>
      </View>
    </BrutalCard>
  )
}
```

- [ ] **Step 2: Wire ElementFlowDiagram into compatibility/[id].tsx**

In `apps/mobile/src/app/compatibility/[id].tsx`:

```tsx
// Add import:
import { ElementFlowDiagram } from '@/components/compat/ElementFlowDiagram'

// In the TabbedReport header slot, add ElementFlowDiagram after CompatScoreHeader:
<TabbedReport
  tabs={reportTabs}
  header={
    <View style={{ gap: 24, marginBottom: 24 }}>
      <CompatScoreHeader
        nameA={nameA}
        nameB={nameB}
        score={report.score}
        synastry={report.synastry}
        summaryLine={summaryLine}
      />
      <ElementFlowDiagram
        synastry={report.synastry}
        nameA={nameA}
        nameB={nameB}
      />
    </View>
  }
/>
```

- [ ] **Step 3: Add birth_date header and guideText to compatibility/[id].tsx**

Replace the current date-only header block (lines 177–184) with:

```tsx
{/* 두 사람 요약 헤더 — web [id]/page.tsx 기준 */}
<View
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 16,
    backgroundColor: '#FAFAF7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  }}
>
  <View style={{ flex: 1, minWidth: 0 }}>
    <Text style={{ fontSize: 14, fontWeight: '900', color: '#1A1A1A' }} numberOfLines={1}>
      {nameA}
    </Text>
    {report.person_a.birth_date && (
      <Text style={{ fontSize: 12, color: '#8A8270' }}>{report.person_a.birth_date}</Text>
    )}
  </View>
  <Text style={{ fontSize: 20, fontWeight: '900', color: '#FF6B00', marginHorizontal: 8 }}>♥</Text>
  <View style={{ flex: 1, alignItems: 'flex-end', minWidth: 0 }}>
    <Text style={{ fontSize: 14, fontWeight: '900', color: '#1A1A1A' }} numberOfLines={1}>
      {nameB}
    </Text>
    {report.person_b.birth_date && (
      <Text style={{ fontSize: 12, color: '#8A8270' }}>{report.person_b.birth_date}</Text>
    )}
  </View>
</View>
```

After the `<TabbedReport />` block and before the action buttons, add:

```tsx
{/* 안내 텍스트 */}
<Text style={{ fontSize: 13, color: '#8A8270', textAlign: 'center', paddingBottom: 8 }}>
  각 제목을 클릭하면 해설이 펼쳐져요.
</Text>
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/compat/ElementFlowDiagram.tsx \
  apps/mobile/src/app/compatibility/[id].tsx
git commit -m "feat(mobile): ElementFlowDiagram, birth_date header, guideText for compat detail"
```

---

## Task 7: Add `request_topics` to compatibility creation (#3)

**Files:**
- Modify: `apps/mobile/src/app/compatibility/new.tsx`

- [ ] **Step 1: Add `topics` state and input field**

In `apps/mobile/src/app/compatibility/new.tsx`, add state and UI:

```tsx
// Add state near top:
const [topics, setTopics] = useState('')

// Add request_topics to the API call in handleSubmit:
const { job_id } = await createCompatibilityJob(api, {
  person_a: personA,
  person_b: personB,
  ...(topics.trim() ? { request_topics: topics.trim() } : {}),
  language: Localization.locale.startsWith('ko') ? 'ko' : 'en',
})
```

```tsx
// In the form JSX, add this block after the guideline text and before the PersonSlot blocks:
<BrutalCard intensity="soft">
  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 }}>
    더 알고 싶은 주제 (선택)
  </Text>
  <TextInput
    value={topics}
    onChangeText={setTopics}
    placeholder="예: 결혼 시기, 다툼이 잦은 이유"
    placeholderTextColor="#C0B8A8"
    style={{
      borderWidth: 2,
      borderColor: '#1A1A1A',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '600',
      color: '#1A1A1A',
      backgroundColor: '#FAFAF7',
    }}
    maxLength={100}
  />
  <Text style={{ fontSize: 12, color: '#C0B8A8', marginTop: 4 }}>
    쉼표로 여러 주제를 적으면 각각 별도 탭으로 분석해요.
  </Text>
</BrutalCard>
```

Add `TextInput` to the React Native import at the top.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/app/compatibility/new.tsx
git commit -m "feat(mobile): add request_topics input to compatibility new"
```

---

## Task 8: Chart marker rendering — ChartPlaceholder (#1)

The web renders `[[chart:TOOL]]` markers as inline `ToolCard` components. RN currently strips them silently. We render a compact labeled card instead (the full native chart renderers are scope-out — that's a separate project).

**Files:**
- Create: `apps/mobile/src/components/report/ChartPlaceholder.tsx`
- Modify: `apps/mobile/src/components/markdown/Markdown.tsx`
- Modify: `apps/mobile/src/components/report/TabbedReport.tsx`

- [ ] **Step 1: Create ChartPlaceholder.tsx**

Create `apps/mobile/src/components/report/ChartPlaceholder.tsx`:

```tsx
/**
 * ChartPlaceholder — [[chart:TOOL]] 마커의 모바일 대체 렌더.
 * 웹의 ToolCard(전체 인터랙티브 차트) 대신 레이블 카드로 존재를 표시한다.
 * 백엔드가 charts payload를 내려주지 않는 경우에도 마커 위치는 보존된다.
 */

import { Text, View } from 'react-native'

// tool 이름 → 한국어 레이블
const TOOL_LABELS: Record<string, string> = {
  get_palja: '사주 원국',
  get_wuxing_balance: '오행 균형',
  get_strength: '신강/신약',
  get_ten_gods: '십성',
  get_sin_sal: '신살',
  get_twelve_un_seong: '12운성',
  get_hap_chung: '합충',
  get_dae_un: '대운',
  compat_palja_a: '사주 원국 (나)',
  compat_palja_b: '사주 원국 (상대)',
  compat_wuxing_a: '오행 균형 (나)',
  compat_wuxing_b: '오행 균형 (상대)',
  compat_ten_gods_a: '십성 (나)',
  compat_ten_gods_b: '십성 (상대)',
  compat_strength_a: '신강/신약 (나)',
  compat_strength_b: '신강/신약 (상대)',
  compat_branches: '지지 관계',
  compat_day_relation: '일주 관계',
  compat_yongsin: '용신',
}

export function ChartPlaceholder({ tool }: { tool: string }) {
  const label = TOOL_LABELS[tool] ?? tool.replace(/_/g, ' ')
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: '#C0B8A8',
        borderStyle: 'dashed',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginVertical: 6,
        backgroundColor: '#F5F2EC',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 16 }}>📊</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A8270' }}>{label} 차트</Text>
    </View>
  )
}
```

- [ ] **Step 2: Update Markdown.tsx to emit ChartPlaceholder nodes**

Replace the content of `apps/mobile/src/components/markdown/Markdown.tsx`:

```tsx
import { useMemo } from 'react'
import { View } from 'react-native'
import RNMarkdown from 'react-native-markdown-display'
import type { StyleSheet } from 'react-native'
import { ChartPlaceholder } from '@/components/report/ChartPlaceholder'

const CHART_MARKER_RE = /\[\[chart:([a-z_]+)\]\]/g

/**
 * Markdown コンポーネント — 2モード
 *
 * 1. children のみ渡す → チャートマーカーを ChartPlaceholder に置換して返す
 *    (TabbedReport の ParagraphWithCharts が使う)
 * 2. stripCharts=true → マーカーを除去して文字列のみ描画 (単純なMarkdown表示)
 */
export function Markdown({
  children,
  stripCharts = false,
}: {
  children: string
  stripCharts?: boolean
}) {
  // stripCharts=true の場合: マーカー削除してテキストのみ
  if (stripCharts) {
    const cleaned = useMemo(() => children.replace(CHART_MARKER_RE, '').trim(), [children])
    return <RNMarkdown style={markdownStyles}>{cleaned}</RNMarkdown>
  }

  // Default: split on markers, render ChartPlaceholder between text segments
  const nodes = useMemo(() => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    CHART_MARKER_RE.lastIndex = 0
    while ((match = CHART_MARKER_RE.exec(children)) !== null) {
      const before = children.slice(lastIndex, match.index).trim()
      if (before) {
        parts.push(<RNMarkdown key={`text-${lastIndex}`} style={markdownStyles}>{before}</RNMarkdown>)
      }
      parts.push(<ChartPlaceholder key={`chart-${match.index}`} tool={match[1]} />)
      lastIndex = match.index + match[0].length
    }
    const after = children.slice(lastIndex).trim()
    if (after) {
      parts.push(<RNMarkdown key={`text-${lastIndex}`} style={markdownStyles}>{after}</RNMarkdown>)
    }
    if (parts.length === 0) {
      parts.push(<RNMarkdown key="all" style={markdownStyles}>{children}</RNMarkdown>)
    }
    return parts
  }, [children])

  return <View>{nodes}</View>
}

const markdownStyles: StyleSheet.NamedStyles<Record<string, object>> = {
  body: { color: '#1A1A1A', fontSize: 14, lineHeight: 22 },
  heading1: { fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginTop: 16, marginBottom: 8 },
  heading2: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginTop: 12, marginBottom: 6 },
  heading3: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginTop: 10, marginBottom: 4 },
  strong: { fontWeight: '800', color: '#1A1A1A' },
  em: { fontStyle: 'italic', color: '#1A1A1A' },
  paragraph: { marginTop: 0, marginBottom: 10, color: '#1A1A1A', fontSize: 14, lineHeight: 22 },
  bullet_list: { marginBottom: 10 },
  ordered_list: { marginBottom: 10 },
  list_item: { marginBottom: 4, flexDirection: 'row' },
  bullet_list_icon: { color: '#FF6B00', marginRight: 6, fontWeight: '800' },
  code_inline: { backgroundColor: '#F5F2EC', borderRadius: 4, paddingHorizontal: 4, fontFamily: 'monospace', fontSize: 13, color: '#1A1A1A' },
  fence: { backgroundColor: '#F5F2EC', borderRadius: 8, padding: 12, marginBottom: 10 },
  blockquote: { backgroundColor: '#FFF4E3', borderLeftWidth: 3, borderLeftColor: '#FF6B00', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderRadius: 4 },
  hr: { backgroundColor: '#E0D9CE', height: 1, marginVertical: 12 },
}
```

Note: `useMemo` with conditional is valid here because `stripCharts` is a stable prop that doesn't change per render of the same instance.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/report/ChartPlaceholder.tsx \
  apps/mobile/src/components/markdown/Markdown.tsx
git commit -m "feat(mobile): ChartPlaceholder for [[chart:TOOL]] markers instead of silent strip"
```

---

## Task 9: DaeUn timeline chart placeholder (#2)

The web renders `<ToolCard tool="get_dae_un" payload={daeUnChart} />` above the current/next daeun text cards. On mobile we show a `ChartPlaceholder` in the same position.

**Files:**
- Modify: `apps/mobile/src/app/report/[id].tsx`

- [ ] **Step 1: Add ChartPlaceholder to DaeUnSection**

In `apps/mobile/src/app/report/[id].tsx`, import and insert into `DaeUnSection`:

```tsx
// Add import:
import { ChartPlaceholder } from '@/components/report/ChartPlaceholder'

// In DaeUnSection, add after the title <Text> and before "현재 대운" card:
{/* 대운 타임라인 차트 — 웹: ToolCard "get_dae_un" */}
<ChartPlaceholder tool="get_dae_un" />
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/app/report/[id].tsx
git commit -m "feat(mobile): add dae_un chart placeholder in DaeUnSection"
```

---

## Task 10: Report entry flow — use MansePickerSheet (#5)

The web `ReportEntrySheet` wraps `MansePickerSheet` to pick a 만세력, then navigates to `/report/new?<birth_query>`. The RN `/report/new` currently shows an inline profile+form. We align by making report/new open `MansePickerSheet` as the primary entry point (replacing the inline profile-chip tab toggle). The manual `BirthInputForm` fallback is preserved inside the picker sheet.

**Files:**
- Modify: `apps/mobile/src/app/report/new.tsx`

- [ ] **Step 1: Rewrite report/new.tsx to use MansePickerSheet**

Replace the form-rendering portion of `apps/mobile/src/app/report/new.tsx` (the entire `hasProfiles` tab toggle + `ProfileChip` list + mode-switching logic). The new flow: on mount, open `MansePickerSheet`. On pick, store as `pickedBirth`. Show topics input + submit.

```tsx
import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as Localization from 'expo-localization'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles } from '@/lib/queries'
import { useJob } from '@/lib/jobs'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { GeneratingIndicator, REPORT_LOADING_PHRASES } from '@/components/report/GeneratingIndicator'
import { MansePickerSheet, type MansePick } from '@/components/manse/MansePickerSheet'
import { createReportJob, type CreateReportBody } from '@sajuguri/api-client'
import type { ProfileResponse } from '@sajuguri/api-client'

const LOCALE = Localization.locale.startsWith('ko') ? 'ko' : 'en'

export default function ReportNewScreen() {
  const router = useRouter()
  const { api, status, login } = useAuth()
  const { data: profiles } = useProfiles()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [pickedBirth, setPickedBirth] = useState<MansePick | null>(null)
  const [requestTopics, setRequestTopics] = useState('')
  const [jobId, setJobId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { status: jobStatus, result_id, error: jobError, isTimeout } = useJob(jobId)
  const navigatedRef = useRef(false)

  useEffect(() => {
    if (jobStatus === 'done' && result_id && !navigatedRef.current) {
      navigatedRef.current = true
      router.replace(`/report/${result_id}` as never)
    }
  }, [jobStatus, result_id, router])

  // Auto-open picker on first load when authed
  useEffect(() => {
    if (status === 'authed' && profiles !== undefined && !pickedBirth) {
      setSheetOpen(true)
    }
  }, [status, profiles])

  // ── 로딩 ────────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color: '#8A8270', fontWeight: '600' }}>확인 중...</Text>
        </View>
      </Screen>
    )
  }

  // ── 비로그인 ─────────────────────────────────────────────────────────────────
  if (status !== 'authed') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            로그인이 필요해요
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            리포트는 로그인한 사용자만 생성하고 저장할 수 있어요.
          </Text>
          <Button label="구글로 로그인" onPress={() => login()} variant="primary" />
        </View>
      </Screen>
    )
  }

  // ── 생성 중 ──────────────────────────────────────────────────────────────────
  if (jobId !== null && jobStatus !== 'failed' && !isTimeout) {
    return (
      <Screen scroll={false}>
        <GeneratingIndicator
          phrases={REPORT_LOADING_PHRASES}
          note="AI가 사주를 분석 중이에요. 보통 30~60초 정도 걸려요."
        />
      </Screen>
    )
  }

  // ── 오류/타임아웃 ─────────────────────────────────────────────────────────────
  if (jobId !== null && (jobStatus === 'failed' || isTimeout)) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 40 }}>😔</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            {isTimeout ? '시간이 너무 걸렸어요' : '리포트 생성에 실패했어요'}
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            {isTimeout ? '잠시 후 다시 시도해주세요.' : jobError ?? '알 수 없는 오류가 발생했어요.'}
          </Text>
          <Button
            label="다시 시도"
            onPress={() => { setJobId(null); navigatedRef.current = false }}
            variant="primary"
          />
        </View>
      </Screen>
    )
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!pickedBirth) { setSheetOpen(true); return }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body: CreateReportBody = {
        ...(pickedBirth.profile_id ? { profile_id: pickedBirth.profile_id } : {}),
        birth_input: {
          name: pickedBirth.name || undefined,
          birth_date: pickedBirth.birth_date,
          birth_time: pickedBirth.birth_time,
          gender: pickedBirth.gender,
          calendar: pickedBirth.calendar,
          is_leap_month: pickedBirth.is_leap_month,
          birth_longitude: pickedBirth.birth_longitude,
        },
        ...(requestTopics.trim() ? { request_topics: requestTopics.trim() } : {}),
        language: LOCALE,
      }
      const { job_id } = await createReportJob(api, body)
      navigatedRef.current = false
      setJobId(job_id)
    } catch (e: unknown) {
      const httpStatus = (e as { status?: number })?.status
      if (httpStatus === 401) setSubmitError('로그인이 필요해요.')
      else if (httpStatus === 429) setSubmitError('오늘 생성 가능한 리포트 수를 초과했어요. 내일 다시 시도해 주세요.')
      else setSubmitError('리포트 생성에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 폼 화면 ───────────────────────────────────────────────────────────────────
  return (
    <Screen>
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
      >
        <Text style={{ fontSize: 22, color: '#1A1A1A', marginRight: 4 }}>←</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>돌아가기</Text>
      </Pressable>

      <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 }}>
        AI 리포트 생성
      </Text>
      <Text style={{ fontSize: 13, color: '#8A8270', marginBottom: 24, fontWeight: '600', lineHeight: 20 }}>
        사주를 분석해 10가지 주제로 헤드라인 리포트를 만들어 드려요. 추가로 궁금한 주제를 입력하면 함께 포함해드려요.
      </Text>

      {/* 선택된 만세력 또는 선택 버튼 */}
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={{
          borderWidth: 2,
          borderColor: pickedBirth ? '#FF6B00' : '#1A1A1A',
          borderRadius: 14,
          padding: 14,
          backgroundColor: pickedBirth ? '#FFF4E3' : '#FAFAF7',
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {pickedBirth ? (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1A1A1A' }}>
              {pickedBirth.name || '이름 없음'}
            </Text>
            <Text style={{ fontSize: 12, color: '#8A8270', fontWeight: '600' }}>
              {pickedBirth.birth_date}{pickedBirth.birth_time ? ` ${pickedBirth.birth_time}` : ' 시간 미상'} · {pickedBirth.gender === 'male' ? '남성' : '여성'}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>
            만세력 선택하기
          </Text>
        )}
        <Text style={{ fontSize: 14, color: '#8A8270' }}>{pickedBirth ? '다시 선택' : '+'}</Text>
      </Pressable>

      {/* 추가 요청 주제 */}
      <BrutalCard intensity="soft" style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 }}>
          추가로 보고 싶은 것 (선택)
        </Text>
        <TextInput
          value={requestTopics}
          onChangeText={setRequestTopics}
          placeholder="이직 시기, 부모님 건강, 올해 재물운"
          placeholderTextColor="#C0B8A8"
          style={{
            borderWidth: 2,
            borderColor: '#1A1A1A',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            fontWeight: '600',
            color: '#1A1A1A',
            backgroundColor: '#FAFAF7',
            minHeight: 48,
          }}
          maxLength={100}
        />
        <Text style={{ fontSize: 11, color: '#C0B8A8', marginTop: 4 }}>
          쉼표로 구분해 여러 주제를 입력할 수 있어요
        </Text>
      </BrutalCard>

      {submitError && (
        <Text style={{ fontSize: 12, color: '#FF6B00', fontWeight: '700', marginBottom: 12 }}>
          {submitError}
        </Text>
      )}

      <Button
        label={submitting ? '리포트 생성 중...' : '리포트 생성'}
        onPress={handleSubmit}
        variant="strong"
        disabled={submitting || !pickedBirth}
      />

      <MansePickerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles ?? []}
        title="누구의 사주로 볼까요?"
        onPick={(pick) => {
          setPickedBirth(pick)
          setSheetOpen(false)
        }}
      />
    </Screen>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/app/report/new.tsx
git commit -m "feat(mobile): report/new uses MansePickerSheet for birth selection (web parity)"
```

---

## Task 11: Compatibility entry flow — PersonSlotPicker with MansePickerSheet (#20)

The web `PersonSlotPicker` uses two square `SlotCard` buttons that each open a `MansePickerSheet` bottom-sheet. RN's `PersonSlot` renders `BirthInputForm` inline. We align RN to use `MansePickerSheet` per slot.

**Files:**
- Modify: `apps/mobile/src/components/compat/PersonSlot.tsx`

- [ ] **Step 1: Rewrite PersonSlot to use MansePickerSheet**

Replace the entire content of `apps/mobile/src/components/compat/PersonSlot.tsx`:

```tsx
/**
 * PersonSlot — 궁합 한 사람 슬롯.
 * 웹 PersonSlotPicker의 SlotCard 동작과 동일:
 *   - 정사각형 카드 버튼 → MansePickerSheet 열림
 *   - 선택 후: 이름 + birth_date 표시 + "다시 선택" 레이블
 *   - 미선택: "+" 아이콘 + "선택 / 입력" 레이블
 */

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ProfileResponse, BirthInput } from '@sajuguri/api-client'
import { MansePickerSheet, type MansePick } from '@/components/manse/MansePickerSheet'
import { MascotTinted } from '@/components/ui/MascotTinted'

interface PersonSlotProps {
  label: string
  profiles: ProfileResponse[] | undefined
  onChange: (input: BirthInput | null) => void
  sheetTitle: string
}

export function PersonSlot({ label, profiles, onChange, sheetTitle }: PersonSlotProps) {
  const [pick, setPick] = useState<MansePick | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  function handlePick(p: MansePick) {
    setPick(p)
    setSheetOpen(false)
    onChange(mansePickToBirthInput(p))
  }

  return (
    <View style={{ gap: 8 }}>
      {/* 슬롯 레이블 */}
      <Text
        style={{
          textAlign: 'center',
          fontSize: 12,
          fontWeight: '900',
          color: '#1A1A1A',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>

      {/* 카드 버튼 */}
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={{
          aspectRatio: 1,
          borderWidth: 2,
          borderColor: '#1A1A1A',
          borderRadius: 16,
          backgroundColor: '#FAFAF7',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: 12,
          shadowColor: '#1A1A1A',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
        }}
      >
        {pick ? (
          <>
            <View
              style={{
                width: 64,
                height: 64,
                borderWidth: 2,
                borderColor: '#1A1A1A',
                borderRadius: 16,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FAFAF7',
              }}
            >
              <MascotTinted stem={pick.day_stem ?? null} width={58} height={58} />
            </View>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#1A1A1A' }} numberOfLines={1}>
                {pick.name || '이름 없음'}
              </Text>
              <Text style={{ fontSize: 11, color: '#8A8270' }}>{pick.birth_date}</Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#005A3D' }}>다시 선택</Text>
          </>
        ) : (
          <>
            <View
              style={{
                width: 64,
                height: 64,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: '#1A1A1A',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 30, fontWeight: '900', color: '#1A1A1A' }}>+</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#8A8270' }}>선택 / 입력</Text>
          </>
        )}
      </Pressable>

      <MansePickerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles ?? []}
        title={sheetTitle}
        onPick={handlePick}
      />
    </View>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

function mansePickToBirthInput(p: MansePick): BirthInput {
  return {
    name: p.name || null,
    birth_date: p.birth_date,
    birth_time: p.birth_time,
    gender: p.gender,
    calendar: p.calendar,
    is_leap_month: p.is_leap_month,
    birth_longitude: p.birth_longitude ?? null,
    birth_utc_offset: null,
  }
}
```

- [ ] **Step 2: Update compatibility/new.tsx to pass sheetTitle to PersonSlot**

In `apps/mobile/src/app/compatibility/new.tsx`, update the PersonSlot usage:

```tsx
{/* 사람 A 슬롯 */}
<PersonSlot
  label="나 (첫 번째 사람)"
  profiles={profiles}
  onChange={setPersonA}
  sheetTitle="첫 번째 사람 선택"
/>

{/* 구분선 — ♥ 아이콘 */}
...

{/* 사람 B 슬롯 */}
<PersonSlot
  label="상대방 (두 번째 사람)"
  profiles={profiles}
  onChange={setPersonB}
  sheetTitle="두 번째 사람 선택"
/>
```

Also update the outer layout to show the two slots side by side like the web:

```tsx
{/* 두 슬롯을 가로로 나란히 (web PersonSlotPicker 레이아웃) */}
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <View style={{ flex: 1 }}>
    <PersonSlot
      label="나 (첫 번째 사람)"
      profiles={profiles}
      onChange={setPersonA}
      sheetTitle="첫 번째 사람 선택"
    />
  </View>
  <Text style={{ fontSize: 36, color: '#FF6B00', fontWeight: '900', alignSelf: 'flex-end', paddingBottom: 24 }}>♥</Text>
  <View style={{ flex: 1 }}>
    <PersonSlot
      label="상대방 (두 번째 사람)"
      profiles={profiles}
      onChange={setPersonB}
      sheetTitle="두 번째 사람 선택"
    />
  </View>
</View>
```

Remove the now-redundant separate `♥` divider `<View>` that was previously between the two PersonSlot blocks.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/compat/PersonSlot.tsx \
  apps/mobile/src/app/compatibility/new.tsx
git commit -m "feat(mobile): PersonSlot uses MansePickerSheet bottom-sheet (web PersonSlotPicker parity)"
```

---

## Task 12: Final validation

- [ ] **Step 1: TypeScript check**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
pnpm --filter @sajuguri/mobile tsc --noEmit
```

Expected: 0 errors (or only pre-existing errors unrelated to this work).

- [ ] **Step 2: Lint check**

```bash
pnpm --filter @sajuguri/mobile lint
```

Expected: 0 new errors.

- [ ] **Step 3: Manual smoke check on simulator**

```
1. Open /report/new → MansePickerSheet auto-opens → select profile → topics input shows → tap "리포트 생성" → GeneratingIndicator shows with rotating phrases + bouncing mascot
2. Generation completes → report detail opens → MascotTinted header visible → DaeUn section shows "대운 비교" title + ChartPlaceholder → "대운 전체" ChartPlaceholder visible → "주의점" label (not "주의사항") → "나머지 보기 (N)" show-more → "다시 생성" button visible → guideText at bottom
3. Open /compatibility/new → two side-by-side slot cards → tap each → MansePickerSheet opens → topics field visible → "궁합 보기" button → GeneratingIndicator with compat phrases
4. Generation completes → compat detail → nameA ♥ nameB header with birth_date → count-up score animation → "찰떡궁합"/"주의" badge if applicable → "십성" label (not "십신") → ElementFlowDiagram sections render → guideText at bottom
5. Login gate: trigger by logging out → "로그인이 필요해요" + "구글로 로그인" / "구글로 시작하기"
6. Tab content: [[chart:get_palja]] renders ChartPlaceholder "사주 원국 차트" instead of blank
7. Advice box label shows "현실 조언" (not "조언")
```

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -p
git commit -m "fix(mobile): post-smoke corrections"
```

---

## Self-Review

**Spec coverage check:**

| Divergence | Task |
|---|---|
| #1 chart markers stripped | Task 8 |
| #2 daeUn chart missing | Task 9 |
| #3 request_topics compat | Task 7 |
| #4 ElementFlowDiagram | Task 6 |
| #5 report entry flow | Task 10 |
| #6 loading UX | Task 3 |
| #7 request_topics copy | Task 1 |
| #8 regenerate CTA | Task 5 |
| #9 guideText | Tasks 5, 6 |
| #10 score count-up/badges/colors | Task 4 |
| #11 score label copy | Task 4 |
| #12 "한 줄 메모" | Task 1 |
| #13 "현실 조언" | Task 1 |
| #14 show-more copy | Task 1 |
| #15 daeUn title | Task 1 |
| #16 caution label | Task 1 |
| #17 login-gate copy | Task 2 |
| #18 error 401/429 | Task 2 |
| #19 slot labels | Tasks 1, 11 |
| #20 slot picker UX | Task 11 |
| #21 name fallback | Task 1 |
| #22 language locale | Task 2 |
| #23 report new copy | Task 10 (rewritten) |
| #24 compat new copy | Task 1 |
| #25 disabled button hint | Task 1 |
| #26 mascot header | Task 5 |
| #27 birth_date header | Task 6 |

All 27 divergences covered. No placeholders or TODOs. Type signatures in Task 11 (`PersonSlot`) match the new `sheetTitle` prop added in Task 11 Step 2.
