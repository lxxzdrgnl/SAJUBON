# RN Web Parity — My·Home·Records·TabBar·Chip

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring React Native `(tabs)/my.tsx`, `(tabs)/index.tsx`, `src/app/my/*`, `src/components/records/*`, `src/components/TabBar.tsx`, and `src/components/ui/Chip.tsx` to web design parity — exact ko.json copy, no invented strings, no new deps.

**Architecture:** Each task is atomic and independently verifiable. Chip changes are backward-compatible (label stays, children added). Home banner uses react-native-svg LinearGradient (already installed). DeleteModal replaces OS Alert. My page restructured to web rep-hero card + merged chronological feed + `/my/history` route.

**Tech Stack:** React Native 0.81, Expo Router 6, NativeWind 4, react-native-svg 15, TanStack Query 5, @sajuguri/api-client, @sajuguri/design tokens.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/mobile/src/components/ui/Chip.tsx` | **Modify** | Add `children` prop alongside `label`; fix FG lucky/unlucky colors; add default inline-flow margins |
| `apps/mobile/src/components/TabBar.tsx` | **Modify** | Web icon paths (manse=2×2 grid, home=house+door, my=semicircle body); icon size 19; max-w 612 |
| `apps/mobile/src/components/records/RecordFeedCard.tsx` | **Modify** | DeleteModal replacing OS Alert; trash SVG icon; "이름 없음" fallback; ❤ → · separator; type badge labels from ko.json keys |
| `apps/mobile/src/app/(tabs)/my.tsx` | **Modify** | Page heading "마이"; rep hero card (MascotTinted 72px + masked email + ilju string, stem-bg); merged chronological feed (max 4 newest) + "전체 기록 보기 →" link to `/my/history`; edit-mode toggle; login gate with MascotTinted(72) |
| `apps/mobile/src/app/my/history.tsx` | **Create** | Full history page (all records, filter chips, edit-mode delete) — mirrors web `/my/history` |
| `apps/mobile/src/app/(tabs)/index.tsx` | **Modify** | STEM_BANNER → react-native-svg LinearGradient two-stop; 경/신 base `#F2F4F6`; default yellow→orange |

---

## Task 1: Chip — backward-compatible children + color fixes

**Files:**
- Modify: `apps/mobile/src/components/ui/Chip.tsx`

### Context
Web `Chip` takes `children: ReactNode`. Mobile `Chip` takes `label: string`. Many existing callers use `label=`. Must keep `label` working AND add `children` support. Web FG colors: lucky `#00665F`, unlucky `#B34800`. Web adds `mb-2 mr-1.5` inline-flow margins.

- [ ] **Step 1: Read current file (already done above)**

- [ ] **Step 2: Write the new Chip**

Replace the entire content of `apps/mobile/src/components/ui/Chip.tsx` with:

```tsx
import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { BrutalShadow } from './BrutalShadow'
import { brutalShadow, radii } from '@/theme'

// 칩(태그/배지) — 웹 Chip 대응. 2px 잉크 보더 + 2px 미니 그림자.
// children (웹 호환) 또는 label (기존 RN 호환) 중 하나 사용.
type ChipVariant = 'default' | 'lucky' | 'unlucky' | 'yellow'

const BG: Record<ChipVariant, string> = {
  default: 'bg-surface',
  lucky: 'bg-teal-tint',
  unlucky: 'bg-orange-tint',
  yellow: 'bg-yellow',
}
// 웹 Chip FG 정확히 매칭 (lucky=#00665F, unlucky=#B34800)
const FG_CLASS: Record<ChipVariant, string> = {
  default: 'text-ink',
  lucky: 'text-teal-deep',
  unlucky: 'text-orange',
  yellow: 'text-ink',
}
// NativeWind arbitrary color는 동적으로 안 쓰이므로 lucky/unlucky만 style 오버라이드
const FG_COLOR: Partial<Record<ChipVariant, string>> = {
  lucky: '#00665F',
  unlucky: '#B34800',
}

export function Chip({
  label,
  children,
  variant = 'default',
}: {
  label?: string
  children?: ReactNode
  variant?: ChipVariant
}) {
  const content = children ?? label ?? ''
  return (
    <BrutalShadow offset={brutalShadow.offsetSm} radius={radii.chip} style={{ marginBottom: 8, marginRight: 6 }}>
      <View className={`rounded-chip border-2 border-ink px-2.5 py-1 ${BG[variant]}`}>
        {typeof content === 'string' ? (
          <Text
            className={`text-xs font-extrabold ${FG_CLASS[variant]}`}
            style={FG_COLOR[variant] ? { color: FG_COLOR[variant] } : undefined}
          >
            {content}
          </Text>
        ) : (
          <View>{content}</View>
        )}
      </View>
    </BrutalShadow>
  )
}
```

- [ ] **Step 3: Verify callers still work**

Check that existing call sites using `label=` still typecheck. Grep for existing usages:

```bash
cd apps/mobile && grep -r "Chip label=" src/ --include="*.tsx"
```

Expected output: several lines in `my.tsx`, `profiles.tsx`, `manse/TagChips.tsx` etc — all still valid since `label` is still a valid prop.

- [ ] **Step 4: TypeScript check for Chip only**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep "Chip.tsx" | head -20
```

Expected: No errors for Chip.tsx.

---

## Task 2: TabBar — web icon paths, 19px icons, max-w 612

**Files:**
- Modify: `apps/mobile/src/components/TabBar.tsx`

### Context
Web TabBar icons (from `apps/web/components/TabBar.tsx`):
- `home`: `'M3 11 L12 3.5 L21 11 M5.5 9.5 V20 H10 V14.5 H14 V20 H18.5 V9.5'` — house with door/window cutout
- `manse`: `'M4 4 h7 v7 h-7 Z M13 4 h7 v7 h-7 Z M4 13 h7 v7 h-7 Z M13 13 h7 v7 h-7 Z'` — 2×2 grid squares
- `chat`: same as current (unchanged)
- `my`: `'M12 4 a4 4 0 1 1 0 8 a4 4 0 0 1 0-8 M4 20 a8 8 0 0 1 16 0'` — semicircle body

Icon size 19×19. Add max-w 612 cap with centering. Keep existing label strings, focused highlight, safe area logic.

- [ ] **Step 1: Write new TabBar**

Replace entire content of `apps/mobile/src/components/TabBar.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { BrutalShadow } from './ui/BrutalShadow'
import { colors, radii } from '@/theme'

// expo-router Tabs의 tabBar 콜백이 받는 props 중 우리가 쓰는 최소 형태만 로컬 정의.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] }
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }
    navigate: (name: string) => void
  }
}

// 웹 TabBar와 동일한 아이콘 경로 (apps/web/components/TabBar.tsx)
const ICONS: Record<string, string> = {
  index: 'M3 11 L12 3.5 L21 11 M5.5 9.5 V20 H10 V14.5 H14 V20 H18.5 V9.5',
  manse: 'M4 4 h7 v7 h-7 Z M13 4 h7 v7 h-7 Z M4 13 h7 v7 h-7 Z M13 13 h7 v7 h-7 Z',
  chat: 'M4 6 a3 3 0 0 1 3-3 h10 a3 3 0 0 1 3 3 v7 a3 3 0 0 1-3 3 H10 l-4.5 4 v-4 H7 a3 3 0 0 1-3-3 Z',
  my: 'M12 4 a4 4 0 1 1 0 8 a4 4 0 0 1 0-8 M4 20 a8 8 0 0 1 16 0',
}
// ko.json `tab` — 정확히 매칭: 홈/만세력/상담/마이
const LABELS: Record<string, string> = {
  index: '홈',
  manse: '만세력',
  chat: '상담',
  my: '마이',
}

const MAX_W = 612

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets()
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 14 + insets.bottom,
        alignItems: 'center',
      }}
      pointerEvents="box-none"
    >
      <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: 14 }}>
        <BrutalShadow radius={radii.card}>
          <View className="flex-row rounded-2xl border-2 border-ink bg-surface">
            {state.routes.map((route, i) => {
              const focused = state.index === i
              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
              }
              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  className={`flex-1 items-center gap-0.5 rounded-2xl py-2 ${focused ? 'bg-yellow' : ''}`}
                >
                  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                    <Path
                      d={ICONS[route.name] ?? ICONS.index}
                      stroke={focused ? colors.ink : colors.textSub}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text
                    className={`text-[11px] font-extrabold ${focused ? 'text-ink' : 'text-text-sub'}`}
                  >
                    {LABELS[route.name] ?? route.name}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </BrutalShadow>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep "TabBar.tsx" | head -20
```

Expected: No errors for TabBar.tsx.

---

## Task 3: RecordFeedCard — DeleteModal, trash icon, name fallback, separator fix

**Files:**
- Modify: `apps/mobile/src/components/records/RecordFeedCard.tsx`

### Context
- Replace `Alert.alert(...)` pattern with an in-app `DeleteModal` (modal sheet, cancel/confirm buttons) mirroring web `MyRecordsClient.tsx` DeleteModal.
- Delete trigger: trash SVG icon button (not text "삭제").
- `CompatibilityRecordCard` names: replace `' ❤ '` separator with `' · '`; fallback `'이름 없음'` (ko.json `my.records.compatAnon` but we hardcode from ko.json value "익명" — wait, spec says "이름 없음" from ko.json `compatibility.unknownName`). Per ko.json: `compatibility.unknownName = "이름 없음"`. Use that.
- Type badge labels from ko.json (hardcode exact values): reports="리포트", consultation="한줄상담", daily="일진 기록", compatibility="궁합".

- [ ] **Step 1: Write the new RecordFeedCard**

Replace entire content of `apps/mobile/src/components/records/RecordFeedCard.tsx`:

```tsx
import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import Svg, { Path, Polyline } from 'react-native-svg'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { CardIcon, ICON_PATHS } from '@/components/ui/CardIcon'
import type { ReportSummary } from '@sajuguri/api-client'
import type { ConsultationHistoryItem } from '@sajuguri/api-client'
import type { CompatibilityReportSummary } from '@sajuguri/api-client'
import type { DailyRecordSummary } from '@sajuguri/api-client'
import { colors, radii } from '@/theme'
import { BrutalShadow } from '@/components/ui/BrutalShadow'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── 인앱 삭제 확인 모달 (웹 DeleteModal 대응) ─────────────────────────────────

function DeleteModal({
  label,
  onConfirm,
  onClose,
}: {
  label: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'center' }}
        onPress={onClose}
      >
        <Pressable
          onPress={() => {}}
          style={{ width: '100%', maxWidth: 480 }}
        >
          <View className="rounded-t-3xl border-2 border-ink bg-surface p-6">
            {/* 헤더 */}
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[15px] font-extrabold text-ink">이 기록을 삭제할까요?</Text>
              <Pressable
                onPress={onClose}
                className="h-8 w-8 items-center justify-center rounded-full border border-ink"
              >
                <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <Path d="M4 4l8 8M12 4l-8 8" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>

            {/* 삭제 대상 레이블 */}
            <View className="mb-6 rounded-xl border border-ink bg-surface px-4 py-3">
              <Text className="text-[14px] font-bold text-ink" numberOfLines={1}>{label}</Text>
            </View>

            {/* 버튼 행 */}
            <View className="flex-row gap-3">
              <BrutalShadow radius={radii.button} style={{ flex: 1 }}>
                <Pressable
                  onPress={onClose}
                  className="flex-1 items-center rounded-xl border-2 border-ink bg-surface py-3"
                >
                  <Text className="text-sm font-extrabold text-ink">취소</Text>
                </Pressable>
              </BrutalShadow>
              <BrutalShadow radius={radii.button} style={{ flex: 1 }}>
                <Pressable
                  onPress={() => { onConfirm(); onClose() }}
                  className="flex-1 items-center rounded-xl border-2 border-ink bg-ink py-3"
                >
                  <Text className="text-sm font-extrabold text-surface">삭제</Text>
                </Pressable>
              </BrutalShadow>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── 휴지통 아이콘 삭제 버튼 (웹 DeleteIconButton 대응) ────────────────────────

function TrashButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="ml-2 items-center justify-center rounded-xl border-2 border-ink bg-surface p-2"
    >
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="3 6 5 6 21 6" />
        <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <Path d="M10 11v6" />
        <Path d="M14 11v6" />
        <Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </Svg>
    </Pressable>
  )
}

// ── 타입 배지 (ko.json my.records.tab* 키 하드코드) ──────────────────────────

function TypeBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <View className={`self-start rounded-full border border-ink px-2 py-0.5 ${tone}`}>
      <Text className="text-[10px] font-extrabold">{label}</Text>
    </View>
  )
}

// ── 사주 리포트 카드 ──────────────────────────────────────────────────────────

export function SajuRecordCard({
  report,
  onDelete,
}: {
  report: ReportSummary
  onDelete: () => void
}) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <BrutalCard intensity="soft">
        <View className="flex-row items-start">
          <CardIcon d={ICON_PATHS.doc} bg="#FFF0C2" color="#1A1A1A" />
          <View className="ml-3 flex-1">
            <TypeBadge label="리포트" tone="bg-orange text-white" />
            <Text className="mt-1 text-xs font-bold text-text-sub">
              {report.profile_name || '이름 없음'} · {formatDate(report.created_at)}
            </Text>
            <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={2}>
              {report.first_headline}
            </Text>
            {report.request_topics && (
              <Text className="mt-0.5 text-xs text-text-sub" numberOfLines={1}>
                {report.request_topics}
              </Text>
            )}
          </View>
          <TrashButton onPress={() => setShowModal(true)} />
        </View>
      </BrutalCard>
      {showModal && (
        <DeleteModal
          label={report.first_headline}
          onConfirm={onDelete}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// ── 한줄 상담 카드 ────────────────────────────────────────────────────────────

export function ConsultationRecordCard({
  consultation,
  onDelete,
}: {
  consultation: ConsultationHistoryItem
  onDelete: () => void
}) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <BrutalCard intensity="soft">
        <View className="flex-row items-start">
          <CardIcon d={ICON_PATHS.chat} bg="#D6F4F0" color="#1A1A1A" />
          <View className="ml-3 flex-1">
            <TypeBadge label="한줄상담" tone="bg-teal text-white" />
            <Text className="mt-1 text-xs font-bold text-text-sub">
              {consultation.profile_name || '이름 없음'} · {formatDate(consultation.created_at)}
            </Text>
            <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={1}>
              {consultation.headline}
            </Text>
            <Text className="mt-0.5 text-xs text-text-sub" numberOfLines={1}>
              {consultation.question}
            </Text>
          </View>
          <TrashButton onPress={() => setShowModal(true)} />
        </View>
      </BrutalCard>
      {showModal && (
        <DeleteModal
          label={consultation.headline}
          onConfirm={onDelete}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// ── 궁합 리포트 카드 ──────────────────────────────────────────────────────────

export function CompatibilityRecordCard({
  report,
  onDelete,
}: {
  report: CompatibilityReportSummary
  onDelete: () => void
}) {
  // ko.json compatibility.unknownName = "이름 없음"
  const nameA = report.person_a_name || '이름 없음'
  const nameB = report.person_b_name || '이름 없음'
  const names = `${nameA} · ${nameB}`
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <BrutalCard intensity="soft">
        <View className="flex-row items-start">
          <CardIcon d={ICON_PATHS.heart} bg="#FFE8E2" color="#1A1A1A" />
          <View className="ml-3 flex-1">
            <TypeBadge label="궁합" tone="bg-sky text-white" />
            <Text className="mt-1 text-xs font-bold text-text-sub">{formatDate(report.created_at)}</Text>
            <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={1}>{names}</Text>
            <Text className="mt-0.5 text-xs font-bold text-teal-deep">총점 {report.total_score}점</Text>
          </View>
          <TrashButton onPress={() => setShowModal(true)} />
        </View>
      </BrutalCard>
      {showModal && (
        <DeleteModal
          label={names}
          onConfirm={onDelete}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// ── 일진 기록 카드 ────────────────────────────────────────────────────────────

export function DailyRecordCard({
  record,
  onDelete,
}: {
  record: DailyRecordSummary
  onDelete: () => void
}) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <BrutalCard intensity="soft">
        <View className="flex-row items-start">
          <CardIcon d={ICON_PATHS.bolt} bg="#FFFDE8" color="#1A1A1A" />
          <View className="ml-3 flex-1">
            <TypeBadge label="일진 기록" tone="bg-yellow text-ink" />
            <Text className="mt-1 text-xs font-bold text-text-sub">
              {record.profile_name || '이름 없음'} · {record.date}
            </Text>
            <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={1}>
              {record.keyword}
            </Text>
          </View>
          <TrashButton onPress={() => setShowModal(true)} />
        </View>
      </BrutalCard>
      {showModal && (
        <DeleteModal
          label={record.keyword}
          onConfirm={onDelete}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep "RecordFeedCard.tsx" | head -20
```

Expected: No errors.

---

## Task 4: My page — web structure with rep hero card + merged feed + edit mode

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/my.tsx`

### Context
Web structure (`apps/web/app/[locale]/my/page.tsx`):
- Heading: `마이` (ko.json `my.title`)
- Auth gate (unauthenticated): MascotTinted(72) + "로그인이 필요해요" + "구글로 로그인" button
- Rep hero card: stem-bg colored rounded card + MascotTinted(72px inside 80px slot) + profile name + `{day_stem}{day_branch}일주` + masked email (hide chars before @, show domain)
- No profile fallback: soft card with small mascot + "대표 만세력이 없습니다" + "만세력 목록 보기" link + email
- Records section: merged chronological feed (newest first across all 4 types), max 4, + "전체 기록 보기 →" link to `/my/history`; empty state "아직 기록이 없어요" (ko.json `my.records.feedEmpty`)
- Edit toggle button in section header ("편집"/"완료") — ko.json `my.records.editToggle`/`my.records.editDone`
- Logout button at bottom

STEM_BG from `@/lib/ganji` maps stems to bg hex. maskEmail: show only first char + "***@domain".

- [ ] **Step 1: Write the new my.tsx**

Replace entire content of `apps/mobile/src/app/(tabs)/my.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  deleteReport,
  deleteConsultation,
  deleteCompatibilityReport,
  deleteDailyRecord,
} from '@sajuguri/api-client'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { Chip } from '@/components/ui/Chip'
import { MascotTinted } from '@/components/ui/MascotTinted'
import {
  SajuRecordCard,
  ConsultationRecordCard,
  CompatibilityRecordCard,
  DailyRecordCard,
} from '@/components/records/RecordFeedCard'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useProfiles,
  useReports,
  useConsultations,
  useCompatibilityReports,
  useDailyRecords,
} from '@/lib/queries'
import { STEM_BG } from '@/lib/ganji'
import { radii, colors } from '@/theme'

// 이메일 마스킹 — 첫 글자 + ***@도메인
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain || !local) return email
  return `${local[0] ?? ''}***@${domain}`
}

// 일간 줄기 배경색 — ganji.ts STEM_BG 기반 (없으면 yellow)
function stemCardBg(stem: string | null | undefined): string {
  return (stem && STEM_BG[stem]) || '#FFD900'
}

// ── 대표 프로필 히어로 카드 ───────────────────────────────────────────────────

function RepHeroCard({ email }: { email: string }) {
  const { data: profiles = [], isLoading } = useProfiles()
  const router = useRouter()
  const rep = profiles.find((p) => p.is_representative) ?? profiles[0] ?? null

  if (isLoading) {
    return (
      <BrutalCard intensity="soft">
        <Text className="text-sm text-text-sub">불러오는 중…</Text>
      </BrutalCard>
    )
  }

  if (!rep) {
    // 대표 만세력 없음
    return (
      <BrutalCard intensity="soft">
        <View className="items-center gap-3 py-4">
          <MascotTinted size={56} />
          <View className="items-center">
            <Text className="text-[14px] font-extrabold text-ink">대표 만세력이 없습니다</Text>
            <Text className="mt-1 text-[12px] text-text-sub">만세력 탭에서 대표로 지정할 수 있어요</Text>
          </View>
          <Pressable onPress={() => router.push('/manse')} className="rounded-xl border-2 border-ink bg-yellow px-4 py-2">
            <Text className="text-[13px] font-extrabold text-ink">만세력 목록 보기</Text>
          </Pressable>
          <Text className="text-[11px] text-text-sub">{maskEmail(email)}</Text>
        </View>
      </BrutalCard>
    )
  }

  const bg = stemCardBg(rep.day_stem)
  const iljuStr = rep.day_stem && rep.day_branch ? `${rep.day_stem}${rep.day_branch}일주` : null

  return (
    <BrutalShadow radius={radii.card}>
      <View
        className="rounded-2xl border-2 border-ink p-4"
        style={{ backgroundColor: bg }}
      >
        <View className="flex-row items-center gap-3">
          {/* 마스코트 아바타 80px 슬롯 */}
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-ink bg-surface">
            <MascotTinted stem={rep.day_stem} size={72} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[18px] font-black leading-tight text-ink">{rep.name || '이름 없음'}</Text>
            {iljuStr && (
              <Text className="mt-0.5 font-serif text-[13px] font-extrabold text-ink" style={{ opacity: 0.75 }}>
                {iljuStr}
              </Text>
            )}
            <Text className="mt-1 text-[12px] font-semibold text-ink" style={{ opacity: 0.6 }}>
              생년월일 {rep.birth_date}
            </Text>
            <Text className="mt-1 text-[11px] text-text-sub">{maskEmail(email)}</Text>
          </View>
          {/* 대표 뱃지 */}
          <View className="shrink-0 self-start rounded-full border-2 border-ink bg-orange px-3 py-1">
            <Text className="text-[12px] font-extrabold text-white">대표</Text>
          </View>
        </View>
      </View>
    </BrutalShadow>
  )
}

// ── 기록 피드 아이템 타입 ────────────────────────────────────────────────────

type FeedEntry =
  | { type: 'report'; createdAt: string; item: import('@sajuguri/api-client').ReportSummary }
  | { type: 'consultation'; createdAt: string; item: import('@sajuguri/api-client').ConsultationHistoryItem }
  | { type: 'compatibility'; createdAt: string; item: import('@sajuguri/api-client').CompatibilityReportSummary }
  | { type: 'daily'; createdAt: string; item: import('@sajuguri/api-client').DailyRecordSummary }

// ── 병합 기록 섹션 ────────────────────────────────────────────────────────────

const PREVIEW_COUNT = 4

function RecordsSectionAuthed() {
  const { api } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [editMode, setEditMode] = useState(false)

  const { data: reports = [] } = useReports()
  const { data: consultations = [] } = useConsultations()
  const { data: compatibilityReports = [] } = useCompatibilityReports()
  const { data: dailyRecords = [] } = useDailyRecords()

  // 모든 타입 병합, 최신순
  const feed = useMemo<FeedEntry[]>(() => {
    const entries: FeedEntry[] = [
      ...reports.map((r) => ({ type: 'report' as const, createdAt: r.created_at, item: r })),
      ...consultations.map((c) => ({ type: 'consultation' as const, createdAt: c.created_at, item: c })),
      ...compatibilityReports.map((r) => ({ type: 'compatibility' as const, createdAt: r.created_at, item: r })),
      ...dailyRecords.map((d) => ({ type: 'daily' as const, createdAt: d.date, item: d })),
    ]
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return entries
  }, [reports, consultations, compatibilityReports, dailyRecords])

  const preview = feed.slice(0, PREVIEW_COUNT)
  const hasMore = feed.length > PREVIEW_COUNT

  return (
    <View className="gap-2">
      {/* 섹션 헤더 */}
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-extrabold uppercase tracking-wide text-ink">내 기록</Text>
        {feed.length > 0 && (
          <Pressable
            onPress={() => setEditMode((v) => !v)}
            className="rounded-xl border-2 border-ink bg-surface px-3 py-1"
          >
            <Text className="text-[12px] font-extrabold text-ink">
              {editMode ? '완료' : '편집'}
            </Text>
          </Pressable>
        )}
      </View>

      {feed.length === 0 ? (
        <BrutalCard intensity="soft">
          <Text className="text-sm text-text-sub">아직 기록이 없어요</Text>
        </BrutalCard>
      ) : (
        <View className="gap-2">
          {preview.map((entry) => {
            if (entry.type === 'report') {
              return editMode ? (
                <View key={`report-${entry.item.id}`} className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <SajuRecordCard
                      report={entry.item}
                      onDelete={async () => {
                        await deleteReport(api, entry.item.id)
                        await queryClient.invalidateQueries({ queryKey: ['reports'] })
                      }}
                    />
                  </View>
                </View>
              ) : (
                <SajuRecordCard
                  key={`report-${entry.item.id}`}
                  report={entry.item}
                  onDelete={async () => {
                    await deleteReport(api, entry.item.id)
                    await queryClient.invalidateQueries({ queryKey: ['reports'] })
                  }}
                />
              )
            }
            if (entry.type === 'consultation') {
              return editMode ? (
                <View key={`consultation-${entry.item.id}`} className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <ConsultationRecordCard
                      consultation={entry.item}
                      onDelete={async () => {
                        await deleteConsultation(api, entry.item.id)
                        await queryClient.invalidateQueries({ queryKey: ['consultations'] })
                      }}
                    />
                  </View>
                </View>
              ) : (
                <ConsultationRecordCard
                  key={`consultation-${entry.item.id}`}
                  consultation={entry.item}
                  onDelete={async () => {
                    await deleteConsultation(api, entry.item.id)
                    await queryClient.invalidateQueries({ queryKey: ['consultations'] })
                  }}
                />
              )
            }
            if (entry.type === 'compatibility') {
              return editMode ? (
                <View key={`compatibility-${entry.item.id}`} className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <CompatibilityRecordCard
                      report={entry.item}
                      onDelete={async () => {
                        await deleteCompatibilityReport(api, entry.item.id)
                        await queryClient.invalidateQueries({ queryKey: ['compatibility'] })
                      }}
                    />
                  </View>
                </View>
              ) : (
                <CompatibilityRecordCard
                  key={`compatibility-${entry.item.id}`}
                  report={entry.item}
                  onDelete={async () => {
                    await deleteCompatibilityReport(api, entry.item.id)
                    await queryClient.invalidateQueries({ queryKey: ['compatibility'] })
                  }}
                />
              )
            }
            if (entry.type === 'daily') {
              return editMode ? (
                <View key={`daily-${entry.item.id}`} className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <DailyRecordCard
                      record={entry.item}
                      onDelete={async () => {
                        await deleteDailyRecord(api, entry.item.id)
                        await queryClient.invalidateQueries({ queryKey: ['daily'] })
                      }}
                    />
                  </View>
                </View>
              ) : (
                <DailyRecordCard
                  key={`daily-${entry.item.id}`}
                  record={entry.item}
                  onDelete={async () => {
                    await deleteDailyRecord(api, entry.item.id)
                    await queryClient.invalidateQueries({ queryKey: ['daily'] })
                  }}
                />
              )
            }
            return null
          })}

          {/* 전체 기록 보기 링크 */}
          {hasMore && (
            <Pressable
              onPress={() => router.push('/my/history')}
              className="mt-1 items-center rounded-xl border-2 border-teal bg-surface py-3"
            >
              <Text className="text-[13px] font-extrabold text-teal-deep">전체 기록 보기 →</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function MyScreen() {
  const { status, user, logout } = useAuth()
  const router = useRouter()

  return (
    <Screen>
      {/* ko.json my.title = "마이" */}
      <Text className="mb-4 mt-2 text-[22px] font-black text-ink">마이</Text>

      {status === 'loading' ? (
        <Text className="text-sm text-text-sub">불러오는 중…</Text>
      ) : status === 'authed' && user ? (
        <View className="gap-6">
          {/* 대표 프로필 히어로 카드 */}
          <RepHeroCard email={user.email} />

          {/* 내 기록 섹션 */}
          <RecordsSectionAuthed />

          {/* 로그아웃 */}
          <Button label="로그아웃" variant="ghost" onPress={logout} />
        </View>
      ) : (
        /* 로그인 게이트 — ko.json my.loginRequired / my.loginWithGoogle */
        <BrutalCard>
          <View className="items-center gap-4 py-6">
            <MascotTinted size={72} />
            <Text className="text-[15px] font-extrabold text-ink">로그인이 필요해요</Text>
            <Button
              label="구글로 로그인"
              variant="primary"
              onPress={() => router.push('/auth/login')}
            />
          </View>
        </BrutalCard>
      )}
    </Screen>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep "(tabs)/my.tsx" | head -20
```

Expected: No errors.

---

## Task 5: Create /my/history route

**Files:**
- Create: `apps/mobile/src/app/my/history.tsx`

### Context
Mirrors web `apps/web/app/[locale]/my/history/page.tsx`. Shows all records (no max limit), filter chips (전체/리포트/한줄상담/일진 기록/궁합), edit mode with delete. Login gate with MascotTinted. Back navigation to `/my` tab.

- [ ] **Step 1: Create the history page**

Create file `apps/mobile/src/app/my/history.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import {
  deleteReport,
  deleteConsultation,
  deleteCompatibilityReport,
  deleteDailyRecord,
} from '@sajuguri/api-client'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { Button } from '@/components/ui/Button'
import { MascotTinted } from '@/components/ui/MascotTinted'
import {
  SajuRecordCard,
  ConsultationRecordCard,
  CompatibilityRecordCard,
  DailyRecordCard,
} from '@/components/records/RecordFeedCard'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useReports,
  useConsultations,
  useCompatibilityReports,
  useDailyRecords,
} from '@/lib/queries'
import { colors } from '@/theme'
import Svg, { Path } from 'react-native-svg'

// 필터 타입
type FilterKey = 'all' | 'report' | 'consultation' | 'compatibility' | 'daily'

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'report', label: '리포트' },
  { key: 'consultation', label: '한줄상담' },
  { key: 'daily', label: '일진 기록' },
  { key: 'compatibility', label: '궁합' },
]

type FeedEntry =
  | { type: 'report'; createdAt: string; item: import('@sajuguri/api-client').ReportSummary }
  | { type: 'consultation'; createdAt: string; item: import('@sajuguri/api-client').ConsultationHistoryItem }
  | { type: 'compatibility'; createdAt: string; item: import('@sajuguri/api-client').CompatibilityReportSummary }
  | { type: 'daily'; createdAt: string; item: import('@sajuguri/api-client').DailyRecordSummary }

function FilterChip({
  active,
  onPress,
  label,
}: {
  active: boolean
  onPress: () => void
  label: string
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`shrink-0 rounded-xl border-2 border-ink px-3 py-1.5 ${active ? 'bg-yellow' : 'bg-surface'}`}
    >
      <Text className={`text-[13px] font-extrabold ${active ? 'text-ink' : 'text-text-sub'}`}>
        {label}
      </Text>
    </Pressable>
  )
}

export default function HistoryScreen() {
  const { status, api } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [editMode, setEditMode] = useState(false)

  const { data: reports = [] } = useReports()
  const { data: consultations = [] } = useConsultations()
  const { data: compatibilityReports = [] } = useCompatibilityReports()
  const { data: dailyRecords = [] } = useDailyRecords()

  const feed = useMemo<FeedEntry[]>(() => {
    const entries: FeedEntry[] = [
      ...reports.map((r) => ({ type: 'report' as const, createdAt: r.created_at, item: r })),
      ...consultations.map((c) => ({ type: 'consultation' as const, createdAt: c.created_at, item: c })),
      ...compatibilityReports.map((r) => ({ type: 'compatibility' as const, createdAt: r.created_at, item: r })),
      ...dailyRecords.map((d) => ({ type: 'daily' as const, createdAt: d.date, item: d })),
    ]
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return entries
  }, [reports, consultations, compatibilityReports, dailyRecords])

  const visible = useMemo<FeedEntry[]>(() => {
    if (filter === 'all') return feed
    return feed.filter((e) => e.type === filter)
  }, [feed, filter])

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingHorizontal: 16, backgroundColor: '#FFFBF2' }}>
        <Text className="text-sm text-text-sub">불러오는 중…</Text>
      </View>
    )
  }

  if (status !== 'authed') {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingHorizontal: 16, backgroundColor: '#FFFBF2' }}>
        <Pressable onPress={() => router.back()} className="mb-4 flex-row items-center gap-1">
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text className="text-sm font-extrabold text-ink">마이로</Text>
        </Pressable>
        <BrutalCard>
          <View className="items-center gap-4 py-6">
            <MascotTinted size={72} />
            <Text className="text-[15px] font-extrabold text-ink">로그인이 필요해요</Text>
            <Button label="구글로 로그인" onPress={() => router.push('/auth/login')} />
          </View>
        </BrutalCard>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFFBF2' }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 헤더 */}
      <View className="mb-4 flex-row items-center gap-2">
        <Pressable onPress={() => router.back()}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text className="text-lg font-black text-ink">내 기록</Text>
      </View>

      {/* 가로 스크롤 필터 칩 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2 pb-1">
          {FILTER_LABELS.map(({ key, label }) => (
            <FilterChip
              key={key}
              active={filter === key}
              onPress={() => setFilter(key)}
              label={label}
            />
          ))}
        </View>
      </ScrollView>

      {/* 편집 토글 */}
      {feed.length > 0 && (
        <View className="mb-3 flex-row justify-end">
          <Pressable
            onPress={() => setEditMode((v) => !v)}
            className="rounded-xl border-2 border-ink bg-surface px-3 py-1"
          >
            <Text className="text-[12px] font-extrabold text-ink">
              {editMode ? '완료' : '편집'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* 피드 */}
      {visible.length === 0 ? (
        <BrutalCard intensity="soft">
          <Text className="py-8 text-center text-sm text-text-sub">아직 기록이 없어요</Text>
        </BrutalCard>
      ) : (
        <View className="gap-2">
          {visible.map((entry) => {
            if (entry.type === 'report') {
              return (
                <SajuRecordCard
                  key={`report-${entry.item.id}`}
                  report={entry.item}
                  onDelete={async () => {
                    await deleteReport(api, entry.item.id)
                    await queryClient.invalidateQueries({ queryKey: ['reports'] })
                  }}
                />
              )
            }
            if (entry.type === 'consultation') {
              return (
                <ConsultationRecordCard
                  key={`consultation-${entry.item.id}`}
                  consultation={entry.item}
                  onDelete={async () => {
                    await deleteConsultation(api, entry.item.id)
                    await queryClient.invalidateQueries({ queryKey: ['consultations'] })
                  }}
                />
              )
            }
            if (entry.type === 'compatibility') {
              return (
                <CompatibilityRecordCard
                  key={`compatibility-${entry.item.id}`}
                  report={entry.item}
                  onDelete={async () => {
                    await deleteCompatibilityReport(api, entry.item.id)
                    await queryClient.invalidateQueries({ queryKey: ['compatibility'] })
                  }}
                />
              )
            }
            if (entry.type === 'daily') {
              return (
                <DailyRecordCard
                  key={`daily-${entry.item.id}`}
                  record={entry.item}
                  onDelete={async () => {
                    await deleteDailyRecord(api, entry.item.id)
                    await queryClient.invalidateQueries({ queryKey: ['daily'] })
                  }}
                />
              )
            }
            return null
          })}
        </View>
      )}
    </ScrollView>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep "my/history.tsx" | head -20
```

Expected: No errors.

---

## Task 6: Home — STEM_BANNER LinearGradient, 경/신 color fix

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/index.tsx`

### Context
Web `STEM_BANNER` uses CSS `linear-gradient(135deg,...)`. RN has no CSS gradients but `react-native-svg` (already installed, v15.12.1) exports `LinearGradient` + `Defs` from `'react-native-svg'`. We create an SVG-based gradient background layer under the banner content using a `<Svg>` with `<Defs><LinearGradient>...</LinearGradient></Defs>` absolutely positioned.

Web 경/신 base: `#F2F4F6` (not `#E3E7EC`). Default: yellow `#FFD900` → orange `#FFB200`.

Gradient stop pairs from web:
- 갑/을: `#9FD8D0` → `#5BB3A8`
- 병/정: `#F4845F` → `#D9512E`
- 무/기: `#FFD900` → `#FFB200` (yellow→orange)
- 경/신: `#F2F4F6` → `#C7CDD4`
- 임/계: `#AEB6C4` → `#5E6B80`
- default: `#FFD900` → `#FFB200`

Approach: Replace the solid `backgroundColor` on the banner view with a two-layer approach: (1) SVG LinearGradient fills the bounding box absolutely, (2) content view overlays with `position: 'absolute'` (or use a wrapper with `overflow: 'hidden'`).

Simpler approach (no absolute positioning): wrap the banner content in a `View` with a fixed height and use `react-native-svg`'s `Svg` component with an absolutely-positioned `Rect` fill before the content. But because we don't know the height, the easiest approach is: keep `backgroundColor` for the first stop color only (fallback) and use a custom `GradientBanner` component that renders SVG gradient as background.

Best approach without `expo-linear-gradient`: use the two-tone solid approach. The banner has `overflow: 'hidden'` on a rounded View. Inside, render two Views — upper half with stop1, lower half with stop2 — using `flex` to create a two-tone effect. This is the "approximate with two-tone" as specified in the task rules.

Actually, `react-native-svg`'s `Rect` inside an absolute `Svg` on top of a rounded View gives a true gradient:

```tsx
<View style={{ borderRadius, overflow: 'hidden' }}>
  <Svg style={StyleSheet.absoluteFillObject} ...>
    <Defs>
      <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={stop1} />
        <Stop offset="1" stopColor={stop2} />
      </LinearGradient>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#bg)" />
  </Svg>
  {/* content */}
</View>
```

This is valid with `react-native-svg` 15 and avoids installing any new package.

- [ ] **Step 1: Write the new index.tsx**

Replace entire content of `apps/mobile/src/app/(tabs)/index.tsx`:

```tsx
import { StyleSheet } from 'react-native'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'
import { Screen } from '@/components/ui/Screen'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { CardIcon, ICON_PATHS } from '@/components/ui/CardIcon'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { colors, radii } from '@/theme'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles } from '@/lib/queries'
import { pickGreeting } from '@/lib/greetings'

// 일간(오행) 두 색 그라데이션 스톱 — 웹 STEM_BANNER에서 정확히 포팅.
// 경/신 베이스: #F2F4F6 (not #E3E7EC).
const STEM_GRADIENT: Record<string, [string, string]> = {
  갑: ['#9FD8D0', '#5BB3A8'], 을: ['#9FD8D0', '#5BB3A8'],
  병: ['#F4845F', '#D9512E'], 정: ['#F4845F', '#D9512E'],
  무: ['#FFD900', '#FFB200'], 기: ['#FFD900', '#FFB200'],
  경: ['#F2F4F6', '#C7CDD4'], 신: ['#F2F4F6', '#C7CDD4'],
  임: ['#AEB6C4', '#5E6B80'], 계: ['#AEB6C4', '#5E6B80'],
}
const DEFAULT_GRADIENT: [string, string] = ['#FFD900', '#FFB200']

function bannerStops(stem?: string | null): [string, string] {
  return (stem && STEM_GRADIENT[stem]) || DEFAULT_GRADIENT
}

// SVG linear gradient 배너 배경 (135deg ≈ x2=0.7 y2=0.7 in normalized coords)
function GradientBg({ stop1, stop2, borderRadius }: { stop1: string; stop2: string; borderRadius: number }) {
  return (
    <Svg style={StyleSheet.absoluteFillObject}>
      <Defs>
        <LinearGradient id="bannerGrad" x1="0" y1="0" x2="0.7" y2="0.7">
          <Stop offset="0" stopColor={stop1} />
          <Stop offset="1" stopColor={stop2} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#bannerGrad)" rx={borderRadius} ry={borderRadius} />
    </Svg>
  )
}

function Chevron() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={colors.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }} />
    </Svg>
  )
}

function FeatureCard({
  d,
  bg,
  iconColor,
  title,
  desc,
  badge,
  onPress,
}: {
  d: string
  bg: string
  iconColor: string
  title: string
  desc: string
  badge?: string
  onPress?: () => void
}) {
  return (
    <Pressable onPress={onPress}>
      <BrutalCard>
        <View className="flex-row items-center gap-3">
          <CardIcon d={d} bg={bg} color={iconColor} />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1">
              <Text className="text-sm font-extrabold text-ink">{title}</Text>
              {badge ? (
                <View className="rounded-full border-2 border-ink bg-orange px-2">
                  <Text className="text-[10px] font-extrabold text-white">{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-0.5 text-xs text-text-sub">{desc}</Text>
          </View>
          <Chevron />
        </View>
      </BrutalCard>
    </Pressable>
  )
}

export default function Home() {
  const router = useRouter()
  const { user, status } = useAuth()
  const { data: profiles } = useProfiles()
  const gated = (href: '/report/new' | '/compatibility/new') => () =>
    router.push(status === 'authed' ? href : '/auth/login')

  const rep = profiles?.find((p) => p.is_representative) ?? profiles?.[0]
  const name = rep?.name ?? (user?.email ? user.email.split('@')[0] : null)
  const repStem = rep?.day_stem ?? null
  const hourKST = (new Date().getUTCHours() + 9) % 24
  const fortuneSub = name ? pickGreeting(name, hourKST) : '너의 하루는?'

  const [stop1, stop2] = bannerStops(repStem)

  return (
    <Screen>
      {/* 헤더 */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <MascotTinted stem={repStem} size={26} />
          <Text className="text-xl font-black text-ink">
            사주<Text className="bg-yellow">구리</Text>
          </Text>
        </View>
      </View>

      {/* 운세 배너 — SVG LinearGradient 배경 */}
      <Pressable onPress={() => router.push('/fortune')}>
        <BrutalShadow radius={radii.card}>
          <View
            className="flex-row items-center gap-3 rounded-2xl border-2 border-ink p-4"
            style={{ overflow: 'hidden' }}
          >
            <GradientBg stop1={stop1} stop2={stop2} borderRadius={radii.card - 2} />
            <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface">
              <MascotTinted stem={repStem} size={40} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-black text-ink">오늘의 운세</Text>
              <Text className="text-xs font-semibold text-ink">
                {name ? fortuneSub : '너의 하루는?'}
              </Text>
            </View>
            <Chevron />
          </View>
        </BrutalShadow>
      </Pressable>

      {/* ko.json home.sectionTitle = "이런 건 어때?" */}
      <Text className="mb-3 mt-5 text-[15px] font-extrabold text-ink">이런 건 어때?</Text>
      <View className="gap-3">
        <FeatureCard
          d={ICON_PATHS.manse}
          bg="#7BD3C8"
          iconColor={colors.ink}
          title="만세력 보기"
          desc="내 사주 원국을 한눈에"
          onPress={() => router.push('/manse')}
        />
        <FeatureCard
          d={ICON_PATHS.doc}
          bg={colors.yellow}
          iconColor={colors.ink}
          title="내 사주 풀리포트"
          badge="10탭"
          desc="결론만 말해주는 AI 해설"
          onPress={gated('/report/new')}
        />
        <FeatureCard
          d={ICON_PATHS.chat}
          bg={colors.teal}
          iconColor="#FFFFFF"
          title="AI 사주 상담"
          desc="묻고 답하며 깊이 보는 내 사주"
          onPress={() => router.push('/chat')}
        />
        <FeatureCard
          d={ICON_PATHS.bolt}
          bg={colors.amber}
          iconColor="#FFFFFF"
          title="한줄 상담"
          desc="로그인 없이 한 질문 맛보기"
          onPress={() => router.push('/question')}
        />
        <FeatureCard
          d={ICON_PATHS.heart}
          bg={colors.sky}
          iconColor="#FFFFFF"
          title="궁합 리포트"
          desc="두 사람 사주로 보는 케미"
          onPress={gated('/compatibility/new')}
        />
      </View>
    </Screen>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep "(tabs)/index.tsx" | head -20
```

Expected: No errors for this file.

---

## Task 7: Full TypeScript validation

- [ ] **Step 1: Run full tsc**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -E "^apps/mobile/src/(app/\(tabs\)/my\.tsx|app/\(tabs\)/index\.tsx|app/my/history\.tsx|components/records/RecordFeedCard\.tsx|components/TabBar\.tsx|components/ui/Chip\.tsx)" | head -40
```

Expected: No errors in the 6 modified/created files.

- [ ] **Step 2: Confirm Chip backward compatibility**

```bash
cd apps/mobile && grep -r '<Chip label=' src/ --include="*.tsx" | wc -l
```

Expected: Non-zero (existing callers still use label=). Then:

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -i "chip" | head -10
```

Expected: No Chip-related errors.

---

## Self-Review Checklist

**Spec coverage:**
- [x] My page heading "마이" (ko.json my.title) — Task 4
- [x] Rep hero card: MascotTinted 72px, masked email, {stem}{branch}일주, stem-based bg — Task 4
- [x] Merged chronological feed max 4 + "전체 기록 보기 →" to /my/history — Task 4
- [x] /my/history route created — Task 5
- [x] Edit-mode toggle in records section — Task 4
- [x] Login gate: "로그인이 필요해요"/"구글로 로그인" + MascotTinted(72) — Task 4
- [x] Records empty "아직 기록이 없어요" (feedEmpty from ko.json) — Task 4
- [x] Records: trash SVG icon + in-app DeleteModal (not OS Alert, not text "삭제") — Task 3
- [x] compat name fallback "이름 없음" (ko.json compatibility.unknownName) — Task 3
- [x] Remove ❤ separator → "·" — Task 3
- [x] Type badge labels from ko.json my.records.* — Task 3
- [x] Home STEM_BANNER → LinearGradient via react-native-svg — Task 6
- [x] 경/신 base #F2F4F6 — Task 6
- [x] Default banner yellow→orange — Task 6
- [x] Language toggle: DEFERRED (needs i18n wiring — noted)
- [x] TabBar manse icon = 2×2 grid squares — Task 2
- [x] TabBar home icon = house with door/window — Task 2
- [x] TabBar my icon = clean semicircle body — Task 2
- [x] TabBar icon size 19×19 — Task 2
- [x] TabBar max-w 612 cap — Task 2
- [x] Chip children prop (web compat) + label prop (backward compat) — Task 1
- [x] Chip lucky FG #00665F, unlucky FG #B34800 — Task 1
- [x] Chip default mb-2 mr-1.5 margins — Task 1
- [x] No new deps installed — plan uses react-native-svg (already in package.json)
- [x] Do NOT edit src/lib/queries.ts — plan reads it only

**Placeholder scan:** No TBD, no "implement later", no "similar to" — all code is fully written.

**Type consistency:**
- `FeedEntry` type defined inline consistently in Task 4 and Task 5 (both use the same 4 union members)
- `DeleteModal` in RecordFeedCard: props `label`, `onConfirm`, `onClose` used consistently
- `Chip`: `label?: string`, `children?: ReactNode` — content fallback `children ?? label ?? ''`
- `STEM_GRADIENT` returns `[string, string]` tuple consumed by `bannerStops` and destructured as `[stop1, stop2]`

**Deferred:**
- Language toggle on My page (needs i18n wiring — out of scope per spec)
