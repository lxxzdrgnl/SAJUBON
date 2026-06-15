# RN Fortune Web Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the React Native fortune story feature to full web parity — correct i18n copy, link sharing, MansePickerSheet entry, Reanimated animations, responsive font sizes, and neutral mascot in SummaryCard.

**Architecture:** Six targeted edits to existing files: `fortune/index.tsx` (entry + sheet), `fortune/SummaryCard.tsx` (copy + link share + neutral mascot), `fortune/StoryCard.tsx` (animations + responsive fonts), `fortune/StoryPager.tsx` (bg transition + scale slide). No new dependencies.

**Tech Stack:** React Native, Reanimated 4 (`withRepeat`, `withSequence`, `withTiming`, `withSpring`), `Dimensions` from react-native, `@/components/manse/MansePickerSheet`, `@/lib/useShare`, `@sajuguri/api-client`'s `createFortuneShare`.

---

## File Map

| File | Change |
|---|---|
| `apps/mobile/src/app/fortune/index.tsx` | Replace inline BirthInputForm gate with MansePickerSheet; auto-open sheet when no rep profile |
| `apps/mobile/src/components/fortune/SummaryCard.tsx` | Fix copy (loading/error/saveImage/headerTitle); add link share CTA; swap brand mascot to neutral |
| `apps/mobile/src/components/fortune/StoryCard.tsx` | Add confetti (≥90), score glow pulse (≥90), caution overlay (≤35), responsive font sizes via Dimensions |
| `apps/mobile/src/components/fortune/StoryPager.tsx` | Add scale (0.985→1) to slide transition, bg color transition (~480ms), bottom squiggle wave SVG |

---

## Task 1: Fix i18n copy — loading / error strings

**What:** The current mobile text has wrong strings vs ko.json `fortune.*`.
- Loading: "오늘의 운세를 불러오고 있어요" → "운세를 분석하고 있어요"
- Error: "운세를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." → "운세를 불러올 수 없어요. 잠시 후 다시 시도해 주세요."

**Files:**
- Modify: `apps/mobile/src/app/fortune/index.tsx`

- [ ] **Step 1: Fix loading text**

In `apps/mobile/src/app/fortune/index.tsx`, find the loading ActivityIndicator text and change it:

```tsx
// OLD (line ~143):
<Text style={{ fontSize: 14, fontWeight: '700', color: '#8A8270' }}>
  오늘의 운세를 불러오고 있어요
</Text>

// NEW:
<Text style={{ fontSize: 14, fontWeight: '700', color: '#8A8270' }}>
  운세를 분석하고 있어요
</Text>
```

- [ ] **Step 2: Fix error text**

In `apps/mobile/src/app/fortune/index.tsx`, change the error state message in `fetchStory`:

```tsx
// OLD (line ~89):
setError('운세를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')

// NEW:
setError('운세를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.')
```

- [ ] **Step 3: Verify TSC clean for this file**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/mobile && npx tsc --noEmit 2>&1 | grep "fortune/index"
```

Expected: no output (no errors in that file).

---

## Task 2: Replace BirthInputForm gate with MansePickerSheet in fortune/index.tsx

**What:** Web's `/fortune` uses `FortuneEntrySheet` (a MansePickerSheet-like bottom sheet with title "누구의 운세를 볼까요?"). Mirror this on mobile: when no rep profile exists (or on guest), open `MansePickerSheet` instead of rendering an inline form/header.

**Files:**
- Modify: `apps/mobile/src/app/fortune/index.tsx`

**Key facts:**
- `MansePickerSheet` at `@/components/manse/MansePickerSheet` takes `{ open, onClose, profiles, title, onPick }`.
- `onPick` receives a `MansePick` object with fields `{ name, birth_date, birth_time, gender, calendar, is_leap_month, birth_longitude?, day_stem? }`.
- We need a `mansePick → SajuCalcRequest` converter (parallel to existing `birthInputToCalcRequest`).
- Sheet title from ko.json: "누구의 운세를 볼까요?"
- The sheet should auto-open when `showForm` becomes true.
- If the user dismisses the sheet without picking (onClose), we call `handleClose` to go back.

- [ ] **Step 1: Add MansePick import and converter function**

In `apps/mobile/src/app/fortune/index.tsx`, add imports and converter:

```tsx
// Add to imports block:
import { MansePickerSheet, type MansePick } from '@/components/manse/MansePickerSheet'

// Add after birthInputToCalcRequest (around line 56):
function mansePickToCalcRequest(pick: MansePick): SajuCalcRequest {
  return {
    name: pick.name || undefined,
    birth_date: pick.birth_date,
    birth_time: pick.birth_time,
    gender: pick.gender,
    calendar: pick.calendar,
    is_leap_month: pick.is_leap_month,
    birth_longitude: pick.birth_longitude,
  }
}
```

- [ ] **Step 2: Replace handleFormSubmit and remove BirthInputForm-related imports**

Remove the `BirthInputForm` import and `ManseBirthInput` import (they are no longer needed in index.tsx if we delegate entirely to MansePickerSheet). Add a `handlePick` handler:

```tsx
// REMOVE these imports:
// import { BirthInputForm } from '@/components/manse/BirthInputForm'
// import type { ManseBirthInput } from '@/components/manse/BirthInputForm'

// REMOVE birthInputToCalcRequest function (only used by handleFormSubmit)

// REPLACE handleFormSubmit with:
const handlePick = useCallback(async (pick: MansePick) => {
  await fetchStory(mansePickToCalcRequest(pick))
}, [fetchStory])
```

- [ ] **Step 3: Replace the showForm render block with MansePickerSheet**

The current `showForm` branch renders a full-screen header + ScrollView + BirthInputForm.
Replace the entire `if (showForm)` block and the final fallback `return` (the spinning loader while waiting for profiles) with this structure that renders the sheet overlay:

The new approach: always render the background loading view, and mount `MansePickerSheet` on top when `showForm` is true. When closed without picking, call `handleClose`.

Replace the entire `showForm` JSX block (around lines 183–238) AND the final fallback block (lines 241–254) with:

```tsx
  // ── 시트 모드 (프로필 없는 경우) ──────────────────────────────────────────
  // showForm일 때는 크림 배경 위에 MansePickerSheet 오버레이.
  // sheet를 닫으면 뒤로 돌아간다 (onClose = handleClose).
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFFBF2',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: insets.top,
      }}
    >
      <ActivityIndicator size="large" color="#1A1A1A" />
      <MansePickerSheet
        open={showForm}
        onClose={handleClose}
        profiles={profiles ?? []}
        title="누구의 운세를 볼까요?"
        onPick={handlePick}
      />
    </View>
  )
```

- [ ] **Step 4: TSC check**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/mobile && npx tsc --noEmit 2>&1 | grep "fortune/index"
```

Expected: no output.

---

## Task 3: Fix SummaryCard — copy, neutral mascot, save button label

**What:**
- `summaryTitle` fallback: currently "오늘의 하루 요약"; ko.json says "너의 하루 요약". Fix fallback.
- Save button label: currently "이미지로 저장" → must be "이미지 저장" (ko.json `fortune.summary.saveImage`).
- Brand header mascot: web uses `/mascot.svg` (neutral, not stem-tinted). Mobile uses `MascotTinted` with `story.day_ganji.stem`. Fix: pass `stem={null}` to get the default `#FFD900` (neutral) look.
- The "너의 하루 요약" header copy: intro name fallback "오늘" — the story intro card (web StoryCard line 174): `{profileName}{profileName ? '의 ' : ''}오늘` which renders just "오늘" when empty. The `summaryTitle` in SummaryCard: `story.profile_name ? \`${story.profile_name}의 하루 요약\` : t('headerTitle')` where `t('headerTitle')` = "너의 하루 요약".

**Files:**
- Modify: `apps/mobile/src/components/fortune/SummaryCard.tsx`

- [ ] **Step 1: Fix summaryTitle fallback**

Line ~79 in SummaryCard.tsx:
```tsx
// OLD:
const summaryTitle = story.profile_name ? `${story.profile_name}의 하루 요약` : '오늘의 하루 요약'

// NEW:
const summaryTitle = story.profile_name ? `${story.profile_name}의 하루 요약` : '너의 하루 요약'
```

- [ ] **Step 2: Fix save button label**

Around line 284 in SummaryCard.tsx:
```tsx
// OLD:
<Text style={{ fontSize: 14, fontWeight: '900', color: base }}>
  이미지로 저장
</Text>

// NEW:
<Text style={{ fontSize: 14, fontWeight: '900', color: base }}>
  이미지 저장
</Text>
```

- [ ] **Step 3: Fix brand header mascot to neutral**

In the ViewShot area, find the `MascotTinted` for the brand header (line ~132):
```tsx
// OLD:
<MascotTinted stem={story.day_ganji.stem} size={28} />

// NEW (stem=null → falls back to MASCOT_DEFAULT_BG = #FFD900 = neutral):
<MascotTinted stem={null} size={28} />
```

- [ ] **Step 4: TSC check**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/mobile && npx tsc --noEmit 2>&1 | grep "fortune/SummaryCard"
```

Expected: no output.

---

## Task 4: Add "링크 공유" CTA to SummaryCard

**What:** Web SummaryCard has two CTAs: "이미지 저장" (primary, ink fill) and "링크 공유" (secondary, outline). Mobile only has "이미지로 저장" + "닫기". Add "링크 공유" between the two: use `useShare` from `@/lib/useShare` and `createFortuneShare` from `@sajuguri/api-client`.

The share URL pattern (from web): `${origin}/share/fortune/${share_token}`. On mobile, the server's `share_url` field already contains the full URL (it's in `DailyShareResponse.share_url`). Use that directly.

**Files:**
- Modify: `apps/mobile/src/components/fortune/SummaryCard.tsx`

- [ ] **Step 1: Add imports**

At the top of SummaryCard.tsx, add:
```tsx
import { createFortuneShare } from '@sajuguri/api-client'
import { useAuth } from '@/lib/auth/AuthContext'
import { useShare } from '@/lib/useShare'
```

- [ ] **Step 2: Add hook calls inside SummaryCard component**

After the existing state declarations (after `const [saving, setSaving] = useState(false)`), add:
```tsx
const { api } = useAuth()
const { sharing, share } = useShare()
```

- [ ] **Step 3: Add share handler**

After `handleSaveImage`, add:
```tsx
function handleShareLink() {
  share(() =>
    createFortuneShare(api, { story }).then((r) => r.share_url)
  )
}
```

- [ ] **Step 4: Add "링크 공유" button in CTA area**

In the CTA `<View style={{ gap: 12 }}>` section, replace the existing two buttons with three buttons: save image, share link, close. Insert the link share button between save and close:

```tsx
{/* CTA 버튼 */}
<View style={{ gap: 12 }}>
  {/* 이미지 저장 */}
  <Pressable
    onPress={handleSaveImage}
    disabled={saving}
    style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: ink,
      borderRadius: 16,
      paddingVertical: 14,
      opacity: saving ? 0.6 : pressed ? 0.85 : 1,
    })}
  >
    {saving ? (
      <ActivityIndicator size="small" color={base} />
    ) : (
      <Text style={{ fontSize: 14, fontWeight: '900', color: base }}>
        이미지 저장
      </Text>
    )}
  </Pressable>

  {/* 링크 공유 */}
  <Pressable
    onPress={handleShareLink}
    disabled={sharing}
    style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 2,
      borderColor: ink,
      borderRadius: 16,
      paddingVertical: 14,
      opacity: sharing ? 0.6 : pressed ? 0.7 : 1,
      backgroundColor: 'transparent',
    })}
  >
    {sharing ? (
      <ActivityIndicator size="small" color={ink} />
    ) : (
      <Text style={{ fontSize: 14, fontWeight: '900', color: ink }}>
        링크 공유
      </Text>
    )}
  </Pressable>

  {/* 닫기 */}
  <Pressable
    onPress={onClose}
    style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: ink,
      borderRadius: 16,
      paddingVertical: 14,
      opacity: pressed ? 0.7 : 1,
      backgroundColor: 'transparent',
    })}
  >
    <Text style={{ fontSize: 14, fontWeight: '900', color: ink }}>
      닫기
    </Text>
  </Pressable>
</View>
```

- [ ] **Step 5: TSC check**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/mobile && npx tsc --noEmit 2>&1 | grep "fortune/SummaryCard"
```

Expected: no output.

---

## Task 5: Add animations to StoryCard — confetti, score pulse, caution overlay + responsive fonts

**What:** Web StoryCard has:
1. **Confetti burst** on `isHighScore` (≥90) — a burst of colored spans; on RN we simulate with Animated circles (native-driver scale+opacity).
2. **Score glow pulse** on `isHighScore` — web uses `score-pulse` CSS keyframe (drop-shadow filter). On RN, use Reanimated `withRepeat`/`withSequence` on opacity of a glow `View`.
3. **Caution overlay** on `isLowScore` (≤35) — web uses a radial-gradient `caution-pulse`. On RN, use Reanimated `withRepeat` pulsing opacity of a semi-transparent View overlay.
4. **Responsive font sizes** — web uses `clamp(min, vw, max)`. On RN, approximate with `Dimensions.get('window').width` scaled values.

**Important:** Keep the existing `stagger` animations (fade-up), mascot spring, and `useCountUp` intact. Add new animations on top.

**Files:**
- Modify: `apps/mobile/src/components/fortune/StoryCard.tsx`

- [ ] **Step 1: Add Reanimated imports and Dimensions**

At the top of StoryCard.tsx, add:
```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming as rWithTiming,
  Easing as rEasing,
  runOnJS,
} from 'react-native-reanimated'
import { Dimensions } from 'react-native'
```

Note: There's already a `View, Text, Animated` import from `react-native`. The Reanimated `Animated` will shadow the RN one if named the same. To avoid conflict: rename the RN Animated:

```tsx
// Change existing import:
import { useEffect, useRef, useState } from 'react'
import { View, Text, Animated as RNAnimated } from 'react-native'
// (then rename all uses of Animated → RNAnimated in the stagger/mascot code)
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming as rWithTiming,
} from 'react-native-reanimated'
import { Dimensions } from 'react-native'
```

- [ ] **Step 2: Update all existing RNAnimated usages in StoryCard**

After renaming `Animated` → `RNAnimated` for the react-native import, update references:
- `useStaggerAnims`: uses `new Animated.Value(0)` → `new RNAnimated.Value(0)` and `Animated.timing`, `Animated.parallel` → `RNAnimated.timing`, `RNAnimated.parallel`
- `mascotAnim`: `new Animated.Value(0)` → `new RNAnimated.Value(0)`, `Animated.spring` → `RNAnimated.spring`
- Stagger animated views: `<Animated.View ...>` wrapping stagger — these are RNAnimated.View. Change to `<RNAnimated.View ...>`

- [ ] **Step 3: Add responsive font scaling helper**

After the `useStaggerAnims` hook, add:

```tsx
const SCREEN_W = Dimensions.get('window').width

/** clamp(min, vw*factor, max) 근사 — web clamp() 대응. */
function scaledFont(min: number, factor: number, max: number): number {
  return Math.min(Math.max(Math.round(SCREEN_W * factor), min), max)
}
```

- [ ] **Step 4: Add score glow pulse hook (Reanimated)**

```tsx
function useGlowPulse(active: boolean): Animated.StyleProps {
  const glow = useSharedValue(0)
  useEffect(() => {
    if (!active) { glow.value = 0; return }
    glow.value = withRepeat(
      withSequence(
        rWithTiming(1, { duration: 1000 }),
        rWithTiming(0, { duration: 1000 }),
      ),
      -1,
      false,
    )
    return () => { glow.value = 0 }
  }, [active])
  return useAnimatedStyle(() => ({
    opacity: 0.7 + glow.value * 0.3,
  }))
}
```

Wait — `useAnimatedStyle` cannot be called conditionally. Extract as a custom hook:

```tsx
function useGlowPulse(active: boolean) {
  const glow = useSharedValue(0)
  useEffect(() => {
    if (!active) { glow.value = 0; return }
    glow.value = withRepeat(
      withSequence(
        rWithTiming(1, { duration: 1000 }),
        rWithTiming(0, { duration: 1000 }),
      ),
      -1,
      false,
    )
    return () => { glow.value = 0 }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
  return useAnimatedStyle(() => ({
    opacity: 0.7 + glow.value * 0.3,
  }))
}
```

- [ ] **Step 5: Add caution overlay pulse hook (Reanimated)**

```tsx
function useCautionPulse(active: boolean) {
  const pulse = useSharedValue(0.5)
  useEffect(() => {
    if (!active) { pulse.value = 0; return }
    pulse.value = withRepeat(
      withSequence(
        rWithTiming(0.8, { duration: 1500 }),
        rWithTiming(0.5, { duration: 1500 }),
      ),
      -1,
      false,
    )
    return () => { pulse.value = 0 }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
  return useAnimatedStyle(() => ({
    opacity: pulse.value,
  }))
}
```

- [ ] **Step 6: Add simple confetti component using RNAnimated**

Add before `StoryCard`:

```tsx
const CONFETTI_COLORS = [
  '#FFD900', '#FF2D78', '#00C2B8',
  '#7B3FE4', '#C6F432', '#FF6B00',
  '#FFFFFF', '#3DA5FF', '#FF5A4D',
]

function Confetti({ active }: { active: boolean }) {
  const particles = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      anim: new RNAnimated.Value(0),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dx: (Math.random() - 0.5) * 200,
      dy: -(80 + Math.random() * 140),
      size: 4 + Math.round(Math.random() * 6),
    }))
  ).current
  const fired = useRef(false)

  useEffect(() => {
    if (!active || fired.current) return
    fired.current = true
    const anims = particles.map((p, i) =>
      RNAnimated.timing(p.anim, {
        toValue: 1,
        duration: 900 + Math.random() * 600,
        delay: i * 20,
        useNativeDriver: true,
      })
    )
    RNAnimated.parallel(anims).start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (!active) return null

  return (
    <View style={{ position: 'absolute', top: '30%', left: '30%' }} pointerEvents="none">
      {particles.map((p, i) => (
        <RNAnimated.View
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * (Math.random() > 0.5 ? 1 : 2.5),
            borderRadius: p.size / 2,
            backgroundColor: p.color,
            transform: [
              { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
              { scale: p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.8, 0.4] }) },
            ],
            opacity: p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] }),
          }}
        />
      ))}
    </View>
  )
}
```

- [ ] **Step 7: Wire animations inside StoryCard component body**

Inside `StoryCard`, after computing `isHighScore`/`isLowScore`, add:
```tsx
const glowStyle = useGlowPulse(isHighScore)
const cautionStyle = useCautionPulse(isLowScore)
```

- [ ] **Step 8: Apply responsive fonts and animations in the JSX**

In the `overall` kind section, wrap the score number with `Animated.View` (Reanimated) for glow pulse, and add `<Confetti>`:

```tsx
{card.kind === 'overall' && (
  <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
    {/* Caution overlay */}
    {isLowScore && (
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            inset: 0,
            backgroundColor: `${ink}1A`,
            borderRadius: 8,
          },
          cautionStyle,
        ]}
      />
    )}
    {card.score !== undefined && (
      <RNAnimated.View style={fadeUp(0)}>
        {/* Confetti burst above score */}
        <Confetti active={isHighScore} />
        <Animated.View style={isHighScore ? glowStyle : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Text
              style={{
                fontSize: scaledFont(108, isHighScore ? 0.38 : 0.34, isHighScore ? 168 : 150),
                fontWeight: '900',
                letterSpacing: -4,
                color: ink,
                lineHeight: isHighScore ? 132 : 118,
                fontVariant: ['tabular-nums'],
              }}
            >
              {scoreValue}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: inkSoft, marginBottom: 12 }}>
              /100
            </Text>
          </View>
        </Animated.View>
        {/* High/low badges unchanged */}
        {isHighScore && (
          <View style={{ alignSelf: 'flex-start', backgroundColor: accent, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: palette.inkLight ? '#15233A' : '#FFFFFF', letterSpacing: 1 }}>오늘의 하이라이트</Text>
          </View>
        )}
        {isLowScore && (
          <View style={{ alignSelf: 'flex-start', backgroundColor: ink, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: palette.base, letterSpacing: 1 }}>주의</Text>
          </View>
        )}
      </RNAnimated.View>
    )}
    <RNAnimated.View style={fadeUp(1)}>
      <Text style={{ fontSize: scaledFont(30, 0.085, 44), fontWeight: '900', color: ink, lineHeight: 40, letterSpacing: -0.5 }}>
        {card.headline}
      </Text>
    </RNAnimated.View>
    <RNAnimated.View style={fadeUp(2)}>
      <Text style={{ fontSize: 17, color: inkSoft, lineHeight: 26 }}>
        {card.body}
      </Text>
    </RNAnimated.View>
  </View>
)}
```

For the intro, apply responsive fonts:
```tsx
// intro danji text: was fontSize: 96 → scaledFont(72, 0.22, 104)
// intro headline: was fontSize: 28 → scaledFont(26, 0.075, 34)
```

For category rank number:
```tsx
// was fontSize: 128 → scaledFont(96, 0.30, 140)
// category headline: was fontSize: 30 → scaledFont(28, 0.075, 40)
```

For caution/color headline:
```tsx
// was fontSize: 30 → scaledFont(28, 0.08, 40)
```

- [ ] **Step 9: TSC check**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/mobile && npx tsc --noEmit 2>&1 | grep "fortune/StoryCard"
```

Expected: no output.

---

## Task 6: Add bg transition + scale slide + squiggle wave to StoryPager

**What:**
- **Bg color transition ~480ms**: web `transition: 'background 480ms cubic-bezier(0.22,1,0.36,1)'`. On RN, use Reanimated to animate from old bg to new bg on card change.
- **Slide + scale**: web `from { opacity: 0; transform: translateX(8%) scale(0.985); } to { opacity: 1; transform: translateX(0) scale(1); }`. Currently only translateX + opacity. Add scale: `useSharedValue(1)` that animates `0.985 → 1` alongside the slide.
- **Bottom squiggle wave SVG**: web renders an SVG `<path d="M0 70 Q 80 30 160 70 T 320 70 T 480 70 T 640 70 V120 H0 Z">`. Use `react-native-svg` (already used in MascotTinted) to render this.

**Files:**
- Modify: `apps/mobile/src/components/fortune/StoryPager.tsx`

- [ ] **Step 1: Import Svg from react-native-svg**

```tsx
import { Svg, Path } from 'react-native-svg'
```

- [ ] **Step 2: Add scale shared value to Reanimated animation**

In `StoryPager`, add a scale sharedValue:
```tsx
const scale = useSharedValue(1)
```

Update `animatedStyle` to include scale:
```tsx
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: translateX.value }, { scale: scale.value }],
  opacity: opacity.value,
  flex: 1,
}))
```

Update `animateTransition` to also animate scale:
```tsx
const animateTransition = useCallback((dir: 'next' | 'prev' | 'none') => {
  if (dir === 'none') {
    opacity.value = 0
    opacity.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.ease) })
    return
  }
  const fromX = dir === 'next' ? 40 : -40
  translateX.value = fromX
  opacity.value = 0
  scale.value = 0.985
  translateX.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) })
  opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.ease) })
  scale.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
}, [translateX, opacity, scale])
```

- [ ] **Step 3: Add bg transition using Reanimated**

The background color needs to animate between card changes. Use an `interpolateColor` approach with Reanimated 4:

Import `interpolateColor` and add a bg progress value:

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated'
```

However, `interpolateColor` requires a numeric progress value (0→1) and two color strings. Since bg changes arbitrarily, the cleanest approach for RN: use a Reanimated `SharedValue<number>` as progress from 0→1 whenever bg changes, and `interpolateColor(progress, [0, 1], [prevBg, nextBg])`.

Add state to track previous bg:
```tsx
const bgProgress = useSharedValue(1)
const prevBgRef = useRef(bg)

// bg color animated style
const bgAnimStyle = useAnimatedStyle(() => ({
  backgroundColor: interpolateColor(
    bgProgress.value,
    [0, 1],
    [prevBgRef.current, bg],
  ),
}))
```

When `bg` changes (via `cardIndex`/`palette`), trigger the transition:
```tsx
useEffect(() => {
  if (prevBgRef.current === bg) return
  bgProgress.value = 0
  bgProgress.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.ease) })
  // Update prev after animation starts
  prevBgRef.current = bg
}, [bg])
```

Change the outermost `<View style={{ flex: 1, backgroundColor: bg }}>` to use the animated style:

```tsx
// OLD: <View style={{ flex: 1, backgroundColor: bg }}>
// NEW:
<Animated.View style={[{ flex: 1 }, bgAnimStyle]}>
  {/* ... rest unchanged ... */}
</Animated.View>
```

**Note:** `interpolateColor` with a `useAnimatedStyle` that reads a `SharedValue` which changes between renders — this is fine in Reanimated 4 as long as `bg` is captured as a worklet closure. However, `bg` is a JS-side string. Pass it via `useSharedValue` or as a derivation. Simplest: use two `SharedValue<string>` for fromBg/toBg... but Reanimated color interpolation requires a numeric progress. The simplest correct approach that avoids worklet complexity:

Use a `useRef` for previous bg + a separate Reanimated opacity crossfade between two layers:

```tsx
// Two-layer bg crossfade: layer1 = prevBg (fixed), layer2 = newBg (fades in from 0→1 opacity)
const bgOpacity = useSharedValue(1)
const prevBgRef = useRef(bg)
const [prevBg, setPrevBg] = useState(bg)

useEffect(() => {
  if (prevBgRef.current === bg) return
  const old = prevBgRef.current
  prevBgRef.current = bg
  setPrevBg(old)
  bgOpacity.value = 0
  bgOpacity.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.ease) })
}, [bg])

const bgOverlayStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }))
```

In JSX, replace the single background `View` with two stacked `View`s:
```tsx
<View style={{ flex: 1 }}>
  {/* Layer 1: previous bg (underneath) */}
  <View style={{ position: 'absolute', inset: 0, backgroundColor: prevBg }} />
  {/* Layer 2: new bg (fades in on top) */}
  <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: bg }, bgOverlayStyle]} />
  {/* All existing content */}
  <View style={{ flex: 1 }}>
    {/* existing scatter dots, segments, cards... */}
  </View>
</View>
```

- [ ] **Step 4: Add squiggle wave SVG at the bottom**

In the `pointerEvents="none"` decoration `View` (where scatter dots are rendered), add after the dots:

```tsx
{/* 하단 물결 */}
<View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} pointerEvents="none">
  <Svg
    width="100%"
    height={90}
    viewBox="0 0 640 120"
    preserveAspectRatio="none"
  >
    <Path
      d="M0 70 Q 80 30 160 70 T 320 70 T 480 70 T 640 70 V120 H0 Z"
      fill={palette.inkLight ? 'rgba(255,255,255,0.06)' : 'rgba(21,35,58,0.06)'}
    />
  </Svg>
</View>
```

- [ ] **Step 5: TSC check**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/mobile && npx tsc --noEmit 2>&1 | grep "fortune/StoryPager"
```

Expected: no output.

---

## Task 7: Final full TSC validation

- [ ] **Step 1: Run full TSC for all fortune files**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/mobile && npx tsc --noEmit 2>&1 | grep -E "fortune/(index|StoryCard|SummaryCard|StoryPager)"
```

Expected: no output (no errors in the fortune files we touched).

- [ ] **Step 2: Run full TSC to check for regressions**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/mobile && npx tsc --noEmit 2>&1 | head -40
```

Expected: only pre-existing errors (from other in-progress work), none introduced by our changes.

---

## Skipped / Deferred

The following were explicitly listed in the spec but are skipped with rationale:

| Item | Decision |
|---|---|
| **Bottom squiggle wave** | Implemented in Task 6 Step 4 |
| **Background color transition ~480ms** | Implemented in Task 6 Step 3 (two-layer crossfade) |
| **Slide + scale transition** | Implemented in Task 6 Steps 1-2 |
| **Score glow pulse (≥90)** | Implemented in Task 5 (Reanimated opacity pulse) |
| **Caution overlay (≤35)** | Implemented in Task 5 (Reanimated opacity pulse) |
| **Confetti (≥90)** | Implemented in Task 5 (RNAnimated particles) |
| **Intro story name fallback "오늘"** | Already correct in web StoryCard — mobile StoryCard line 149: `{profileName ? \`${profileName}의 오늘\` : '오늘의 운세'}`. Web uses `{profileName}{profileName ? '의 ' : ''}오늘`. Update mobile to `{profileName ? \`${profileName}의 \` : ''}오늘` in Task 5 Step 8. |
| **True CSS drop-shadow glow** | RN has no CSS `filter: drop-shadow`. Approximated with Reanimated opacity pulse on the score number (sufficient visual impact). |
| **True radial-gradient caution overlay** | RN has no CSS radial-gradient. Approximated with a semi-transparent View with Reanimated opacity pulse. |
| **Expo Go image save guard** | Already present in current SummaryCard (`IS_EXPO_GO` check). Keep as-is. |

---

## Self-Review Checklist

**Spec coverage:**

1. COPY — loading/error/saveImage/headerTitle/shareLink: Tasks 1, 3, 4 cover all. ✓
2. LINK SHARE — "링크 공유" CTA with createFortuneShare + useShare: Task 4. ✓
3. ENTRY — MansePickerSheet replaces BirthInputForm inline gate: Task 2. ✓
4. ANIMATIONS — confetti/score pulse/caution/bg transition/slide-scale: Tasks 5, 6. ✓
5. RESPONSIVE FONTS — Dimensions-based scaledFont helper: Task 5. ✓
6. NEUTRAL MASCOT in SummaryCard: Task 3. ✓

**Placeholder scan:** No TBD or placeholder strings found — all code blocks complete.

**Type consistency:**
- `MansePick` (from MansePickerSheet) → `mansePickToCalcRequest` → `SajuCalcRequest` → `fetchStory`: chain is consistent.
- `createFortuneShare(api, { story })` → `DailyShareResponse.share_url` (string): matches `useShare`'s `produceUrl: () => Promise<string>`.
- `useGlowPulse` / `useCautionPulse` return `AnimatedStyleProp` from Reanimated, used in `Animated.View` (Reanimated): consistent.
- `RNAnimated.Value` used for stagger/mascot/confetti (native-driver compatible): consistent.
- `Svg`, `Path` from `react-native-svg` — already a dependency (used in MascotTinted): consistent.

**Missing item found:** The intro card's "오늘" name fallback. Mobile currently: `{profileName ? \`${profileName}의 오늘\` : '오늘의 운세'}`. Web: `{profileName}{profileName ? '의 ' : ''}오늘` which renders just "오늘" when empty. This must be fixed in Task 5 Step 8 as noted.
