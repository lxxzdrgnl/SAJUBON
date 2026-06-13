# Phase 1a — 홈 허브 + 만세력 입력폼 + 게스트 분석 화면 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이 동작하는 핵심 경로 — 홈 허브 → 만세력 입력 → `POST /api/saju/calc` → 분석 화면(일주 히어로 + 기둥 카드 + 태그 칩) — 을 Next.js로 구현한다.

**Architecture:** 입력폼(클라이언트 컴포넌트)이 입력을 URL 쿼리로 직렬화해 `/manse/result`로 이동 → 결과 페이지가 **서버 컴포넌트에서 calc API를 SSR fetch**해 렌더 (공유 가능 URL + OG 친화). 최근 입력은 `StorageAdapter`의 localStorage 구현으로 보관. 차트·저장 목록·인증은 1b/1c.

**Tech Stack:** Next 15 App Router(RSC), next-intl, Tailwind 4 토큰, vitest(+RTL은 미도입 — 로직만 테스트), packages/{core,api-client,design}

**참조:** `docs/design.md` §4~5, spec §4.5·§7.5, 목업 `mockup-app-v10.html`, 기존 구현 `frontend/components/saju/InputForm.vue`(필드 정의)·`frontend/utils/citySearch.ts`

**1a 비범위:** 인증·저장 만세력 목록(1b), 분석 차트 이식(1c), 운세·리포트·채팅(Phase 2~4), 일주 캐릭터 카피 데이터(별도 데이터 태스크 — 히어로 카드엔 일주명까지만)

---

## 파일 구조

```
packages/core/src/
├── solar.ts(.test.ts)        # calcSolarCorrection·formatCorrection (이식)
└── recentInput.ts(.test.ts)  # 최근 입력 저장/로드 (StorageAdapter 사용)
packages/api-client/src/
└── cities.ts(.test.ts)       # searchCities(api, q) (이식 — ApiClient 경유)
apps/web/
├── lib/{api.ts, storage.ts, ohaeng.ts(.test.ts)}   # 클라 api 인스턴스·localStorage 어댑터·오행 색 매핑
├── vitest.config.ts
├── components/ui/{BrutalCard.tsx, Chip.tsx}
├── components/manse/{InputForm.tsx, PillarCard.tsx, IljuHero.tsx, TagChips.tsx}
├── app/[locale]/manse/page.tsx          # 만세력 탭: 최근 입력 + 새 만세력
├── app/[locale]/manse/new/page.tsx      # 입력폼
└── app/[locale]/manse/result/page.tsx   # 분석 화면 (SSR calc)
```

---

### Task 1: packages/core — 진태양시 보정 + 최근 입력 (TDD)

**Files:**
- Create: `packages/core/src/solar.ts`, `packages/core/src/recentInput.ts`
- Test: `packages/core/src/solar.test.ts`, `packages/core/src/recentInput.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 실패하는 테스트 작성** — `solar.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calcSolarCorrection, formatCorrection, SEOUL_CORRECTION } from './solar'

describe('진태양시 보정', () => {
  it('서울: round(126.97×4) − 540 = −32분', () => {
    expect(calcSolarCorrection(126.97, 540)).toBe(-32)
    expect(SEOUL_CORRECTION).toBe(-32)
  })
  it('formatCorrection — 부호 표기', () => {
    expect(formatCorrection(-32)).toBe('-32분')
    expect(formatCorrection(8)).toBe('+8분')
  })
})
```

`recentInput.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createMemoryStorage } from './storage'
import { loadRecentInputs, saveRecentInput, type RecentBirthInput } from './recentInput'

const input: RecentBirthInput = {
  name: '나', birth_date: '1995-03-02', birth_time: '04:30',
  gender: 'male', calendar: 'solar', is_leap_month: false,
}

describe('최근 입력 보관 (localStorage 어댑터 경유)', () => {
  it('저장 후 로드 — 최신순, 동일 입력은 중복 제거', async () => {
    const s = createMemoryStorage()
    await saveRecentInput(s, input)
    await saveRecentInput(s, { ...input, name: '여자친구', birth_date: '1998-07-14' })
    await saveRecentInput(s, input)            // 중복 → 맨 앞으로 이동만
    const list = await loadRecentInputs(s)
    expect(list).toHaveLength(2)
    expect(list[0].name).toBe('나')
  })
  it('빈 저장소 → []', async () => {
    expect(await loadRecentInputs(createMemoryStorage())).toEqual([])
  })
  it('최대 5개 유지', async () => {
    const s = createMemoryStorage()
    for (let i = 0; i < 7; i++)
      await saveRecentInput(s, { ...input, name: `p${i}`, birth_date: `199${i}-01-01` })
    expect(await loadRecentInputs(s)).toHaveLength(5)
  })
})
```

- [ ] **Step 2: 실패 확인** — `pnpm --filter @sajuguri/core test` → 신규 2파일 FAIL

- [ ] **Step 3: 구현** — `solar.ts` (frontend/utils/citySearch.ts에서 순수 부분 이식):

```typescript
/** 진태양시 보정 (이식: frontend/utils/citySearch.ts) — round(경도×4) − UTC오프셋(분) */
export function calcSolarCorrection(longitude: number, utcOffsetMinutes: number): number {
  return Math.round(longitude * 4) - utcOffsetMinutes
}

export function formatCorrection(minutes: number): string {
  return `${minutes >= 0 ? '+' : ''}${minutes}분`
}

/** 서울 기본 보정 (출생지 미입력 시) */
export const SEOUL_CORRECTION = calcSolarCorrection(126.97, 540)
```

`recentInput.ts`:

```typescript
import type { StorageAdapter } from './storage'

/** 게스트 최근 입력 — 만세력 입력폼 자동완성용 (spec §7.3) */
export interface RecentBirthInput {
  name: string
  birth_date: string
  birth_time: string | null
  gender: 'male' | 'female'
  calendar: 'solar' | 'lunar'
  is_leap_month: boolean
  birth_longitude?: number
  birth_utc_offset?: number
  city?: string
}

const KEY = 'sajuguri.recentInputs'
const MAX = 5

export async function loadRecentInputs(s: StorageAdapter): Promise<RecentBirthInput[]> {
  const raw = await s.get(KEY)
  if (!raw) return []
  try { return JSON.parse(raw) as RecentBirthInput[] } catch { return [] }
}

export async function saveRecentInput(s: StorageAdapter, input: RecentBirthInput): Promise<void> {
  const list = await loadRecentInputs(s)
  const key = (i: RecentBirthInput) => `${i.birth_date}|${i.birth_time}|${i.gender}|${i.calendar}`
  const dedup = [input, ...list.filter((i) => key(i) !== key(input))]
  await s.set(KEY, JSON.stringify(dedup.slice(0, MAX)))
}
```

- [ ] **Step 4: index.ts에 export 추가, 테스트 통과 (5+1 passed), 커밋**

```bash
git add packages/core && git commit -m "feat: 진태양시 보정·최근 입력 유틸을 core로 이식"
```

---

### Task 2: packages/api-client — 도시 검색 이식 (TDD)

**Files:**
- Create: `packages/api-client/src/cities.ts` + `cities.test.ts`
- Modify: `packages/api-client/src/index.ts`

- [ ] **Step 1: 실패하는 테스트** — `cities.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './client'
import { searchCities } from './cities'

const mockFetch = vi.fn()
beforeEach(() => { vi.stubGlobal('fetch', mockFetch); mockFetch.mockReset() })

describe('searchCities', () => {
  it('백엔드 응답을 CityOption으로 매핑', async () => {
    mockFetch.mockImplementation(() => new Response(JSON.stringify([{
      label: '서울', sublabel: 'Seoul, KR', longitude: 126.97,
      utc_offset: 540, timezone: 'Asia/Seoul', is_korea: true,
    }]), { status: 200 }))
    const api = new ApiClient('http://localhost:8000')
    const r = await searchCities(api, '서울')
    expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:8000/api/cities?q=%EC%84%9C%EC%9A%B8')
    expect(r[0]).toEqual({
      label: '서울', sublabel: 'Seoul, KR', longitude: 126.97,
      utcOffset: 540, timezone: 'Asia/Seoul', isKorea: true,
    })
  })
  it('빈 질의 → 호출 없이 []', async () => {
    const api = new ApiClient('http://x')
    expect(await searchCities(api, '  ')).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })
  it('API 오류 → [] (폼이 죽지 않게)', async () => {
    mockFetch.mockImplementation(() => new Response('{}', { status: 500 }))
    const api = new ApiClient('http://x')
    expect(await searchCities(api, '서울')).toEqual([])
  })
})
```

- [ ] **Step 2: 실패 확인 → 구현** — `cities.ts` (frontend/utils/citySearch.ts의 fetch를 ApiClient 경유로):

```typescript
import type { ApiClient } from './client'

/** 도시 검색 옵션 (이식: frontend/utils/citySearch.ts) */
export interface CityOption {
  label: string
  sublabel: string
  longitude: number
  utcOffset: number
  isKorea: boolean
  timezone: string
}

interface CityDto {
  label: string; sublabel: string; longitude: number
  utc_offset: number; timezone: string; is_korea: boolean
}

/** GET /api/cities — 한국어/영문 통합 도시 검색. 실패 시 빈 배열 (폼 UX 보호) */
export async function searchCities(api: ApiClient, query: string): Promise<CityOption[]> {
  const q = query.trim()
  if (!q) return []
  try {
    const data = await api.get<CityDto[]>(`/api/cities?q=${encodeURIComponent(q)}`)
    return data.map((d) => ({
      label: d.label, sublabel: d.sublabel, longitude: d.longitude,
      utcOffset: d.utc_offset, timezone: d.timezone, isKorea: d.is_korea,
    }))
  } catch {
    return []
  }
}
```

- [ ] **Step 3: index.ts export 추가, 통과 (6 passed), 커밋** — `feat: 도시 검색을 api-client로 이식`

---

### Task 3: apps/web — vitest 셋업 + 클라 어댑터 + 오행 색 매핑 (TDD)

**Files:**
- Create: `apps/web/vitest.config.ts`, `apps/web/lib/api.ts`, `apps/web/lib/storage.ts`, `apps/web/lib/ohaeng.ts` + `ohaeng.test.ts`
- Modify: `apps/web/package.json` (test 스크립트·vitest devDep)

- [ ] **Step 1: vitest 셋업** — package.json `"test": "vitest run"`, devDeps에 `"vitest": "^3.1.0"` 추가. `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['lib/**/*.test.ts'] } })
```

- [ ] **Step 2: 실패하는 테스트** — `lib/ohaeng.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ohaengColor, ohaengTintColor } from './ohaeng'

describe('오행 색 매핑 (엔진 한글 오행명 → 토큰)', () => {
  it('5원소 + 미지정 폴백', () => {
    expect(ohaengColor('목')).toBe('#00A86B')
    expect(ohaengColor('수')).toBe('#0090A8')
    expect(ohaengColor('???')).toBe('#1A1A1A')      // 폴백 = 잉크
    expect(ohaengTintColor('화')).toBe('#FFF1E8')
    expect(ohaengTintColor('???')).toBe('#FFFFFF')  // 폴백 = surface
  })
})
```

- [ ] **Step 3: 구현** — `lib/ohaeng.ts`:

```typescript
import { colors, ohaeng, ohaengTint } from '@sajuguri/design'

/** 엔진이 주는 한글 오행명('목'|'화'|'토'|'금'|'수')을 색으로 — 미지정 값은 잉크/서피스 폴백 */
export function ohaengColor(element: string): string {
  return (ohaeng as Record<string, string>)[element] ?? colors.ink
}

export function ohaengTintColor(element: string): string {
  return (ohaengTint as Record<string, string>)[element] ?? colors.surface
}
```

`lib/api.ts`:

```typescript
import { ApiClient } from '@sajuguri/api-client'

/**
 * 클라이언트 컴포넌트용: '' → 상대경로 /api → next.config rewrites가 백엔드로 프록시.
 * 서버 컴포넌트(SSR)용: rewrites를 안 타므로 백엔드 직결 URL 사용.
 */
export const api = new ApiClient('')
export const serverApi = new ApiClient(process.env.API_BASE ?? 'http://localhost:8000')
```

`lib/storage.ts` (G1 — StorageAdapter의 웹 구현):

```typescript
import type { StorageAdapter } from '@sajuguri/core'
import { createMemoryStorage } from '@sajuguri/core'

/** localStorage 어댑터 — SSR/시크릿 모드 등 사용 불가 환경은 메모리 폴백 */
export function createWebStorage(): StorageAdapter {
  if (typeof window === 'undefined' || !('localStorage' in window)) return createMemoryStorage()
  return {
    async get(key) { return window.localStorage.getItem(key) },
    async set(key, value) { window.localStorage.setItem(key, value) },
    async remove(key) { window.localStorage.removeItem(key) },
  }
}

export const webStorage = createWebStorage()
```

- [ ] **Step 4: 통과 확인 + 커밋** — `pnpm --filter web test` (1 passed). `feat: web 클라 어댑터와 오행 색 매핑 추가`

---

### Task 4: 공용 브루탈 UI 컴포넌트

**Files:**
- Create: `apps/web/components/ui/BrutalCard.tsx`, `apps/web/components/ui/Chip.tsx`

- [ ] **Step 1: `BrutalCard.tsx`** (design.md §3 — 강도 2단계):

```tsx
import type { ReactNode } from 'react'

/** 브루탈 강도 2단계 카드 (design.md §3). full=잉크 보더+오프셋 섀도, soft=저강도 */
export default function BrutalCard({
  intensity = 'full',
  className = '',
  children,
}: {
  intensity?: 'full' | 'soft'
  className?: string
  children: ReactNode
}) {
  const base = 'rounded-2xl bg-surface p-4'
  const style =
    intensity === 'full'
      ? 'border-2 border-ink shadow-[4px_4px_0_#1A1A1A]'
      : 'border-[1.5px] border-border-soft'
  return <div className={`${base} ${style} ${className}`}>{children}</div>
}
```

- [ ] **Step 2: `Chip.tsx`** (design.md §4.1 — 의미는 배경 틴트로만):

```tsx
import type { ReactNode } from 'react'

const VARIANT = {
  default: 'bg-surface text-ink',
  lucky: 'bg-teal-tint text-[#00665F]',     // 길신
  unlucky: 'bg-orange-tint text-[#B34800]', // 흉살
  yellow: 'bg-yellow text-ink',
} as const

/** 통일 칩 — 잉크 보더 + 미니 오프셋 섀도 고정, 의미는 variant 틴트 (design.md §4.1) */
export default function Chip({
  variant = 'default',
  children,
}: {
  variant?: keyof typeof VARIANT
  children: ReactNode
}) {
  return (
    <span
      className={`mb-2 mr-1.5 inline-block rounded-[10px] border-2 border-ink px-2.5 py-1
        text-xs font-extrabold shadow-[2px_2px_0_#1A1A1A] ${VARIANT[variant]}`}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 3: 빌드 확인 + 커밋** — `pnpm --filter web build`. `feat: 브루탈 카드·칩 공용 컴포넌트 추가`

---

### Task 5: 홈 허브 완성 + 메시지 확장

**Files:**
- Modify: `apps/web/app/[locale]/page.tsx`, `apps/web/messages/ko.json`, `apps/web/messages/en.json`

- [ ] **Step 1: 메시지 확장** — ko.json에 추가 (en.json도 동일 구조로 번역):

```json
{
  "home": {
    "title": "사주구리", "fortuneBanner": "오늘의 운세", "fortuneSub": "너의 하루는?",
    "sectionTitle": "이런 건 어때?",
    "cards": {
      "report": { "title": "내 사주 풀리포트", "badge": "10탭", "desc": "결론만 말해주는 AI 해설" },
      "chat": { "title": "AI 사주 상담", "desc": "궁합도 물어봐 · 로그인 필요" },
      "question": { "title": "한 번 물어보기", "desc": "로그인 없이 한 질문 맛보기" },
      "soon": { "title": "작명 · 꿈해몽", "desc": "coming soon" }
    }
  }
}
```

en.json 같은 키: report "My Full Saju Report"/"10 tabs"/"AI insights, conclusions first", chat "AI Saju Chat"/"Ask anything, even compatibility · Sign-in required", question "Quick Question"/"One free question, no sign-in", soon "Naming · Dream reading"/"coming soon", sectionTitle "What about these?"

- [ ] **Step 2: page.tsx 카드 목록 구현** — 기존 배너 아래에 추가. 카드 아이콘은 TabBar처럼 인라인 스트로크 SVG(doc/chat/bolt/moon path는 목업 v10과 동일 값 사용 — 이모지 금지):

```tsx
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import BrutalCard from '@/components/ui/BrutalCard'

const ICONS = {
  doc: 'M5 3 h11 a2 2 0 0 1 2 2 v14 a2 2 0 0 1-2 2 H5 a0 0 0 0 1 0 0 V3 Z M9 8 H15 M9 12 H15 M9 16 H13',
  chat: 'M4 6 a3 3 0 0 1 3-3 h10 a3 3 0 0 1 3 3 v7 a3 3 0 0 1-3 3 H10 l-4.5 4 v-4 H7 a3 3 0 0 1-3-3 Z',
  bolt: 'M13 2 L5 13 H11 L9 22 L19 10 H12 Z',
  moon: 'M20 13 A8 8 0 1 1 11 4 A6.5 6.5 0 0 0 20 13 Z',
} as const

function CardIcon({ d, bg, color }: { d: string; bg: string; color: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink" style={{ background: bg, color }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </span>
  )
}

export default function Home() {
  const t = useTranslations('home')
  return (
    <main>
      <header className="mb-4 flex items-center gap-2 text-xl font-black">
        <Image src="/mascot.svg" alt="" width={26} height={26} />
        사주<span className="rounded-md bg-yellow px-1">구리</span>
      </header>
      {/* 운세 배너 — 그라데이션 예외 (design.md §3). 스토리는 Phase 3 — 아직 미링크 */}
      <section className="flex items-center gap-3 rounded-[18px] border-2 border-ink bg-[linear-gradient(135deg,var(--yellow),var(--orange))] p-4 shadow-[4px_4px_0_#1A1A1A]">
        <Image src="/mascot.svg" alt="" width={44} height={44} />
        <div>
          <h2 className="text-lg font-black">{t('fortuneBanner')}</h2>
          <p className="text-xs font-semibold text-[#5a4a00]">{t('fortuneSub')}</p>
        </div>
      </section>

      <h3 className="mb-3 mt-5 text-[15px] font-extrabold">{t('sectionTitle')}</h3>
      <div className="flex flex-col gap-3">
        <Link href="/manse">
          <BrutalCard className="flex items-center gap-3">
            <CardIcon d={ICONS.doc} bg="var(--yellow-tint)" color="var(--ink)" />
            <div>
              <p className="text-sm font-extrabold">
                {t('cards.report.title')}
                <span className="ml-1 rounded-full border-[1.5px] border-ink bg-orange px-2 text-[10px] font-extrabold text-white align-[2px]">{t('cards.report.badge')}</span>
              </p>
              <p className="mt-0.5 text-xs text-text-sub">{t('cards.report.desc')}</p>
            </div>
          </BrutalCard>
        </Link>
        <Link href="/chat">
          <BrutalCard className="flex items-center gap-3">
            <CardIcon d={ICONS.chat} bg="var(--teal-tint)" color="var(--teal-deep)" />
            <div>
              <p className="text-sm font-extrabold">{t('cards.chat.title')}</p>
              <p className="mt-0.5 text-xs text-text-sub">{t('cards.chat.desc')}</p>
            </div>
          </BrutalCard>
        </Link>
        <BrutalCard intensity="soft" className="flex items-center gap-3">
          <CardIcon d={ICONS.bolt} bg="#F5F0E2" color="var(--text-sub)" />
          <div>
            <p className="text-sm font-extrabold text-[#6a6250]">{t('cards.question.title')}</p>
            <p className="mt-0.5 text-xs text-text-sub">{t('cards.question.desc')}</p>
          </div>
        </BrutalCard>
        <BrutalCard intensity="soft" className="flex items-center gap-3 opacity-55">
          <CardIcon d={ICONS.moon} bg="#F5F0E2" color="var(--text-sub)" />
          <div>
            <p className="text-sm font-extrabold text-[#999]">{t('cards.soon.title')}</p>
            <p className="mt-0.5 text-xs text-text-sub">{t('cards.soon.desc')}</p>
          </div>
        </BrutalCard>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: dev로 / 와 /en 육안 확인 + 빌드 + 커밋** — `feat: 홈 허브 기능 카드 완성`

---

### Task 6: 만세력 입력폼 (`/manse/new`)

**Files:**
- Create: `apps/web/components/manse/InputForm.tsx`, `apps/web/app/[locale]/manse/new/page.tsx`
- Modify: messages ko/en (`manse.form.*` 키)

- [ ] **Step 1: 메시지 추가** (ko — en 동일 구조 번역):

```json
{
  "manse": {
    "form": {
      "title": "오직 당신을 위한 사주", "name": "이름", "birthplace": "출생지",
      "birthplacePlaceholder": "도시명 검색 (예: 서울, 도쿄, 뉴욕)",
      "birthplaceHint": "미입력 시 서울 기준 적용", "datetime": "생년월일 · 시각",
      "timeUnknown": "시간 모름", "solar": "양력", "lunar": "음력", "leap": "윤달",
      "gender": "성별", "male": "남성", "female": "여성", "submit": "만세력 보기",
      "guestNote": "게스트도 바로 볼 수 있어요 · 최근 입력은 이 기기에 저장됩니다"
    }
  }
}
```

- [ ] **Step 2: `components/manse/InputForm.tsx`** — 클라이언트 컴포넌트. 기존 `frontend/components/saju/InputForm.vue`의 필드 계약을 React로 (G3 — 필드 전량 유지):

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { searchCities, type CityOption } from '@sajuguri/api-client'
import { saveRecentInput } from '@sajuguri/core'
import { api } from '@/lib/api'
import { webStorage } from '@/lib/storage'

export default function InputForm() {
  const t = useTranslations('manse.form')
  const router = useRouter()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')           // YYYY-MM-DD (input type=date)
  const [time, setTime] = useState('')           // HH:MM (input type=time)
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar')
  const [isLeap, setIsLeap] = useState(false)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<CityOption[]>([])
  const [city, setCity] = useState<CityOption | null>(null)

  async function onCityInput(q: string) {
    setCityQuery(q)
    setCity(null)
    setCityResults(q.trim() ? await searchCities(api, q) : [])
  }

  async function submit() {
    if (!date) return
    const input = {
      name: name || '게스트',
      birth_date: date,
      birth_time: timeUnknown ? null : time || null,
      gender, calendar, is_leap_month: calendar === 'lunar' && isLeap,
      ...(city && !city.isKorea
        ? { birth_longitude: city.longitude, birth_utc_offset: city.utcOffset, city: city.label }
        : city ? { birth_longitude: city.longitude, city: city.label } : {}),
    }
    await saveRecentInput(webStorage, input)
    const qs = new URLSearchParams(
      Object.entries(input).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => [k, String(v)]),
    )
    router.push(`/manse/result?${qs.toString()}`)
  }

  const seg = (active: boolean) =>
    `flex-1 py-2 text-center text-sm font-extrabold ${active ? 'bg-yellow' : 'text-text-sub'}`

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#1A1A1A]">
      <label className="block">
        <span className="mb-1.5 block text-xs font-extrabold">{t('name')} <em className="not-italic text-orange">*</em></span>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border-2 border-ink bg-bg-base px-3 py-2.5 text-sm" />
      </label>

      <div>
        <span className="mb-1.5 block text-xs font-extrabold">{t('birthplace')}</span>
        <input value={city ? city.label : cityQuery} onChange={(e) => onCityInput(e.target.value)}
          placeholder={t('birthplacePlaceholder')}
          className="w-full rounded-xl border-[1.5px] border-border-soft px-3 py-2.5 text-sm placeholder:text-text-sub" />
        {cityResults.length > 0 && !city && (
          <ul className="mt-1 max-h-40 overflow-y-auto rounded-xl border-[1.5px] border-border-soft bg-surface">
            {cityResults.map((c) => (
              <li key={`${c.label}-${c.timezone}`}>
                <button type="button" onClick={() => { setCity(c); setCityResults([]) }}
                  className="flex w-full justify-between px-3 py-2 text-sm hover:bg-bg-base">
                  <span className="font-bold">{c.label}</span>
                  <span className="text-xs text-text-sub">{c.sublabel}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-[11px] text-text-sub">{t('birthplaceHint')}</p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-extrabold">{t('datetime')}</span>
          <label className="flex items-center gap-1.5 text-[11px] text-text-sub">
            <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#1A1A1A]" />
            {t('timeUnknown')}
          </label>
        </div>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="flex-[1.6] rounded-xl border-2 border-ink px-2.5 py-2.5 text-sm" />
          <input type="time" value={time} disabled={timeUnknown} onChange={(e) => setTime(e.target.value)}
            className="flex-1 rounded-xl border-2 border-ink px-2.5 py-2.5 text-sm disabled:opacity-40" />
        </div>
        <div className="mt-2 flex overflow-hidden rounded-full border-2 border-ink">
          <button type="button" className={seg(calendar === 'solar')} onClick={() => setCalendar('solar')}>{t('solar')}</button>
          <button type="button" className={`${seg(calendar === 'lunar' && !isLeap)} border-l-2 border-ink`}
            onClick={() => { setCalendar('lunar'); setIsLeap(false) }}>{t('lunar')}</button>
          <button type="button" disabled={calendar !== 'lunar'}
            className={`${seg(calendar === 'lunar' && isLeap)} border-l-2 border-ink disabled:opacity-35`}
            onClick={() => setIsLeap(true)}>{t('leap')}</button>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-extrabold">{t('gender')}</span>
        <div className="flex overflow-hidden rounded-full border-2 border-ink">
          <button type="button" className={seg(gender === 'male')} onClick={() => setGender('male')}>{t('male')}</button>
          <button type="button" className={`${seg(gender === 'female')} border-l-2 border-ink`} onClick={() => setGender('female')}>{t('female')}</button>
        </div>
      </div>

      <button type="button" onClick={submit} disabled={!date}
        className="rounded-xl border-2 border-ink bg-orange py-3 text-[15px] font-extrabold text-white shadow-[4px_4px_0_#1A1A1A] disabled:opacity-40">
        {t('submit')}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: `app/[locale]/manse/new/page.tsx`**:

```tsx
import { useTranslations } from 'next-intl'
import InputForm from '@/components/manse/InputForm'

export default function NewManse() {
  const t = useTranslations('manse.form')
  return (
    <main>
      <p className="mb-4 text-center text-sm font-semibold text-text-sub">{t('title')}</p>
      <InputForm />
      <p className="mt-3 text-center text-[11px] text-text-sub">{t('guestNote')}</p>
    </main>
  )
}
```

- [ ] **Step 4: 빌드 + dev 육안 확인 + 커밋** — `feat: 만세력 입력폼 구현 (도시 검색·음력·시간모름 포함)`

---

### Task 7: 분석 화면 (`/manse/result`) — 일주 히어로 + 기둥 카드 + 태그 칩

**Files:**
- Create: `apps/web/components/manse/{IljuHero.tsx,PillarCard.tsx,TagChips.tsx}`, `apps/web/app/[locale]/manse/result/page.tsx`
- Modify: messages (`manse.result.*`)

- [ ] **Step 1: 메시지** (ko / en 동일 구조):

```json
{
  "manse": {
    "result": {
      "myIlju": "MY 일주", "palja": "사주팔자", "detail": "12운성 · 신살 · 지장간 상세",
      "pillars": { "hour": "생시", "day": "생일", "month": "생월", "year": "생년" },
      "chartsComing": "오행 밸런스 · 십성 차트는 곧 추가돼요",
      "error": "계산에 실패했어요. 입력을 확인해주세요"
    }
  }
}
```

- [ ] **Step 2: `PillarCard.tsx`** (서버 컴포넌트 — 오행 틴트, 일주만 오렌지 강조):

```tsx
import type { Pillar } from '@sajuguri/api-client'
import { ohaengColor, ohaengTintColor } from '@/lib/ohaeng'

/** 기둥 카드 1장 — kind: 'stem'(천간) | 'branch'(지지). 일주 기둥은 오렌지 보더 (design.md §5.3) */
export default function PillarCard({
  pillar, kind, label, isDay = false,
}: {
  pillar: Pillar
  kind: 'stem' | 'branch'
  label?: string
  isDay?: boolean
}) {
  const hanja = kind === 'stem' ? pillar.stem_hanja : pillar.branch_hanja
  const kor = kind === 'stem' ? pillar.stem : pillar.branch
  const element = kind === 'stem' ? pillar.stem_element : pillar.branch_element
  const tenGod = kind === 'stem' ? pillar.stem_ten_god : pillar.branch_ten_god
  const color = ohaengColor(element)
  const border = isDay ? 'border-orange shadow-[2.5px_2.5px_0_#FF6B00]' : 'border-ink shadow-[2.5px_2.5px_0_#1A1A1A]'
  return (
    <div className={`flex-1 rounded-xl border-2 ${border} px-1 py-2 text-center`}
      style={{ background: ohaengTintColor(element) }}>
      {label && (
        <p className={`text-[10px] font-bold ${isDay ? 'text-[#D45500]' : 'text-text-sub'}`}>
          {label}{isDay ? ' ★' : ''}
        </p>
      )}
      <p className="font-serif text-[26px] font-black leading-tight" style={{ color }}>{hanja}</p>
      <p className="text-[11px] font-extrabold" style={{ color }}>{kor} · {element}</p>
      <p className="mt-0.5 text-[10px] text-text-sub">{tenGod}</p>
    </div>
  )
}
```

- [ ] **Step 3: `IljuHero.tsx`**:

```tsx
import type { Pillar } from '@sajuguri/api-client'

/** 일주 히어로 — 캐릭터 카피는 데이터 작업(ilju.json 필드) 완료 후 추가 */
export default function IljuHero({ dayPillar, label }: { dayPillar: Pillar; label: string }) {
  return (
    <section className="rounded-2xl border-2 border-ink bg-yellow p-4 text-center shadow-[4px_4px_0_#1A1A1A]">
      <p className="text-[11px] font-extrabold text-[#6b5500]">{label}</p>
      <p className="font-serif text-[42px] font-black leading-tight">
        {dayPillar.stem_hanja}{dayPillar.branch_hanja}
      </p>
      <p className="text-[15px] font-black">{dayPillar.ganji_name}일주</p>
    </section>
  )
}
```

- [ ] **Step 4: `TagChips.tsx`** (격국·용신·강약 + 신살 — 길신/흉살 variant):

```tsx
import type { SajuCalcResponse, SinSal } from '@sajuguri/api-client'
import Chip from '@/components/ui/Chip'

function sinSalVariant(s: SinSal): 'lucky' | 'unlucky' {
  return s.type === 'lucky' ? 'lucky' : 'unlucky'
}

export default function TagChips({ data }: { data: SajuCalcResponse }) {
  const shown = data.sin_sals.slice(0, 4)   // 상위 4개만 — 전체는 접이식 상세(1c)
  return (
    <div>
      <Chip variant="yellow">{data.day_pillar.ganji_name} 일주</Chip>
      <Chip>{data.gyeok_guk.name}</Chip>
      <Chip>용신 {data.yong_sin.primary}</Chip>
      <Chip>{data.day_master_strength.level_8}</Chip>
      {shown.map((s) => <Chip key={s.name} variant={sinSalVariant(s)}>{s.name}</Chip>)}
    </div>
  )
}
```

주의: `SinSal` 타입의 실제 필드는 `packages/api-client/src/types.ts`를 확인하고 맞출 것 (`type: 'lucky' | ...` 필드가 다르면 — 예: `category` — 실제 필드명으로 조정하고 보고).

- [ ] **Step 5: `app/[locale]/manse/result/page.tsx`** — 서버 컴포넌트 SSR fetch:

```tsx
import { getTranslations } from 'next-intl/server'
import { serverApi } from '@/lib/api'
import type { SajuCalcResponse } from '@sajuguri/api-client'
import IljuHero from '@/components/manse/IljuHero'
import PillarCard from '@/components/manse/PillarCard'
import TagChips from '@/components/manse/TagChips'
import BrutalCard from '@/components/ui/BrutalCard'

export default async function ManseResult({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const t = await getTranslations('manse.result')
  const p = await searchParams
  let data: SajuCalcResponse | null = null
  try {
    data = await serverApi.post<SajuCalcResponse>('/api/saju/calc', {
      name: p.name,
      birth_date: p.birth_date,
      birth_time: p.birth_time ?? null,
      gender: p.gender,
      calendar: p.calendar ?? 'solar',
      is_leap_month: p.is_leap_month === 'true',
      ...(p.birth_longitude ? { birth_longitude: Number(p.birth_longitude) } : {}),
      ...(p.birth_utc_offset ? { birth_utc_offset: Number(p.birth_utc_offset) } : {}),
    })
  } catch {
    data = null
  }
  if (!data) return <main className="pt-10 text-center text-sm font-bold text-text-sub">{t('error')}</main>

  const pillars = [
    { pillar: data.hour_pillar, key: 'hour' },
    { pillar: data.day_pillar, key: 'day' },
    { pillar: data.month_pillar, key: 'month' },
    { pillar: data.year_pillar, key: 'year' },
  ] as const

  return (
    <main className="flex flex-col gap-3">
      <IljuHero dayPillar={data.day_pillar} label={t('myIlju')} />
      <TagChips data={data} />
      <h3 className="mt-1 text-[15px] font-extrabold">{t('palja')}</h3>
      <div className="flex gap-1.5">
        {pillars.map(({ pillar, key }) =>
          pillar ? (
            <PillarCard key={key} pillar={pillar} kind="stem" label={t(`pillars.${key}`)} isDay={key === 'day'} />
          ) : (
            <div key={key} className="flex-1 rounded-xl border-[1.5px] border-dashed border-border-soft py-2 text-center text-[10px] text-text-sub">{t(`pillars.${key}`)}<br />—</div>
          ),
        )}
      </div>
      <div className="flex gap-1.5">
        {pillars.map(({ pillar, key }) =>
          pillar ? <PillarCard key={key} pillar={pillar} kind="branch" isDay={key === 'day'} /> :
            <div key={key} className="flex-1 rounded-xl border-[1.5px] border-dashed border-border-soft py-3 text-center text-[10px] text-text-sub">—</div>,
        )}
      </div>
      <BrutalCard intensity="soft" className="flex justify-between text-[13px] font-extrabold text-[#6a6250]">
        {t('detail')} <span className="text-text-sub">▾</span>
      </BrutalCard>
      <p className="text-center text-[11px] text-text-sub">{t('chartsComing')}</p>
    </main>
  )
}
```

(시간모름이면 `hour_pillar`가 null — 점선 플레이스홀더 렌더. 접이식 상세·차트는 1c.)

- [ ] **Step 6: 백엔드 기동 후 E2E 확인**:

```bash
cd backend && make dev &   # 또는 사용자에게 백엔드 기동 요청
sleep 5
curl -s "http://localhost:3000/manse/result?name=%ED%85%8C%EC%8A%A4%ED%8A%B8&birth_date=1995-03-02&birth_time=04:30&gender=male&calendar=solar" | grep -o "일주" | head -1   # 일주
```
백엔드를 띄울 수 없으면(.venv 권한 등) DONE_WITH_CONCERNS로 보고하고 빌드·typecheck 통과까지만 검증.

- [ ] **Step 7: 커밋** — `feat: 만세력 분석 화면 구현 (일주 히어로·기둥 카드·태그 칩)`

---

### Task 8: 만세력 탭 인덱스 (`/manse`) — 최근 입력 + 새 만세력

**Files:**
- Create: `apps/web/app/[locale]/manse/page.tsx`, `apps/web/components/manse/RecentList.tsx`
- Modify: messages (`manse.index.*`)

- [ ] **Step 1: 메시지**: ko `{ "manse": { "index": { "title": "만세력", "new": "+ 새 만세력 등록", "recent": "최근 본 만세력", "empty": "아직 본 만세력이 없어요. 새로 등록해보세요", "loginHint": "로그인하면 만세력을 저장하고 관리할 수 있어요" } } }` (en 번역 동일 구조)

- [ ] **Step 2: `RecentList.tsx`** (클라이언트 — localStorage 최근 입력을 카드로, 탭하면 결과로):

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { loadRecentInputs, type RecentBirthInput } from '@sajuguri/core'
import { webStorage } from '@/lib/storage'
import BrutalCard from '@/components/ui/BrutalCard'

function toQuery(i: RecentBirthInput): string {
  return new URLSearchParams(
    Object.entries(i).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => [k, String(v)]),
  ).toString()
}

export default function RecentList() {
  const t = useTranslations('manse.index')
  const [items, setItems] = useState<RecentBirthInput[] | null>(null)
  useEffect(() => { loadRecentInputs(webStorage).then(setItems) }, [])
  if (items === null) return null
  if (items.length === 0)
    return <p className="py-6 text-center text-sm text-text-sub">{t('empty')}</p>
  return (
    <div className="flex flex-col gap-3">
      {items.map((i) => (
        <Link key={toQuery(i)} href={`/manse/result?${toQuery(i)}`}>
          <BrutalCard className="flex items-center gap-3">
            <span className="h-11 w-11 shrink-0 rounded-xl border-2 border-ink bg-yellow" />
            <span>
              <span className="block text-[15px] font-extrabold">{i.name}</span>
              <span className="block text-xs text-text-sub">
                {i.birth_date} · {i.birth_time ?? '시간모름'} · {i.gender === 'male' ? '남' : '여'}
              </span>
            </span>
          </BrutalCard>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: `manse/page.tsx`**:

```tsx
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import RecentList from '@/components/manse/RecentList'

export default function ManseIndex() {
  const t = useTranslations('manse.index')
  return (
    <main>
      <h1 className="mb-4 text-lg font-black">{t('title')}</h1>
      <Link href="/manse/new"
        className="mb-4 block rounded-xl border-2 border-ink bg-yellow py-3 text-center text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A]">
        {t('new')}
      </Link>
      <h2 className="mb-3 text-[15px] font-extrabold">{t('recent')}</h2>
      <RecentList />
      <p className="mt-4 text-center text-[11px] text-text-sub">{t('loginHint')}</p>
    </main>
  )
}
```

- [ ] **Step 4: 전체 검증 + 커밋**:

```bash
pnpm build && pnpm test && pnpm typecheck   # 전부 통과
```
`feat: 만세력 탭 인덱스 추가 (최근 입력 목록)`

---

## Self-Review 결과

- **Spec 커버리지**: design.md §5.1(홈 카드)·§5.2(입력폼 필드 전량 — 이름/출생지검색/시간모름/양음윤/성별)·§5.3 1~3항(히어로·칩·기둥 카드) / spec §7.3(localStorage 최근 입력) 충족. §5.3 4~6항(접이식 상세·차트)은 1c로 명시 이관
- **플레이스홀더**: 없음. 단 Task 7 Step 4에 `SinSal` 필드명 확인 지시 포함 (타입 파일이 원천)
- **타입 일관성**: `RecentBirthInput`(T1)↔`saveRecentInput` 호출(T6)·`toQuery`(T8), `CityOption`(T2)↔폼(T6), `ohaengColor`(T3)↔`PillarCard`(T7) 일치 확인
