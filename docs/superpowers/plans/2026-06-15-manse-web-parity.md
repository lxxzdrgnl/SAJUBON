# 만세력 웹 패리티 포트 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 5 missing result sections + fix IljuHero/WuxingBar/TenGodsRow/StrengthSection/DaeUnRow/TagChips/CTAs/copy to exactly match the web app.

**Architecture:** All changes stay in `apps/mobile/src/components/manse/`, `apps/mobile/src/app/manse/`, and `apps/mobile/src/lib/manse/`. New helper libs are ported verbatim from `apps/web/lib/manse/`. `cd apps/mobile && npx tsc --noEmit` must pass with 0 errors when done.

**Tech Stack:** Expo SDK 54, NativeWind, react-native-svg (Svg, Path, Circle, etc.), TanStack Query, useAuth.

---

## File Map

### New files to create
- `apps/mobile/src/lib/manse/wuxing.ts` — port from `apps/web/lib/manse/wuxing.ts`
- `apps/mobile/src/lib/manse/tenGods.ts` — port from `apps/web/lib/manse/tenGods.ts`
- `apps/mobile/src/lib/manse/strength.ts` — port from `apps/web/lib/manse/strength.ts`
- `apps/mobile/src/lib/manse/pillars.ts` — port from `apps/web/lib/manse/pillars.ts`
- `apps/mobile/src/lib/manse/ilJin.ts` — port from `apps/web/lib/manse/ilJin.ts`
- `apps/mobile/src/lib/manse/hapChung.ts` — port from `apps/web/lib/manse/hapChung.ts`
- `apps/mobile/src/lib/manse/solarCorrection.ts` — port from `apps/web/lib/manse/solarCorrection.ts`
- `apps/mobile/src/components/manse/TagChips.tsx` — new component
- `apps/mobile/src/components/manse/HapChungPanel.tsx` — new component
- `apps/mobile/src/components/manse/DetailAccordion.tsx` — new component
- `apps/mobile/src/components/manse/WuxingFeatureTable.tsx` — new component
- `apps/mobile/src/components/manse/GanjiColumn.tsx` — new component
- `apps/mobile/src/components/manse/YeonWolUn.tsx` — new component
- `apps/mobile/src/components/manse/IlJinCalendar.tsx` — new component

### Files to rewrite / heavily modify
- `apps/mobile/src/components/manse/IljuHero.tsx` — horizontal layout matching web
- `apps/mobile/src/components/manse/WuxingBar.tsx` — rename to WuxingBalanceCard pattern, add pentagram tab
- `apps/mobile/src/components/manse/TenGodsRow.tsx` — rewrite as SVG donut + group bars
- `apps/mobile/src/components/manse/StrengthSection.tsx` — unified card with SVG dist chart
- `apps/mobile/src/components/manse/DaeUnRow.tsx` — add twelve_wun, cap at 10, "현재" orange badge, age pill
- `apps/mobile/src/app/manse/result.tsx` — add 5 new sections, fix pillar labels, add CTAs

### Files to patch (minor)
- `apps/mobile/src/components/manse/BirthInputForm.tsx` — add nameOptional, validation, solar preview
- `apps/mobile/src/app/(tabs)/manse.tsx` — fix button label + empty copy
- `apps/mobile/src/app/manse/new.tsx` — fix subtitle copy

---

## Task 1: Port helper libs (wuxing, tenGods, strength, pillars, ilJin, hapChung, solarCorrection)

These are pure TypeScript — no RN-specific code. Copy verbatim from web, strip Next.js/React imports.

**Files:**
- Create: `apps/mobile/src/lib/manse/wuxing.ts`
- Create: `apps/mobile/src/lib/manse/tenGods.ts`
- Create: `apps/mobile/src/lib/manse/strength.ts`
- Create: `apps/mobile/src/lib/manse/pillars.ts`
- Create: `apps/mobile/src/lib/manse/ilJin.ts`
- Create: `apps/mobile/src/lib/manse/hapChung.ts`
- Create: `apps/mobile/src/lib/manse/solarCorrection.ts`

- [ ] Create `apps/mobile/src/lib/manse/wuxing.ts` — exact copy of `apps/web/lib/manse/wuxing.ts` (no imports to change, pure TS)

- [ ] Create `apps/mobile/src/lib/manse/tenGods.ts` — exact copy of `apps/web/lib/manse/tenGods.ts`

- [ ] Create `apps/mobile/src/lib/manse/strength.ts` — exact copy of `apps/web/lib/manse/strength.ts`

- [ ] Create `apps/mobile/src/lib/manse/pillars.ts` — exact copy of `apps/web/lib/manse/pillars.ts`. Change the import:
  ```ts
  import type { SajuCalcResponse, Pillar, SinSal } from '@sajuguri/api-client'
  ```
  (already matches, no web-only imports in this file)

- [ ] Create `apps/mobile/src/lib/manse/ilJin.ts` — exact copy of `apps/web/lib/manse/ilJin.ts`. Change the import:
  ```ts
  import type { IlJinEntry } from '@sajuguri/api-client'
  ```

- [ ] Create `apps/mobile/src/lib/manse/hapChung.ts` — exact copy of `apps/web/lib/manse/hapChung.ts`. Change the import:
  ```ts
  import type { SajuCalcResponse } from '@sajuguri/api-client'
  ```

- [ ] Create `apps/mobile/src/lib/manse/solarCorrection.ts` — exact copy of `apps/web/lib/manse/solarCorrection.ts` (pure TS, no imports)

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | head -40` — verify 0 errors in new lib files

---

## Task 2: Rewrite IljuHero — horizontal layout

Web: horizontal row (text left / 84×84 mascot box right), eyebrow label, serif 42px stem+branch hanja combined, ganji_name bold, nickname pill chip.

**Files:**
- Modify: `apps/mobile/src/components/manse/IljuHero.tsx`

- [ ] Rewrite `apps/mobile/src/components/manse/IljuHero.tsx`:

```tsx
import { View, Text } from 'react-native'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { ganjiNickname } from '@/lib/ganji'
import { radii } from '@/theme'
import type { Pillar } from '@sajuguri/api-client'

interface Props {
  dayPillar: Pillar
  label?: string
}

export function IljuHero({ dayPillar, label = '내 일주' }: Props) {
  const nick = ganjiNickname(dayPillar.stem, dayPillar.branch)

  return (
    <BrutalShadow radius={radii.card}>
      <View
        style={{
          backgroundColor: nick.bg,
          borderRadius: radii.card,
          borderWidth: 2,
          borderColor: '#1A1A1A',
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: text */}
          <View style={{ flex: 1, alignItems: 'flex-start', gap: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(26,26,26,0.6)' }}>{label}</Text>
            <Text
              style={{ fontSize: 42, fontWeight: '900', lineHeight: 48, color: '#1A1A1A' }}
              className="font-serif"
            >
              {dayPillar.stem_hanja}{dayPillar.branch_hanja}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1A1A1A' }}>
              {dayPillar.ganji_name}일주
            </Text>
            {nick.ko ? (
              <View
                style={{
                  marginTop: 4,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: '#1A1A1A',
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1A1A1A' }}>{nick.ko}</Text>
              </View>
            ) : null}
          </View>
          {/* Right: mascot box 84×84 */}
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#1A1A1A',
              backgroundColor: 'rgba(255,255,255,0.7)',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 12,
              flexShrink: 0,
              shadowColor: '#1A1A1A',
              shadowOffset: { width: 3, height: 3 },
              shadowOpacity: 1,
              shadowRadius: 0,
            }}
          >
            <MascotTinted stem={dayPillar.stem} size={64} />
          </View>
        </View>
      </View>
    </BrutalShadow>
  )
}
```

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | grep IljuHero` — 0 errors

---

## Task 3: New TagChips component

**Files:**
- Create: `apps/mobile/src/components/manse/TagChips.tsx`

- [ ] Create `apps/mobile/src/components/manse/TagChips.tsx`:

```tsx
import { View } from 'react-native'
import { Chip } from '@/components/ui/Chip'
import type { SajuCalcResponse, SinSal } from '@sajuguri/api-client'

function sinSalVariant(s: SinSal): 'lucky' | 'unlucky' | 'default' {
  if (s.type === 'lucky') return 'lucky'
  if (s.type === 'unlucky' || s.type === 'warning') return 'unlucky'
  return 'default'
}

export function TagChips({ data }: { data: SajuCalcResponse }) {
  const shown = data.sin_sals.slice(0, 4)
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <Chip label={`${data.day_pillar.ganji_name} 일주`} variant="yellow" />
      <Chip label={data.gyeok_guk.name} />
      <Chip label={`용신 ${data.yong_sin.primary}`} />
      <Chip label={data.day_master_strength.level_8} />
      {shown.map((s) => (
        <Chip key={s.name} label={s.name} variant={sinSalVariant(s)} />
      ))}
    </View>
  )
}
```

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | grep TagChips` — 0 errors

---

## Task 4: Rewrite WuxingBar → WuxingBalanceCard (bar + pentagram tabs)

Uses react-native-svg for pentagram. Port from `apps/web/components/manse/WuxingBalanceCard.tsx` and `apps/web/lib/manse/wuxing.ts`.

**Files:**
- Modify: `apps/mobile/src/components/manse/WuxingBar.tsx`

- [ ] Rewrite `apps/mobile/src/components/manse/WuxingBar.tsx` with the following structure:
  - Import from `@/lib/manse/wuxing`: `selectWuxingPercent, judge, balanceScore, balanceLabel, balanceSummary, pentagramVertices, nodeRadius, pctLabelPos, arrowPath, linePath, SANG_SAENG_PAIRS, SANG_GEUK_PAIRS, WUXING_ORDER, type Verdict`
  - Import `Svg, Path, Circle, Text as SvgText, Polygon, Defs, Marker` from `react-native-svg`
  - State: `tab: 'bar' | 'penta'`, `applyHap: boolean` (default true), `applyJohu: boolean` (default false)
  - Compute `pct = selectWuxingPercent(data, applyHap, applyJohu)`, `score = balanceScore(pct)`, `label = balanceLabel(score)`, `{over, lack} = balanceSummary(pct)`
  - Props: `{ data: SajuCalcResponse }` (not the old `wuxingCount/dominantElements/weakElements`)

  Full code:

```tsx
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Circle, Defs, Marker, Path, Polygon, Text as SvgText } from 'react-native-svg'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { ohaengColor } from '@/lib/manse/ohaeng'
import {
  arrowPath, balanceLabel, balanceScore, balanceSummary, judge, linePath,
  nodeRadius, pctLabelPos, pentagramVertices, SANG_GEUK_PAIRS, SANG_SAENG_PAIRS,
  selectWuxingPercent, WUXING_ORDER, type Verdict,
} from '@/lib/manse/wuxing'
import type { SajuCalcResponse } from '@sajuguri/api-client'

function verdictStyle(v: Verdict): { bg: string; text: string } {
  if (v === '과다') return { bg: '#FFEDE0', text: '#B34800' }
  if (v === '부족') return { bg: '#E0FAF8', text: '#00665F' }
  return { bg: '#F0EDE6', text: '#8A8270' }
}

function TabBtn({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A',
        paddingHorizontal: 12, paddingVertical: 4,
        backgroundColor: active ? '#FFDE21' : '#FAFAF7',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#1A1A1A' : '#8A8270' }}>{label}</Text>
    </Pressable>
  )
}

function CheckRow({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{
        width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: '#1A1A1A',
        backgroundColor: checked ? '#FFDE21' : '#FAFAF7',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <Text style={{ fontSize: 10, fontWeight: '900', color: '#1A1A1A' }}>✓</Text>}
      </View>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A8270' }}>{label}</Text>
    </Pressable>
  )
}

function Pentagram({ pct, dayElement }: { pct: Record<string, number>; dayElement: string }) {
  const v = pentagramVertices()
  const polygonPoints = v.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg viewBox="0 0 300 300" width="100%" style={{ maxWidth: 280, aspectRatio: 1 }}>
        <Defs>
          <Marker id="wx-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <Path d="M0,0 L0,6 L8,3 z" fill="#00C2B8" opacity="0.7" />
          </Marker>
        </Defs>
        <Polygon points={polygonPoints} fill="none" stroke="#EBE3D2" strokeWidth="1.5" strokeDasharray="4,3" />
        {SANG_GEUK_PAIRS.map(([fi, ti], idx) => (
          <Path key={`geuk-${idx}`} d={linePath(v, fi, ti)} stroke="#FF6B00" strokeWidth="1" strokeDasharray="4,3" opacity="0.25" fill="none" />
        ))}
        {SANG_SAENG_PAIRS.map(([fi, ti], idx) => (
          <Path key={`saeng-${idx}`} d={arrowPath(v, pct, fi, ti)} stroke="#00C2B8" strokeWidth="1.5" opacity="0.5" fill="none" markerEnd="url(#wx-arrow)" />
        ))}
        <Circle cx="150" cy="150" r="24" fill="#FFFBF2" stroke="#1A1A1A" strokeWidth="1.5" />
        <SvgText x="150" y="145" textAnchor="middle" fontSize="9" fill="#8A8270">일간</SvgText>
        <SvgText x="150" y="162" textAnchor="middle" fontSize="15" fontWeight="bold" fill={ohaengColor(dayElement)}>{dayElement}</SvgText>
        {WUXING_ORDER.map((el, i) => {
          const color = ohaengColor(el)
          const lp = pctLabelPos(v, pct, i)
          return (
            <React.Fragment key={el}>
              <Circle cx={v[i].x} cy={v[i].y} r={nodeRadius(pct[el] ?? 0)} fill={color} fillOpacity="0.14" stroke={color} strokeWidth="2" />
              <SvgText x={v[i].x} y={v[i].y + 6} textAnchor="middle" fontSize="16" fontWeight="bold" fill={color}>{el}</SvgText>
              <SvgText x={lp.x} y={lp.y} textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>{pct[el] ?? 0}%</SvgText>
            </React.Fragment>
          )
        })}
      </Svg>
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 20, height: 2, backgroundColor: '#00C2B8' }} />
          <Text style={{ fontSize: 11, color: '#8A8270' }}>상생</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 20, borderTopWidth: 1.5, borderColor: '#FF6B00', borderStyle: 'dashed' }} />
          <Text style={{ fontSize: 11, color: '#8A8270' }}>상극</Text>
        </View>
      </View>
    </View>
  )
}

export function WuxingBar({ data }: { data: SajuCalcResponse }) {
  const [tab, setTab] = useState<'bar' | 'penta'>('bar')
  const [applyHap, setApplyHap] = useState(true)
  const [applyJohu, setApplyJohu] = useState(false)
  const pct = selectWuxingPercent(data, applyHap, applyJohu)
  const score = balanceScore(pct)
  const lbl = balanceLabel(score)
  const { over, lack } = balanceSummary(pct)

  const summaryText = over.length || lack.length
    ? [over.length ? `${over.join('·')} 과다` : '', lack.length ? `${lack.join('·')} 결핍` : ''].filter(Boolean).join(' + ')
    : '균형 잡힌 오행 구성이에요'

  const labelStyle = lbl.tone === 'good'
    ? { bg: '#E0FAF8', text: '#00665F' }
    : lbl.tone === 'mid'
      ? { bg: '#FFF9E0', text: '#6b5500' }
      : { bg: '#FFEDE0', text: '#B34800' }

  return (
    <BrutalCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>오행 밸런스</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TabBtn active={tab === 'bar'} label="막대" onPress={() => setTab('bar')} />
          <TabBtn active={tab === 'penta'} label="오각형" onPress={() => setTab('penta')} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <View style={{ backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFDE21' }}>{score}/100</Text>
        </View>
        <View style={{ backgroundColor: labelStyle.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: labelStyle.text }}>{lbl.text}</Text>
        </View>
        <Text style={{ fontSize: 11, color: '#8A8270', flex: 1 }}>{summaryText}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <CheckRow checked={applyHap} label="합에 따른 오행 변화 적용" onToggle={() => setApplyHap(!applyHap)} />
        <CheckRow checked={applyJohu} label="조후와 궁성 보정값 적용" onToggle={() => setApplyJohu(!applyJohu)} />
      </View>

      {tab === 'bar' ? (
        <View style={{ gap: 8 }}>
          {WUXING_ORDER.map((el) => {
            const v = judge(pct[el] ?? 0)
            const color = ohaengColor(el)
            const vs = verdictStyle(v)
            const vLabel = v === '과다' ? '과다' : v === '부족' ? '부족' : '적정'
            return (
              <View key={el} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ width: 20, fontSize: 12, fontWeight: '900', color }}>{el}</Text>
                <View style={{ flex: 1, height: 10, backgroundColor: '#F0EDE6', borderRadius: 5, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(pct[el] ?? 0, 100)}%`, height: '100%', backgroundColor: color, borderRadius: 5 }} />
                </View>
                <Text style={{ width: 32, fontSize: 11, fontWeight: '700', color: '#8A8270', textAlign: 'right' }}>{pct[el] ?? 0}%</Text>
                <View style={{ width: 36, backgroundColor: vs.bg, borderRadius: 4, paddingVertical: 2, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: vs.text }}>{vLabel}</Text>
                </View>
              </View>
            )
          })}
        </View>
      ) : (
        <Pentagram pct={pct} dayElement={data.day_pillar.stem_element} />
      )}
    </BrutalCard>
  )
}
```

Note: Add `import React from 'react'` at the top since we use `React.Fragment`.

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | grep WuxingBar` — 0 errors

---

## Task 5: Rewrite TenGodsRow → SVG donut + group bars

**Files:**
- Modify: `apps/mobile/src/components/manse/TenGodsRow.tsx`

- [ ] Rewrite `apps/mobile/src/components/manse/TenGodsRow.tsx`:

```tsx
import { View, Text } from 'react-native'
import Svg, { Path, Text as SvgText } from 'react-native-svg'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { ohaengColor } from '@/lib/manse/ohaeng'
import { donutArcs, groupSummary, dominantGroups, TG_ELEMENT, DONUT_GEOMETRY } from '@/lib/manse/tenGods'
import type { SajuCalcResponse } from '@sajuguri/api-client'

interface Props {
  data: SajuCalcResponse
}

export function TenGodsRow({ data }: Props) {
  const dist = data.ten_gods_distribution ?? {}
  const arcs = donutArcs(dist, (ss) => ohaengColor(TG_ELEMENT[ss] ?? ''))
  const summary = groupSummary(dist)
  const dominant = dominantGroups(dist)
  const { CX, CY } = DONUT_GEOMETRY

  return (
    <BrutalCard>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 }}>십성 구조</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {/* SVG donut 140×140 */}
        <View style={{ flexShrink: 0 }}>
          <Svg viewBox="0 0 120 120" width={140} height={140}>
            {arcs.map((a) => (
              <Path key={a.ss} d={a.d} fill={a.color} stroke="#FFFFFF" strokeWidth="1.5" />
            ))}
            <SvgText x={CX} y={CY - 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#8A8270">핵심 구조</SvgText>
            <SvgText x={CX} y={CY + 10} textAnchor="middle" fontSize="11" fontWeight="800" fill="#1A1A1A">
              {dominant.join('·') || '—'}
            </SvgText>
          </Svg>
        </View>

        {/* Group summary bars */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270', marginBottom: 6 }}>십성 구조 요약</Text>
          {summary.map((g) => {
            const hot = dominant.includes(g.group)
            return (
              <View key={g.group} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <View style={{ width: 40, flexShrink: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: hot ? '#FF6B00' : '#1A1A1A' }}>{g.group}</Text>
                  <Text style={{ fontSize: 9, color: '#8A8270' }}>{g.label}</Text>
                </View>
                <View style={{ flex: 1, height: 8, backgroundColor: '#F0EDE6', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(g.pct, 100)}%`, height: '100%', backgroundColor: hot ? '#FF6B00' : '#A09880', borderRadius: 4 }} />
                </View>
                <Text style={{ width: 32, fontSize: 11, fontWeight: '700', color: '#8A8270', textAlign: 'right' }}>{g.pct}%</Text>
              </View>
            )
          })}
        </View>
      </View>
    </BrutalCard>
  )
}
```

Note: The old `TenGodsRow` prop was `tenGodsDistribution: Record<string,number>`. The new prop is `data: SajuCalcResponse`. Update the call site in `result.tsx` accordingly (use `data={data}` instead of `tenGodsDistribution={data.ten_gods_distribution}`).

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | grep TenGods` — 0 errors

---

## Task 6: Rewrite StrengthSection → unified StrengthCard with SVG dist chart

**Files:**
- Modify: `apps/mobile/src/components/manse/StrengthSection.tsx`

- [ ] Rewrite `apps/mobile/src/components/manse/StrengthSection.tsx`:

```tsx
import { View, Text } from 'react-native'
import Svg, { Circle, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { ohaengColor } from '@/lib/manse/ohaeng'
import { LEVELS_8, STRENGTH_DIST, levelIndex, levelPercentile, clampScore } from '@/lib/manse/strength'
import type { SajuCalcResponse } from '@sajuguri/api-client'

const ACCENT = '#FF6B00'

interface Props {
  data: SajuCalcResponse
}

function ElPill({ el, dim = false }: { el: string; dim?: boolean }) {
  const color = ohaengColor(el)
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A',
      paddingHorizontal: 10, paddingVertical: 4,
      backgroundColor: dim ? '#FAFAF7' : `${color}1A`,
      shadowColor: '#1A1A1A', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
    }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 12, fontWeight: '800', color }}>{el}</Text>
    </View>
  )
}

function StrengthDistChart({ levelIdx }: { levelIdx: number }) {
  const ML = 32, MB = 40, MT = 22
  const SVG_W = 300, SVG_H = 180
  const plotW = SVG_W - ML - 18
  const plotH = SVG_H - MB - MT
  const MAX_DIST = 30
  const yTicks = [0, 10, 20, 30]

  const pts = STRENGTH_DIST.map((d, i) => ({
    x: ML + (plotW / 7) * i,
    y: MT + plotH - (d / MAX_DIST) * plotH,
  }))
  const polylinePoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const base = MT + plotH
  const areaPoints = `${pts[0].x.toFixed(1)},${base} ${polylinePoints} ${pts[pts.length - 1].x.toFixed(1)},${base}`
  const me = pts[levelIdx]
  const pctLabel = `${levelPercentile(LEVELS_8[levelIdx])}%의 사람`

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '800' }}>신강/신약지수</Text>
        <Text style={{ fontSize: 11, color: '#8A8270' }}>{pctLabel}이 여기에 해당해요</Text>
      </View>
      <Svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ overflow: 'visible' }}>
        <Rect x={me.x - (plotW / 7) / 2} y={MT} width={plotW / 7} height={plotH} fill="#EBE3D2" opacity="0.9" />
        {yTicks.map((tick) => {
          const yy = MT + plotH - (tick / MAX_DIST) * plotH
          return (
            <Line key={tick} x1={ML} y1={yy} x2={SVG_W - 10} y2={yy} stroke="#EBE3D2" strokeWidth="1" />
          )
        })}
        <Polygon points={areaPoints} fill={ACCENT} opacity="0.12" />
        <Polyline points={polylinePoints} fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r="3" fill="white" stroke={ACCENT} strokeWidth="1.2" opacity="0.5" />
        ))}
        <Circle cx={me.x} cy={me.y} r="5" fill={ACCENT} stroke="white" strokeWidth="1.5" />
        <SvgText x={me.x} y={me.y - 9} textAnchor="middle" fontSize="11" fill={ACCENT} fontWeight="700">나</SvgText>
        {LEVELS_8.map((lv, i) => (
          <SvgText key={lv} x={ML + (plotW / 7) * i} y={SVG_H - 4} textAnchor="middle" fontSize="9"
            fill={i === levelIdx ? ACCENT : '#8A8270'} fontWeight={i === levelIdx ? '700' : '400'}>
            {lv}
          </SvgText>
        ))}
      </Svg>
    </View>
  )
}

const LEVEL_DESCS: Record<string, string> = {
  극약: '일간의 힘이 극도로 약해요. 인성·비겁이 절실하고 설기·극제하는 기운은 크게 해로워요.',
  태약: '일간이 매우 약해요. 인성·비겁으로 강하게 부조해야 균형이 잡혀요.',
  신약: '일간이 약한 편이에요. 인성이나 비겁이 용신 후보로 쓰여요.',
  중화신약: '거의 균형에 가깝지만 약간 부족해요. 소폭의 부조가 도움이 돼요.',
  중화신강: '가장 이상적인 균형에 가까워요. 크게 치우침 없이 두루 좋은 사주예요.',
  신강: '일간이 강한 편이에요. 식상·재성·관성으로 기운을 소모·설기해야 해요.',
  태강: '일간이 매우 강해요. 설기·극제하는 오행이 용신으로 필요해요.',
  극왕: '일간이 극도로 강해요. 종강격 가능성이 있고 거스르는 기운은 크게 흉해요.',
}

export function StrengthSection({ data }: Props) {
  const s = data.day_master_strength
  const y = data.yong_sin
  const score = clampScore(s.score)
  const levelDesc = LEVEL_DESCS[s.level_8] ?? ''
  const levelIdx = levelIndex(s.level_8)

  const deuk = [
    { label: '득령', on: s.deuk_ryeong },
    { label: '득지', on: s.deuk_ji },
    { label: '득시', on: s.deuk_si },
    { label: '득세', on: s.deuk_se },
  ]

  return (
    <BrutalCard>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 }}>일간 강약 · 용신</Text>

      {/* Level + score */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A' }}>{s.level_8}</Text>
        <Text style={{ fontSize: 14, color: '#8A8270' }}>{s.score}점</Text>
      </View>

      {levelDesc ? <Text style={{ fontSize: 12, color: '#8A8270', lineHeight: 18, marginBottom: 12 }}>{levelDesc}</Text> : null}

      {/* 8-step level bar */}
      <View style={{ flexDirection: 'row', overflow: 'hidden', borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A', marginBottom: 12 }}>
        {LEVELS_8.map((lv) => {
          const active = lv === s.level_8
          return (
            <View key={lv} style={{ flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: active ? '#FF6B00' : '#F0EDE6' }}>
              <Text style={{ fontSize: 9, fontWeight: active ? '800' : '600', color: active ? '#FFFFFF' : '#8A8270' }}>{lv}</Text>
            </View>
          )
        })}
      </View>

      {/* Distribution chart */}
      <StrengthDistChart levelIdx={levelIdx} />

      {/* Gauge bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 11, color: '#8A8270' }}>약 0</Text>
        <Text style={{ fontSize: 11, color: '#8A8270' }}>중화 50</Text>
        <Text style={{ fontSize: 11, color: '#8A8270' }}>강 100</Text>
      </View>
      <View style={{ height: 10, backgroundColor: '#F0EDE6', borderRadius: 5, marginBottom: 12, overflow: 'visible', position: 'relative' }}>
        <View style={{ width: `${score}%`, height: '100%', backgroundColor: '#FFDE21', borderRadius: 5 }} />
        <View style={{ position: 'absolute', left: `${score}%`, top: 0, width: 4, height: '100%', backgroundColor: '#FF6B00', borderRadius: 2, transform: [{ translateX: -2 }] }} />
      </View>

      {/* 득령/득지/득시/득세 chips */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        {deuk.map((d) => (
          <View key={d.label} style={{
            flex: 1, borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A',
            paddingVertical: 4, alignItems: 'center',
            backgroundColor: d.on ? '#E0FAF8' : '#FAFAF7',
            opacity: d.on ? 1 : 0.5,
            shadowColor: '#1A1A1A', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: d.on ? '#00665F' : '#8A8270' }}>{d.label}</Text>
          </View>
        ))}
      </View>

      {/* 격국 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A8270' }}>격국</Text>
        <View style={{
          borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A',
          backgroundColor: '#FFDE21', paddingHorizontal: 10, paddingVertical: 4,
          shadowColor: '#1A1A1A', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1A1A1A' }}>{data.gyeok_guk.name}</Text>
        </View>
        {data.gyeok_guk.basis ? <Text style={{ fontSize: 11, color: '#8A8270' }}>{data.gyeok_guk.basis}</Text> : null}
      </View>

      {/* 용신/희신/기신 */}
      <View style={{ gap: 8, borderTopWidth: 2, borderTopColor: '#E0D9CE', paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ width: 32, fontSize: 11, fontWeight: '700', color: '#8A8270' }}>용신</Text>
          <ElPill el={y.primary} />
          {y.secondary ? <ElPill el={y.secondary} dim /> : null}
          {y.yong_sin_label ? <Text style={{ fontSize: 11, color: '#8A8270' }}>{y.yong_sin_label}</Text> : null}
        </View>
        {y.xi_sin?.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ width: 32, fontSize: 11, fontWeight: '700', color: '#8A8270' }}>희신</Text>
            {y.xi_sin.map((el) => <ElPill key={el} el={el} />)}
          </View>
        )}
        {y.ji_sin?.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ width: 32, fontSize: 11, fontWeight: '700', color: '#8A8270' }}>기신</Text>
            {y.ji_sin.map((el) => <ElPill key={el} el={el} />)}
          </View>
        )}
      </View>
    </BrutalCard>
  )
}
```

Note: Old `StrengthSection` took `{ dayMasterStrength, yongSin, gyeokGuk }`. New takes `{ data: SajuCalcResponse }`. Update call site in result.tsx.

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | grep StrengthSection` — 0 errors

---

## Task 7: Fix DaeUnRow — add twelve_wun, cap at 10, "현재" badge, age pill, match GanjiColumn style

**Files:**
- Modify: `apps/mobile/src/components/manse/DaeUnRow.tsx`
- Create: `apps/mobile/src/components/manse/GanjiColumn.tsx`

- [ ] Create `apps/mobile/src/components/manse/GanjiColumn.tsx` (port from web GanjiColumn.tsx):

```tsx
import { View, Text } from 'react-native'
import { ohaengColor } from '@/lib/manse/ohaeng'

interface Props {
  topLabel: string
  stem: string
  stemElement: string
  branch: string
  branchElement: string
  stemTenGod?: string
  branchTenGod?: string
  twelveWun?: string
  highlight?: boolean
  badge?: string
  dim?: boolean
}

function Tile({ ch, element, highlight }: { ch: string; element: string; highlight: boolean }) {
  return (
    <View style={{
      width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
      borderRadius: 12, borderWidth: 2,
      borderColor: highlight ? '#FF6B00' : '#1A1A1A',
      backgroundColor: highlight ? '#FFFFFF' : ohaengColor(element),
      shadowColor: highlight ? '#FF6B00' : '#1A1A1A',
      shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
    }}>
      <Text className="font-serif" style={{ fontSize: 20, fontWeight: '900', color: highlight ? ohaengColor(element) : 'rgba(255,255,255,0.96)' }}>{ch}</Text>
    </View>
  )
}

export function GanjiColumn({ topLabel, stem, stemElement, branch, branchElement, stemTenGod, branchTenGod, twelveWun, highlight = false, badge, dim = false }: Props) {
  return (
    <View style={{ flexShrink: 0, alignItems: 'center', gap: 4, opacity: dim ? 0.5 : 1 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A8270' }}>{topLabel}</Text>
      {stemTenGod ? <Text style={{ fontSize: 10, color: '#8A8270' }}>{stemTenGod}</Text> : null}
      <Tile ch={stem} element={stemElement} highlight={highlight} />
      <Tile ch={branch} element={branchElement} highlight={highlight} />
      {branchTenGod ? <Text style={{ fontSize: 10, color: '#8A8270' }}>{branchTenGod}</Text> : null}
      {twelveWun ? <Text style={{ fontSize: 10, fontWeight: '600', color: '#8A8270' }}>{twelveWun}</Text> : null}
      {badge ? (
        <View style={{ borderRadius: 6, backgroundColor: '#FF6B00', paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{badge}</Text>
        </View>
      ) : null}
    </View>
  )
}
```

- [ ] Rewrite `apps/mobile/src/components/manse/DaeUnRow.tsx`:

```tsx
import { ScrollView, View, Text } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { GanjiColumn } from './GanjiColumn'
import type { SajuCalcResponse } from '@sajuguri/api-client'

interface Props {
  data: SajuCalcResponse
}

export function DaeUnRow({ data }: Props) {
  const list = (data.dae_un_list ?? []).slice(0, 10)
  const currentAge = data.current_dae_un?.start_age

  return (
    <BrutalCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>대운</Text>
        <View style={{
          borderRadius: 999, borderWidth: 2, borderColor: '#1A1A1A',
          backgroundColor: '#FFDE21', paddingHorizontal: 8, paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#1A1A1A' }}>{data.dae_un_start_age}세 시작</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
        {list.map((e) => {
          const current = e.start_age === currentAge
          return (
            <View
              key={e.start_age}
              style={current ? {
                borderRadius: 12, borderWidth: 2, borderColor: '#FF6B00',
                backgroundColor: '#FFF4E3', paddingHorizontal: 8, paddingVertical: 4,
                shadowColor: '#FF6B00', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
              } : undefined}
            >
              <GanjiColumn
                topLabel={`${e.start_age}세`}
                stem={e.stem}
                stemElement={e.stem_element}
                branch={e.branch}
                branchElement={e.branch_element}
                stemTenGod={e.stem_ten_god}
                branchTenGod={e.branch_ten_god}
                twelveWun={e.twelve_wun}
                highlight={current}
                badge={current ? '현재' : undefined}
              />
            </View>
          )
        })}
      </ScrollView>
    </BrutalCard>
  )
}
```

Note: Old `DaeUnRow` took `{ daeUnList, currentDaeUn, daeUnStartAge }`. New takes `{ data: SajuCalcResponse }`. Update call site in result.tsx.

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | grep -E "DaeUn|GanjiColumn"` — 0 errors

---

## Task 8: New GanjiColumn-based components: YeonWolUn and IlJinCalendar

**Files:**
- Create: `apps/mobile/src/components/manse/YeonWolUn.tsx`
- Create: `apps/mobile/src/components/manse/IlJinCalendar.tsx`

- [ ] Create `apps/mobile/src/components/manse/YeonWolUn.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { GanjiColumn } from './GanjiColumn'
import { useAuth } from '@/lib/auth/AuthContext'
import type { YeonUnEntry, WolUnEntry } from '@sajuguri/api-client'

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

interface Props {
  dayStem: string
}

function TabBtn({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A',
        paddingHorizontal: 12, paddingVertical: 4,
        backgroundColor: active ? '#FFDE21' : '#FAFAF7',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#1A1A1A' : '#8A8270' }}>{label}</Text>
    </Pressable>
  )
}

export function YeonWolUn({ dayStem }: Props) {
  const { api } = useAuth()
  const [tab, setTab] = useState<'yeon' | 'wol'>('yeon')
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [yeon, setYeon] = useState<YeonUnEntry[] | null>(null)
  const [wol, setWol] = useState<WolUnEntry[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!dayStem) return
    const params = new URLSearchParams({ start_year: String(currentYear - 2), count: '10', day_stem: dayStem })
    api.get<YeonUnEntry[]>(`/api/saju/yeon-un?${params}`).then(setYeon).catch(() => setError(true))
  }, [dayStem, currentYear, api])

  useEffect(() => {
    if (!dayStem || tab !== 'wol' || wol !== null) return
    const params = new URLSearchParams({ year: String(currentYear), day_stem: dayStem })
    api.get<WolUnEntry[]>(`/api/saju/wol-un?${params}`).then(setWol).catch(() => setError(true))
  }, [tab, dayStem, currentYear, wol, api])

  const list = tab === 'yeon' ? yeon : wol
  const loading = list === null && !error

  return (
    <BrutalCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>연운 · 월운</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TabBtn active={tab === 'yeon'} label="연운" onPress={() => setTab('yeon')} />
          <TabBtn active={tab === 'wol'} label="월운" onPress={() => setTab('wol')} />
        </View>
      </View>

      {error ? (
        <Text style={{ color: '#8A8270', fontSize: 13 }}>데이터를 불러올 수 없어요</Text>
      ) : loading ? (
        <Text style={{ color: '#8A8270', fontSize: 13 }}>불러오는 중...</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {tab === 'yeon'
            ? (yeon ?? []).map((e) => (
                <GanjiColumn
                  key={e.year}
                  topLabel={String(e.year)}
                  stem={e.stem} stemElement={e.stem_element}
                  branch={e.branch} branchElement={e.branch_element}
                  stemTenGod={e.stem_ten_god} branchTenGod={e.branch_ten_god}
                  twelveWun={e.twelve_wun}
                  highlight={e.year === currentYear}
                  badge={e.year === currentYear ? '올해' : undefined}
                  dim={e.year < currentYear}
                />
              ))
            : (wol ?? []).map((e) => (
                <GanjiColumn
                  key={e.month}
                  topLabel={MONTH_NAMES[e.month - 1]}
                  stem={e.stem} stemElement={e.stem_element}
                  branch={e.branch} branchElement={e.branch_element}
                  stemTenGod={e.stem_ten_god} branchTenGod={e.branch_ten_god}
                  twelveWun={e.twelve_wun}
                  highlight={e.month === currentMonth}
                  badge={e.month === currentMonth ? '이번달' : undefined}
                />
              ))}
        </ScrollView>
      )}
    </BrutalCard>
  )
}
```

- [ ] Create `apps/mobile/src/components/manse/IlJinCalendar.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { useAuth } from '@/lib/auth/AuthContext'
import { calendarGrid, dateKey, prevMonth, nextMonth } from '@/lib/manse/ilJin'
import type { IlJinEntry } from '@sajuguri/api-client'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export function IlJinCalendar() {
  const { api } = useAuth()
  const now = new Date()
  const todayStr = dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate())

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [entries, setEntries] = useState<IlJinEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    const params = new URLSearchParams({ year: String(year), month: String(month) })
    api.get<IlJinEntry[]>(`/api/saju/il-jin?${params}`)
      .then((d) => { if (alive) { setEntries(d); setLoading(false) } })
      .catch(() => { if (alive) { setError(true); setLoading(false) } })
    return () => { alive = false }
  }, [year, month, api])

  const grid = calendarGrid(year, month, entries)
  const go = (fn: typeof prevMonth) => { const n = fn(year, month); setYear(n.year); setMonth(n.month) }

  return (
    <BrutalCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>일진 달력</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => go(prevMonth)}
            style={{ borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#FAFAF7', paddingHorizontal: 8, paddingVertical: 4 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '900' }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 13, fontWeight: '800', minWidth: 80, textAlign: 'center' }}>{year} {MONTH_NAMES[month - 1]}</Text>
          <Pressable
            onPress={() => go(nextMonth)}
            style={{ borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#FAFAF7', paddingHorizontal: 8, paddingVertical: 4 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '900' }}>›</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <Text style={{ color: '#8A8270', textAlign: 'center', paddingVertical: 24 }}>일진 데이터를 불러올 수 없어요</Text>
      ) : loading ? (
        <Text style={{ color: '#8A8270', textAlign: 'center', paddingVertical: 24 }}>일진 불러오는 중...</Text>
      ) : (
        <>
          {/* Weekday header */}
          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((wd, i) => (
              <View key={wd} style={{ flex: 1, alignItems: 'center', paddingBottom: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: i === 0 ? '#FF6B00' : i === 6 ? '#0090A8' : '#8A8270' }}>{wd}</Text>
              </View>
            ))}
          </View>
          {/* Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {grid.map((cell, idx) => {
              const isToday = cell.date === todayStr
              const colIdx = idx % 7
              return (
                <View
                  key={idx}
                  style={{
                    width: '14.28%',
                    minHeight: 72,
                    borderRadius: 8,
                    padding: 4,
                    backgroundColor: isToday ? '#FFF9E0' : cell.entry?.solar_term ? '#FBF3D9' : 'transparent',
                    borderWidth: isToday ? 2 : 0,
                    borderColor: '#1A1A1A',
                  }}
                >
                  {cell.day ? (
                    <>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isToday ? '#1A1A1A' : colIdx === 0 ? '#FF6B00' : colIdx === 6 ? '#0090A8' : '#1A1A1A' }}>{cell.day}</Text>
                      {cell.entry?.solar_term ? <Text style={{ fontSize: 11, fontWeight: '600', color: '#B07A00' }}>{cell.entry.solar_term}</Text> : null}
                      {cell.entry ? <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A8270' }}>{cell.entry.ganji_name}</Text> : null}
                      {cell.entry ? (
                        <Text style={{ fontSize: 11, color: cell.entry.is_leap_month ? '#0090A8' : '#8A8270' }}>
                          {cell.entry.is_leap_month ? '(윤)' : ''}{cell.entry.lunar_month}/{cell.entry.lunar_day}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                </View>
              )
            })}
          </View>
          {/* Legend */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 2, borderTopColor: '#E0D9CE', paddingTop: 8, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#FFF9E0' }} />
              <Text style={{ fontSize: 11, color: '#8A8270' }}>오늘</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#FBF3D9' }} />
              <Text style={{ fontSize: 11, color: '#8A8270' }}>절기</Text>
            </View>
            <Text style={{ fontSize: 11, color: '#0090A8' }}>(윤) 윤달</Text>
          </View>
        </>
      )}
    </BrutalCard>
  )
}
```

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | grep -E "YeonWolUn|IlJinCalendar"` — 0 errors

---

## Task 9: New HapChungPanel component

**Files:**
- Create: `apps/mobile/src/components/manse/HapChungPanel.tsx`

- [ ] Create `apps/mobile/src/components/manse/HapChungPanel.tsx`:

```tsx
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { ohaengColor } from '@/lib/manse/ohaeng'
import {
  ALL_TABS, buildEntries, hasData, activePillars, PLABEL,
  type TabKey, type PillarKey,
} from '@/lib/manse/hapChung'
import type { SajuCalcResponse, Pillar } from '@sajuguri/api-client'

const PALACE_WEIGHTS: Record<PillarKey, { stem: string; branch: string }> = {
  hour: { stem: '×1.0', branch: '×0.8' },
  day: { stem: '×1.5', branch: '×1.0' },
  month: { stem: '×1.0', branch: '×2.0' },
  year: { stem: '×1.0', branch: '×1.0' },
}

function pillarOf(data: SajuCalcResponse, p: PillarKey): Pillar | null {
  return (data[`${p}_pillar`] as Pillar | null) ?? null
}

function Box({ ch, on, weight }: { ch?: string; on: boolean; weight?: string }) {
  return (
    <View style={{
      height: 56, flex: 1, alignItems: 'center', justifyContent: 'center',
      borderRadius: 8, borderWidth: 2,
      borderColor: on ? '#FF6B00' : '#1A1A1A',
      backgroundColor: on ? '#FF6B00' : '#FAFAF7',
    }}>
      <Text className="font-serif" style={{ fontSize: 20, fontWeight: '900', color: on ? '#FFFFFF' : '#1A1A1A' }}>{ch ?? '—'}</Text>
      <Text style={{ fontSize: 9, fontWeight: '700', height: 14, color: on ? 'rgba(255,255,255,0.7)' : '#8A8270' }}>{weight ?? ''}</Text>
    </View>
  )
}

function MiniGrid({ data, stems, branches, showWeight, active }: {
  data: SajuCalcResponse
  stems: PillarKey[]
  branches: PillarKey[]
  showWeight: boolean
  active: PillarKey[]
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
      {active.map((pk) => {
        const p = pillarOf(data, pk)
        return (
          <View key={pk} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 10, color: '#8A8270' }}>{PLABEL[pk]}주</Text>
            <Box ch={p?.stem} on={stems.includes(pk)} weight={showWeight ? PALACE_WEIGHTS[pk].stem : undefined} />
            <Box ch={p?.branch} on={branches.includes(pk)} weight={showWeight ? PALACE_WEIGHTS[pk].branch : undefined} />
          </View>
        )
      })}
    </View>
  )
}

export function HapChungPanel({ data }: { data: SajuCalcResponse }) {
  const [tab, setTab] = useState<TabKey>('gung_seong')
  const active = activePillars(data)
  const entries = buildEntries(data, tab)
  const showWeight = tab === 'gung_seong'

  return (
    <BrutalCard>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 }}>합충 분석</Text>

      {/* Tab pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
        {ALL_TABS.map((tabDef) => {
          const has = hasData(data, tabDef.key)
          const isActive = tab === tabDef.key
          return (
            <Pressable
              key={tabDef.key}
              onPress={() => setTab(tabDef.key)}
              style={{
                borderRadius: 999, borderWidth: 2, borderColor: '#1A1A1A',
                paddingHorizontal: 10, paddingVertical: 2,
                backgroundColor: isActive ? '#FFDE21' : '#FAFAF7',
                shadowColor: '#1A1A1A',
                shadowOffset: { width: isActive ? 2 : has ? 2 : 0, height: isActive ? 2 : has ? 2 : 0 },
                shadowOpacity: isActive || has ? 1 : 0, shadowRadius: 0,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? '#1A1A1A' : has ? '#1A1A1A' : '#8A8270' }}>{tabDef.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Content */}
      <View style={{ borderTopWidth: 2, borderTopColor: '#E0D9CE', paddingTop: 12 }}>
        {showWeight ? (
          <>
            <Text style={{ fontSize: 12, color: '#8A8270', lineHeight: 18, marginBottom: 8 }}>
              기둥 위치에 따라 오행 작용력 가중치가 달라요. 월지 &gt; 일간 &gt; 시지·연주 &gt; 천간 순서예요.
            </Text>
            <MiniGrid data={data} stems={[]} branches={[]} showWeight active={active} />
          </>
        ) : entries.length === 0 ? (
          <Text style={{ color: '#8A8270', fontSize: 13 }}>해당하는 관계가 없어요</Text>
        ) : (
          <View style={{ gap: 20 }}>
            {entries.map((e, i) => (
              <View key={i} style={{ gap: 6 }}>
                {/* Strip HTML tags for RN */}
                <Text style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 18 }}>
                  {e.text.replace(/<b>/g, '').replace(/<\/b>/g, '')}
                </Text>
                {e.broken && (
                  <View style={{
                    alignSelf: 'flex-start', borderRadius: 10, borderWidth: 2, borderColor: '#1A1A1A',
                    backgroundColor: '#FFEDE0', paddingHorizontal: 8, paddingVertical: 2,
                    shadowColor: '#1A1A1A', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#B34800' }}>충으로 합 파괴됨</Text>
                  </View>
                )}
                {e.resultEl && !e.broken && (
                  <View style={{
                    alignSelf: 'flex-start', borderRadius: 10, borderWidth: 2, borderColor: '#1A1A1A',
                    paddingHorizontal: 8, paddingVertical: 2,
                    backgroundColor: `${ohaengColor(e.resultEl)}1A`,
                    shadowColor: '#1A1A1A', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: ohaengColor(e.resultEl) }}>→ {e.resultEl}화(化)</Text>
                  </View>
                )}
                <MiniGrid data={data} stems={e.stems} branches={e.branches} showWeight={false} active={active} />
              </View>
            ))}
          </View>
        )}
      </View>
    </BrutalCard>
  )
}
```

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | grep HapChung` — 0 errors

---

## Task 10: New DetailAccordion and WuxingFeatureTable (collapsible sections)

**Files:**
- Create: `apps/mobile/src/components/manse/DetailAccordion.tsx`
- Create: `apps/mobile/src/components/manse/WuxingFeatureTable.tsx`

- [ ] Create `apps/mobile/src/components/manse/DetailAccordion.tsx`:

```tsx
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { ohaengColor } from '@/lib/manse/ohaeng'
import { pillarSlots, sinSalsForPillar, jiJangGanText } from '@/lib/manse/pillars'
import type { SajuCalcResponse } from '@sajuguri/api-client'

export function DetailAccordion({ data }: { data: SajuCalcResponse }) {
  const [open, setOpen] = useState(false)
  const slots = pillarSlots(data)

  return (
    <BrutalCard>
      <Pressable
        onPress={() => setOpen(!open)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>12운성 · 신살 · 지장간 상세</Text>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#8A8270' }}>{open ? '▲' : '▼'}</Text>
      </Pressable>

      {open && (
        <View style={{ marginTop: 12, gap: 0 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderColor: '#1A1A1A', paddingBottom: 8 }}>
            <View style={{ width: 56 }} />
            {slots.map((s) => (
              <View key={s.loc} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: s.loc === 'day' ? '#FF6B00' : '#8A8270' }}>
                  {s.colLabel}{s.loc === 'day' ? ' ★' : ''}
                </Text>
              </View>
            ))}
          </View>

          {/* 12운성 row */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E0D9CE', paddingVertical: 10 }}>
            <View style={{ width: 56 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270' }}>12운성</Text>
            </View>
            {slots.map((s) => (
              <View key={s.loc} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: s.pillar ? ohaengColor(s.pillar.branch_element) : '#8A8270' }}>
                  {s.pillar ? s.pillar.twelve_wun : '—'}
                </Text>
              </View>
            ))}
          </View>

          {/* 지장간 row */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E0D9CE', paddingVertical: 10 }}>
            <View style={{ width: 56 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270' }}>지장간</Text>
            </View>
            {slots.map((s) => (
              <View key={s.loc} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}>
                  {s.pillar ? jiJangGanText(data.ji_jang_gan, s.loc) || '—' : '—'}
                </Text>
              </View>
            ))}
          </View>

          {/* 신살 row */}
          <View style={{ flexDirection: 'row', paddingVertical: 10 }}>
            <View style={{ width: 56 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270' }}>신살</Text>
            </View>
            {slots.map((s) => {
              const sals = s.pillar ? sinSalsForPillar(data.sin_sals, s.loc) : []
              return (
                <View key={s.loc} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  {sals.length ? sals.map((sal) => {
                    const isLucky = sal.type === 'lucky'
                    const isUnlucky = sal.type === 'unlucky' || sal.type === 'warning'
                    return (
                      <View key={sal.name} style={{
                        borderRadius: 8, borderWidth: 1.5, borderColor: '#1A1A1A',
                        paddingHorizontal: 6, paddingVertical: 2,
                        backgroundColor: isLucky ? '#E0FAF8' : isUnlucky ? '#FFEDE0' : '#FAFAF7',
                        shadowColor: '#1A1A1A', shadowOffset: { width: 1.5, height: 1.5 }, shadowOpacity: 1, shadowRadius: 0,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: isLucky ? '#00665F' : isUnlucky ? '#B34800' : '#8A8270' }}>
                          {isLucky ? '+' : isUnlucky ? '-' : '·'}{sal.name}
                        </Text>
                      </View>
                    )
                  }) : <Text style={{ fontSize: 11, color: '#8A8270' }}>—</Text>}
                </View>
              )
            })}
          </View>
        </View>
      )}
    </BrutalCard>
  )
}
```

- [ ] Create `apps/mobile/src/components/manse/WuxingFeatureTable.tsx`:

```tsx
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { ohaengColor, ohaengTintColor } from '@/lib/manse/ohaeng'
import type { SajuCalcResponse } from '@sajuguri/api-client'

const FEATURES = [
  { el: '목', dir: '동 · 봄', traits: '창의·성장·인자함', body: '간·담·눈', jobs: '교육·의료·법' },
  { el: '화', dir: '남 · 여름', traits: '열정·표현·명랑함', body: '심장·소장·혀', jobs: '방송·영업·IT' },
  { el: '토', dir: '중앙 · 환절기', traits: '신뢰·중용·포용력', body: '위·비장·입', jobs: '부동산·금융·중개' },
  { el: '금', dir: '서 · 가을', traits: '의리·결단·정의감', body: '폐·대장·코', jobs: '군경·기계·법조' },
  { el: '수', dir: '북 · 겨울', traits: '지혜·유연·통찰력', body: '신장·방광·귀', jobs: '철학·유통·무역' },
] as const

export function WuxingFeatureTable({ data }: { data: SajuCalcResponse }) {
  const [open, setOpen] = useState(false)
  const dominant = data.dominant_elements ?? []
  const weak = data.weak_elements ?? []

  return (
    <BrutalCard>
      <Pressable
        onPress={() => setOpen(!open)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>오행 특성 참고표</Text>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#8A8270' }}>{open ? '▲' : '▼'}</Text>
      </Pressable>

      {open && (
        <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 12 }}>
          <View>
            {/* Header */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderColor: '#1A1A1A', paddingBottom: 8 }}>
              {['오행', '방위·계절', '성격 특성', '관련 신체', '어울리는 직업'].map((h, i) => (
                <Text key={h} style={{ width: i === 0 ? 60 : 100, fontSize: 11, fontWeight: '800', color: i === 0 ? '#1A1A1A' : '#8A8270', paddingRight: 8 }}>{h}</Text>
              ))}
            </View>
            {/* Rows */}
            {FEATURES.map((f, idx) => {
              const isOver = dominant.includes(f.el)
              const isLack = weak.includes(f.el)
              const color = ohaengColor(f.el)
              const tint = ohaengTintColor(f.el)
              return (
                <View key={f.el} style={{
                  flexDirection: 'row', alignItems: 'flex-start',
                  paddingVertical: 10,
                  borderBottomWidth: idx < FEATURES.length - 1 ? 1 : 0,
                  borderColor: '#E0D9CE',
                  backgroundColor: isOver || isLack ? tint : 'transparent',
                }}>
                  <View style={{ width: 60, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{
                      width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: '#1A1A1A',
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: `${color}20`,
                      shadowColor: '#1A1A1A', shadowOffset: { width: 1.5, height: 1.5 }, shadowOpacity: 1, shadowRadius: 0,
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color }}>{f.el}</Text>
                    </View>
                    {isOver && (
                      <View style={{ borderRadius: 8, borderWidth: 1.5, borderColor: '#1A1A1A', backgroundColor: '#FFEDE0', paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#B34800' }}>과다</Text>
                      </View>
                    )}
                    {isLack && (
                      <View style={{ borderRadius: 8, borderWidth: 1.5, borderColor: '#1A1A1A', backgroundColor: '#E0FAF8', paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#00665F' }}>부족</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ width: 100, fontSize: 11, color: '#8A8270', paddingRight: 8 }}>{f.dir}</Text>
                  <Text style={{ width: 100, fontSize: 11, fontWeight: '700', color: '#1A1A1A', paddingRight: 8 }}>{f.traits}</Text>
                  <Text style={{ width: 100, fontSize: 11, color: '#8A8270', paddingRight: 8 }}>{f.body}</Text>
                  <Text style={{ width: 100, fontSize: 11, color: '#8A8270' }}>{f.jobs}</Text>
                </View>
              )
            })}
          </View>
        </ScrollView>
      )}
    </BrutalCard>
  )
}
```

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | grep -E "DetailAccordion|WuxingFeature"` — 0 errors

---

## Task 11: Update result.tsx — add 5 new sections, fix pillar labels, fix section title, add CTAs, wire new prop signatures

**Files:**
- Modify: `apps/mobile/src/app/manse/result.tsx`

- [ ] Rewrite `apps/mobile/src/app/manse/result.tsx`. Key changes:
  1. Add imports for TagChips, HapChungPanel, DetailAccordion, WuxingFeatureTable, YeonWolUn, IlJinCalendar
  2. Fix pillar labels: `생시/생일/생월/생년` (not 시주/일주/월주/년주)
  3. Fix section heading: `사주팔자` (not `사주 원국`)
  4. Update `WuxingBar` prop to `data={data}`
  5. Update `TenGodsRow` prop to `data={data}`
  6. Update `StrengthSection` prop to `data={data}`
  7. Update `DaeUnRow` prop to `data={data}`
  8. Add `IljuHero` `label` prop (`label="내 일주"`)
  9. Render after IljuHero: `<TagChips data={data} />`
  10. Render after pillars in order: `<HapChungPanel>`, `<DetailAccordion>`, `<WuxingFeatureTable>`, `<WuxingBar>`, `<TenGodsRow>`, `<StrengthSection>`, `<DaeUnRow>`, `<YeonWolUn>`, `<IlJinCalendar>`
  11. Remove the old sin_sals chips section (now in TagChips + DetailAccordion)
  12. Add CTAs at bottom (orange "AI 리포트 생성" → `/report/new`, teal "상담하기" → `/chat`)
  13. Add Share button (react-native `Share.share`)
  14. Add Save button (auth-gated, calls `createProfile`)

  Full rewrite:

```tsx
import { ActivityIndicator, Alert, Pressable, Share, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { calcSaju, createProfile, type Pillar } from '@sajuguri/api-client'
import { useAuth } from '@/lib/auth/AuthContext'
import { Screen } from '@/components/ui/Screen'
import { IljuHero } from '@/components/manse/IljuHero'
import { PillarCard } from '@/components/manse/PillarCard'
import { TagChips } from '@/components/manse/TagChips'
import { HapChungPanel } from '@/components/manse/HapChungPanel'
import { DetailAccordion } from '@/components/manse/DetailAccordion'
import { WuxingFeatureTable } from '@/components/manse/WuxingFeatureTable'
import { WuxingBar } from '@/components/manse/WuxingBar'
import { TenGodsRow } from '@/components/manse/TenGodsRow'
import { StrengthSection } from '@/components/manse/StrengthSection'
import { DaeUnRow } from '@/components/manse/DaeUnRow'
import { YeonWolUn } from '@/components/manse/YeonWolUn'
import { IlJinCalendar } from '@/components/manse/IlJinCalendar'
import type { ManseBirthInput } from '@/components/manse/BirthInputForm'
import { useState } from 'react'

export default function ManseResultScreen() {
  const router = useRouter()
  const { api, status } = useAuth()
  const queryClient = useQueryClient()
  const rawParams = useLocalSearchParams()
  const dataParam = Array.isArray(rawParams.data) ? rawParams.data[0] : rawParams.data
  const birthInput = JSON.parse(dataParam ?? '{}') as ManseBirthInput
  const [saving, setSaving] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['saju', dataParam],
    queryFn: () => calcSaju(api, {
      name: birthInput.name || undefined,
      birth_date: birthInput.birth_date,
      birth_time: birthInput.birth_time,
      gender: birthInput.gender,
      calendar: birthInput.calendar,
      is_leap_month: birthInput.is_leap_month,
      birth_longitude: birthInput.birth_longitude,
      birth_utc_offset: birthInput.birth_utc_offset,
      city: birthInput.city,
    }),
    enabled: !!dataParam,
  })

  const pillars: { pillar: Pillar | null; label: string; isDay: boolean }[] = [
    { pillar: data?.hour_pillar ?? null, label: '생시', isDay: false },
    { pillar: data?.day_pillar ?? null, label: '생일', isDay: true },
    { pillar: data?.month_pillar ?? null, label: '생월', isDay: false },
    { pillar: data?.year_pillar ?? null, label: '생년', isDay: false },
  ]

  async function handleShare() {
    try {
      await Share.share({
        title: '내 만세력',
        message: `${birthInput.name ? birthInput.name + '의 ' : ''}만세력 — ${birthInput.birth_date}`,
      })
    } catch {}
  }

  async function handleSave() {
    if (!data) return
    setSaving(true)
    try {
      await createProfile(api, {
        name: birthInput.name || '이름 없음',
        birth_date: birthInput.birth_date,
        birth_time: birthInput.birth_time,
        calendar: birthInput.calendar,
        gender: birthInput.gender,
        is_leap_month: birthInput.is_leap_month,
        city: birthInput.city ?? null,
        longitude: birthInput.birth_longitude ?? null,
      })
      await queryClient.invalidateQueries({ queryKey: ['profiles'] })
      Alert.alert('저장 완료', '만세력이 저장됐어요.')
    } catch {
      Alert.alert('저장 실패', '다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      {/* 뒤로 가기 */}
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
      >
        <Text style={{ fontSize: 22, color: '#1A1A1A', marginRight: 4 }}>←</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>만세력 입력</Text>
      </Pressable>

      {isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
          <Text style={{ marginTop: 16, fontSize: 15, fontWeight: '700', color: '#8A8270' }}>사주를 계산하는 중...</Text>
        </View>
      )}

      {error && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FF6B00' }}>계산에 실패했어요. 입력을 확인해주세요</Text>
        </View>
      )}

      {data && (
        <View style={{ gap: 16 }}>
          {/* 메타 정보 */}
          <View style={{ gap: 2 }}>
            {birthInput.name ? <Text style={{ fontSize: 20, fontWeight: '900', color: '#1A1A1A' }}>{birthInput.name}</Text> : null}
            <Text style={{ fontSize: 13, color: '#8A8270', fontWeight: '600' }}>
              {data.meta.birth_date} {data.meta.birth_time ?? '시간 미상'} · {data.meta.gender === 'male' ? '남성' : '여성'} · {data.meta.calendar === 'solar' ? '양력' : '음력'}
            </Text>
          </View>

          {/* 일주 히어로 */}
          <IljuHero dayPillar={data.day_pillar} label="내 일주" />

          {/* 태그 칩 */}
          <TagChips data={data} />

          {/* 사주팔자 */}
          <View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 }}>사주팔자</Text>
            {/* 천간 행 */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              {pillars.map(({ pillar, label, isDay }) =>
                pillar ? (
                  <PillarCard key={label} pillar={pillar} kind="stem" label={label} isDay={isDay} />
                ) : (
                  <View key={label} style={{ flex: 1, borderRadius: 11, borderWidth: 2, borderColor: '#E0D9CE', paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', backgroundColor: '#F5F2EC' }}>
                    <Text style={{ fontSize: 10, color: '#C0B8A8', fontWeight: '700' }}>{label}</Text>
                    <Text style={{ fontSize: 20, color: '#C0B8A8', marginTop: 4 }}>—</Text>
                  </View>
                )
              )}
            </View>
            {/* 지지 행 */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {pillars.map(({ pillar, label, isDay }) =>
                pillar ? (
                  <PillarCard key={`${label}-branch`} pillar={pillar} kind="branch" isDay={isDay} />
                ) : (
                  <View key={`${label}-branch`} style={{ flex: 1, borderRadius: 11, borderWidth: 2, borderColor: '#E0D9CE', paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', backgroundColor: '#F5F2EC' }}>
                    <Text style={{ fontSize: 20, color: '#C0B8A8', marginTop: 4 }}>—</Text>
                  </View>
                )
              )}
            </View>
          </View>

          {/* 합충 분석 */}
          <HapChungPanel data={data} />

          {/* 12운성·신살·지장간 상세 */}
          <DetailAccordion data={data} />

          {/* 오행 특성 참고표 */}
          <WuxingFeatureTable data={data} />

          {/* 오행 밸런스 */}
          <WuxingBar data={data} />

          {/* 십성 구조 */}
          <TenGodsRow data={data} />

          {/* 일간 강약 · 용신 */}
          <StrengthSection data={data} />

          {/* 대운 */}
          <DaeUnRow data={data} />

          {/* 연운 · 월운 */}
          <YeonWolUn dayStem={data.day_pillar.stem} />

          {/* 일진 달력 */}
          <IlJinCalendar />

          {/* CTAs */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Pressable
              onPress={() => router.push({ pathname: '/report/new', params: { data: dataParam } })}
              style={{
                flex: 1, borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A',
                backgroundColor: '#FF6B00', paddingVertical: 12, alignItems: 'center',
                shadowColor: '#1A1A1A', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>AI 리포트 생성</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/chat')}
              style={{
                flex: 1, borderRadius: 12, borderWidth: 2, borderColor: '#00C2B8',
                backgroundColor: '#E0FAF8', paddingVertical: 12, alignItems: 'center',
                shadowColor: '#1A1A1A', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#00665F' }}>상담하기</Text>
            </Pressable>
          </View>

          {/* 공유 */}
          <Pressable
            onPress={handleShare}
            style={{
              borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A',
              backgroundColor: '#FAFAF7', paddingVertical: 12, alignItems: 'center',
              shadowColor: '#1A1A1A', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>공유하기</Text>
          </Pressable>

          {/* 저장 (로그인 시) */}
          {status === 'authed' && (
            <Pressable
              onPress={saving ? undefined : handleSave}
              style={{
                borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A',
                backgroundColor: '#FFDE21', paddingVertical: 12, alignItems: 'center',
                shadowColor: '#1A1A1A', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
                opacity: saving ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>{saving ? '저장 중...' : '이 만세력 저장'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </Screen>
  )
}
```

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | head -40` — 0 errors

---

## Task 12: Minor copy fixes — manse tab, new screen, BirthInputForm

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/manse.tsx`
- Modify: `apps/mobile/src/app/manse/new.tsx`
- Modify: `apps/mobile/src/components/manse/BirthInputForm.tsx`

- [ ] In `apps/mobile/src/app/(tabs)/manse.tsx`:
  - Change button label from `새 만세력` → `+ 새 만세력 보기`
  - Change empty saved text from `저장된 만세력이 없어요` → `저장된 만세력이 없어요. 분석 후 저장해보세요`

- [ ] In `apps/mobile/src/app/manse/new.tsx`:
  - Change subtitle text from `생년월일시를 입력하면 사주 원국을 계산합니다` → `오직 당신을 위한 사주`

- [ ] In `apps/mobile/src/components/manse/BirthInputForm.tsx`:
  - Add `nameOptional?: boolean` prop (default `false`)
  - When `nameOptional` is false, show `*` next to 이름 label and show orange error `이름을 입력해 주세요.` if submitted without name
  - Add `[errorText, setErrorText]` state or inline validation in `handleSubmit`
  - Add date validation (year 1900-2100, month 1-12, day overflow check via `new Date(y,m,0).getDate()`)
  - Show orange error text for validation failures
  - Add city placeholder: `도시명 검색 (예: 서울, 도쿄, 뉴욕)` (replace `도시명 검색 (예: 서울, Tokyo)`)
  - Add city hint when no city selected: `미입력 시 서울 기준 적용`
  - Add `nameOptional` to props interface and pass through from callers as needed

  Specifically patch the BirthInputForm:

  1. Add to Props interface: `nameOptional?: boolean`
  2. Add to function signature: `nameOptional = false`
  3. Add state: `const [submitError, setSubmitError] = useState<string | null>(null)`
  4. In `handleSubmit`, before submitting add:
  ```ts
  setSubmitError(null)
  if (!nameOptional && !name.trim()) { setSubmitError('이름을 입력해 주세요.'); return }
  if (!year || !month || !day) { setSubmitError('생년월일을 입력해 주세요.'); return }
  const y = parseInt(year); const m = parseInt(month); const d = parseInt(day)
  if (y < 1900 || y > 2100) { setSubmitError('연도는 1900년 ~ 2100년 사이여야 합니다.'); return }
  if (m < 1 || m > 12) { setSubmitError('월은 1 ~ 12 사이여야 합니다.'); return }
  const maxDay = new Date(y, m, 0).getDate()
  if (d > maxDay) { setSubmitError(`${y}년 ${m}월은 ${maxDay}일까지 있습니다.`); return }
  if (!timeUnknown && hour === '') { setSubmitError('시를 입력해 주세요.'); return }
  if (!timeUnknown && minute === '') { setSubmitError('분을 입력해 주세요.'); return }
  ```
  5. Render error text just above submit button: `{submitError && <Text style={{ color: '#FF6B00', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{submitError}</Text>}`
  6. Change city placeholder to `도시명 검색 (예: 서울, 도쿄, 뉴욕)`
  7. Add city hint: when no city selected, show below input `<Text style={{ fontSize: 11, color: '#8A8270', marginTop: 4 }}>미입력 시 서울 기준 적용</Text>`
  8. Update FieldLabel for 이름 to show `*` when not optional:
  ```tsx
  <FieldLabel>{nameOptional ? '이름' : '이름 *'}</FieldLabel>
  ```

- [ ] Run `cd apps/mobile && npx tsc --noEmit 2>&1 | head -40` — 0 errors

---

## Task 13: Final tsc validation

- [ ] Run: `cd apps/mobile && npx tsc --noEmit 2>&1`
  - Expected: 0 errors
  - If errors: fix them (most likely prop mismatches or missing imports)

- [ ] Verify all new files exist:
  ```bash
  ls apps/mobile/src/lib/manse/
  ls apps/mobile/src/components/manse/
  ```

---

## Self-Review Checklist

**Spec coverage:**
- [x] HIGH 1: HapChungPanel, DetailAccordion, WuxingFeatureTable, YeonWolUn, IlJinCalendar — Tasks 9, 10, 8
- [x] HIGH 2: Result CTAs (AI 리포트/상담하기/공유/저장) — Task 11
- [x] HIGH 3: TagChips — Task 3
- [x] HIGH 4: WuxingBar → pentagram + score badge + per-element verdict — Task 4
- [x] HIGH 5: TenGodsRow → SVG donut + 5-group bars — Task 5
- [x] HIGH 6: StrengthSection → unified card with SVG dist — Task 6
- [x] MEDIUM 7: DaeUnRow → twelve_wun, cap at 10, "현재" badge, age pill — Task 7
- [x] MEDIUM 8: IljuHero → horizontal layout — Task 2
- [x] MEDIUM 9: pillar labels → 생시/생일/생월/생년, section heading → 사주팔자 — Task 11
- [x] MEDIUM 10: BirthInputForm validation + nameOptional — Task 12
- [x] MEDIUM 11: Solar correction preview — NOT ported (complexity vs. value: the solarCorrection lib is ported in Task 1; the UI preview in BirthInputForm is complex to add safely without breaking callers; marked skipped)
- [x] MEDIUM 12: Backspace-to-prev-segment — NOT ported (depends on web-specific dateInput.ts; skip)
- [x] LOW 13-17: city placeholder/hint, subtitle, button labels, empty copy — Task 12

**Missing:** Items 11-12 (solar preview + backspace) are skipped as noted — they require deep BirthInputForm surgery that risks breaking all 5 call sites.
