# Phase 0 — 모노레포 스캐폴드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** pnpm 워크스페이스 + Next.js(`apps/web`) + 공유 패키지(`design`/`core`/`api-client`) + i18n(ko/en) 베이스를 세워 Phase 1~4 구현의 토대를 만든다.

**Architecture:** 루트 pnpm 워크스페이스가 `apps/*`·`packages/*`만 포함 (기존 `frontend/`는 자체 `pnpm-workspace.yaml`을 가진 독립 워크스페이스라 충돌 없음 — 레거시 동결). 공유 패키지는 빌드 없이 TS 소스 그대로 노출하고 Next가 `transpilePackages`로 소비. i18n은 next-intl — ko 무프리픽스, `/en` 프리픽스, 쿠키 우선.

**Tech Stack:** pnpm 11 (corepack), Next.js 15 (App Router, standalone), TypeScript, Tailwind CSS 4, next-intl, Vitest

**참조 문서:** `docs/design.md` (토큰 값), spec §1.5·§7.5

---

## 파일 구조

```
(루트)
├── package.json                  # 워크스페이스 루트 (private)
├── pnpm-workspace.yaml           # apps/*, packages/*
├── turbo.json                    # build/dev/test 파이프라인
├── apps/web/                     # Next.js 15
│   ├── package.json
│   ├── next.config.ts            # transpilePackages, standalone, /api 프록시
│   ├── middleware.ts             # next-intl 로케일 미들웨어
│   ├── i18n/{routing.ts,request.ts}
│   ├── messages/{ko.json,en.json}
│   ├── app/[locale]/{layout.tsx,page.tsx}
│   ├── app/globals.css           # 디자인 토큰 CSS 변수 + Tailwind
│   ├── components/TabBar.tsx     # 하단 탭 4개 셸
│   ├── public/mascot.svg         # frontend/public/mascot.svg 복사
│   └── Dockerfile
└── packages/
    ├── design/src/tokens.ts      # 팔레트·오행색·radius·shadow (단일 진실 원천)
    ├── core/src/storage.ts       # StorageAdapter 인터페이스 (+메모리 구현)
    └── api-client/src/
        ├── types.ts              # frontend/types/saju.ts 이식
        └── client.ts             # fetch 래퍼 (credentials: 'include')
```

---

### Task 1: pnpm 활성화 + 워크스페이스 루트

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- Modify: `.gitignore`

- [ ] **Step 1: corepack으로 pnpm 활성화**

```bash
corepack enable && corepack prepare pnpm@11.1.0 --activate
pnpm --version   # 11.1.0 출력 확인
```

- [ ] **Step 2: 루트 `package.json` 작성**

```json
{
  "name": "sajuguri",
  "private": true,
  "packageManager": "pnpm@11.1.0",
  "scripts": {
    "dev": "turbo dev --filter=web",
    "build": "turbo build",
    "test": "turbo test",
    "typecheck": "turbo typecheck"
  },
  "devDependencies": {
    "turbo": "^2.5.0"
  }
}
```

- [ ] **Step 3: 루트 `pnpm-workspace.yaml` 작성**

`frontend/`를 포함하지 않는다 (자체 워크스페이스로 격리 유지).

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: `turbo.json` 작성**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": [] },
    "typecheck": { "dependsOn": [] }
  }
}
```

- [ ] **Step 5: `.gitignore`에 모노레포 산출물 추가**

기존 `.gitignore` 끝에 추가:

```gitignore
node_modules/
.next/
.turbo/
```

- [ ] **Step 6: 설치 확인 + 커밋**

```bash
pnpm install   # 에러 없이 완료 (turbo 설치됨)
git add package.json pnpm-workspace.yaml turbo.json .gitignore pnpm-lock.yaml
git commit -m "chore: pnpm 모노레포 워크스페이스 스캐폴드"
```

⚠️ `.gitignore`에 사용자의 기존 미커밋 변경(CLAUDE.md ignore 등)이 있다 —
`git add -p .gitignore`로 **이번 추가분만** 스테이징할 것.

---

### Task 2: packages/design — 디자인 토큰

**Files:**
- Create: `packages/design/package.json`, `packages/design/tsconfig.json`,
  `packages/design/src/tokens.ts`, `packages/design/src/index.ts`
- Test: `packages/design/src/tokens.test.ts`

- [ ] **Step 1: 패키지 설정 작성**

`packages/design/package.json`:

```json
{
  "name": "@sajuguri/design",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

`packages/design/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: 실패하는 테스트 작성** — `packages/design/src/tokens.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { colors, ohaeng, ohaengTint, radius, shadow } from './tokens'

describe('design tokens', () => {
  it('비비드 캔디 핵심 팔레트 값 (docs/design.md §2.1)', () => {
    expect(colors.bgBase).toBe('#FFFBF2')
    expect(colors.ink).toBe('#1A1A1A')
    expect(colors.yellow).toBe('#FFD900')
    expect(colors.amber).toBe('#FFB200')
    expect(colors.orange).toBe('#FF6B00')
    expect(colors.teal).toBe('#00C2B8')
    expect(colors.tealDeep).toBe('#00857D')
  })

  it('오행 5색은 팔레트 파생값 (docs/design.md §2.2)', () => {
    expect(ohaeng.목).toBe('#00A86B')
    expect(ohaeng.화).toBe('#FF6B00')
    expect(ohaeng.토).toBe('#D9A400')
    expect(ohaeng.금).toBe('#7D7A70')
    expect(ohaeng.수).toBe('#0090A8')
    // 5원소 전부 틴트 보유
    expect(Object.keys(ohaengTint)).toEqual(Object.keys(ohaeng))
  })

  it('브루탈 섀도와 radius 스케일', () => {
    expect(shadow.brutal).toBe('4px 4px 0 #1A1A1A')
    expect(radius.card).toBe('16px')
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
pnpm --filter @sajuguri/design install
pnpm --filter @sajuguri/design test
# 예상: FAIL — "Cannot find module './tokens'"
```

- [ ] **Step 4: `packages/design/src/tokens.ts` 구현**

```typescript
/** 사주구리 디자인 토큰 — 단일 진실 원천: docs/design.md */

export const colors = {
  bgBase: '#FFFBF2',
  ink: '#1A1A1A',
  yellow: '#FFD900',
  yellowTint: '#FFF3B0',
  amber: '#FFB200',
  orange: '#FF6B00',
  orangeTint: '#FFE1CC',
  teal: '#00C2B8',
  tealDeep: '#00857D',
  tealTint: '#D7F7F4',
  surface: '#FFFFFF',
  borderSoft: '#EBE3D2',
  textSub: '#8A8270',
} as const

/** 오행 5색 — 전통 5색 대체, 팔레트 파생 (design.md §2.2) */
export const ohaeng = {
  목: '#00A86B',
  화: '#FF6B00',
  토: '#D9A400',
  금: '#7D7A70',
  수: '#0090A8',
} as const

/** 기둥 카드 배경 틴트 */
export const ohaengTint = {
  목: '#E9FAF1',
  화: '#FFF1E8',
  토: '#FBF3D9',
  금: '#F4F2EC',
  수: '#E8F7FA',
} as const

/** 스토리(오늘의 운세) 전용 */
export const story = {
  gradientFrom: '#00857D',
  gradientTo: '#04332F',
  score: '#FF8A2E',
  progressFill: '#FFD900',
} as const

export const radius = {
  card: '16px',
  button: '11px',
  chip: '10px',
  pill: '999px',
  sheet: '22px',
} as const

export const shadow = {
  brutal: '4px 4px 0 #1A1A1A',
  brutalSm: '2px 2px 0 #1A1A1A',
  brutalOrange: '4px 4px 0 #FF6B00',
} as const

/** 차트 점수 색 의미: 피크=orange, 중간=yellow, 저점=tealTint */
export const chartScore = {
  peak: colors.orange,
  mid: colors.yellow,
  low: colors.tealTint,
} as const

export const layout = {
  maxWidth: '640px',
} as const

/** CSS 변수 블록 생성 — apps/web globals.css에서 사용 */
export function toCssVariables(): string {
  const entries: string[] = []
  for (const [k, v] of Object.entries(colors)) {
    entries.push(`--${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v};`)
  }
  return `:root {\n  ${entries.join('\n  ')}\n}`
}
```

토 틴트 `#FBF3D9`는 design.md에 hex 미지정이던 값의 확정 — 구현 후 design.md
§2.2에 추기할 것.

- [ ] **Step 5: `packages/design/src/index.ts` 작성**

```typescript
export * from './tokens'
```

- [ ] **Step 6: 테스트 통과 확인 + 커밋**

```bash
pnpm --filter @sajuguri/design test     # 예상: 3 passed
git add packages/design
git commit -m "feat: 디자인 토큰 패키지 추가"
```

---

### Task 3: packages/core — 플랫폼 어댑터 (G1 가드레일의 코드화)

**Files:**
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`,
  `packages/core/src/{storage.ts,index.ts}`
- Test: `packages/core/src/storage.test.ts`

- [ ] **Step 1: 패키지 설정** — Task 2의 design과 동일한 구조, 이름만 변경

`packages/core/package.json`:

```json
{
  "name": "@sajuguri/core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

`packages/core/tsconfig.json`: Task 2 Step 1의 tsconfig와 동일 내용.

- [ ] **Step 2: 실패하는 테스트 작성** — `packages/core/src/storage.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { createMemoryStorage, type StorageAdapter } from './storage'

describe('StorageAdapter', () => {
  it('메모리 구현이 get/set/remove 계약을 만족한다', async () => {
    const s: StorageAdapter = createMemoryStorage()
    expect(await s.get('k')).toBeNull()
    await s.set('k', 'v')
    expect(await s.get('k')).toBe('v')
    await s.remove('k')
    expect(await s.get('k')).toBeNull()
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
pnpm --filter @sajuguri/core install && pnpm --filter @sajuguri/core test
# 예상: FAIL — "Cannot find module './storage'"
```

- [ ] **Step 4: `packages/core/src/storage.ts` 구현**

```typescript
/**
 * 플랫폼 저장소 어댑터 — packages/*에서 localStorage/AsyncStorage 직접 호출 금지.
 * 웹: localStorage 구현은 apps/web에서, RN: AsyncStorage 구현은 apps/native에서 주입.
 * (비동기 시그니처인 이유: RN AsyncStorage가 비동기)
 */
export interface StorageAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

/** 테스트·SSR 폴백용 인메모리 구현 */
export function createMemoryStorage(): StorageAdapter {
  const m = new Map<string, string>()
  return {
    async get(key) { return m.get(key) ?? null },
    async set(key, value) { m.set(key, value) },
    async remove(key) { m.delete(key) },
  }
}
```

- [ ] **Step 5: `packages/core/src/index.ts` 작성**

```typescript
export * from './storage'
```

- [ ] **Step 6: 테스트 통과 + 커밋**

```bash
pnpm --filter @sajuguri/core test    # 예상: 1 passed
git add packages/core
git commit -m "feat: 플랫폼 어댑터 core 패키지 추가"
```

---

### Task 4: packages/api-client — 타입 이식 + fetch 래퍼

**Files:**
- Create: `packages/api-client/package.json`, `packages/api-client/tsconfig.json`,
  `packages/api-client/src/{types.ts,client.ts,index.ts}`
- Test: `packages/api-client/src/client.test.ts`
- 참조(읽기만): `frontend/types/saju.ts`, `frontend/types/chat.ts`

- [ ] **Step 1: 패키지 설정** — Task 3과 동일 구조, 이름 `@sajuguri/api-client`

- [ ] **Step 2: 타입 이식** — `packages/api-client/src/types.ts`

`frontend/types/saju.ts`와 `frontend/types/chat.ts`의 **전체 내용을 그대로 복사**해
하나의 파일로 합친다 (interface 중복 이름 없음 — 확인됨). 파일 맨 위에 주석:

```typescript
// frontend/types/{saju,chat}.ts에서 이식 (2026-06-12).
// 백엔드 schemas/*.py가 원천 — 변경 시 양쪽 동기화.
```

- [ ] **Step 3: 실패하는 테스트 작성** — `packages/api-client/src/client.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient, ApiError } from './client'

const mockFetch = vi.fn()
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
})

describe('ApiClient', () => {
  it('GET — baseUrl 결합 + credentials include', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }))
    const api = new ApiClient('http://localhost:8000')
    const r = await api.get<{ ok: number }>('/api/health')
    expect(r.ok).toBe(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/health',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('POST — JSON 직렬화', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))
    const api = new ApiClient('http://localhost:8000')
    await api.post('/api/saju/calc', { birth_date: '1995-03-02' })
    const [, init] = mockFetch.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ birth_date: '1995-03-02' })
  })

  it('비 2xx → ApiError(status, detail)', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: '세션 없음' }), { status: 404 }),
    )
    const api = new ApiClient('http://localhost:8000')
    await expect(api.get('/api/chat/x/history')).rejects.toMatchObject({
      status: 404,
      detail: '세션 없음',
    })
    await expect(api.get('/api/chat/x/history')).rejects.toBeInstanceOf(ApiError)
  })
})
```

- [ ] **Step 4: 테스트 실패 확인**

```bash
pnpm --filter @sajuguri/api-client install && pnpm --filter @sajuguri/api-client test
# 예상: FAIL — "Cannot find module './client'"
```

- [ ] **Step 5: `packages/api-client/src/client.ts` 구현**

```typescript
/** fetch 기반 API 클라이언트 — 인증은 httpOnly 쿠키 (credentials: 'include') */

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`API ${status}: ${detail}`)
    this.name = 'ApiError'
  }
}

export class ApiClient {
  constructor(private baseUrl: string) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' })
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
    })
    if (!res.ok) {
      let detail = res.statusText
      try {
        const data = await res.json()
        if (typeof data?.detail === 'string') detail = data.detail
      } catch { /* 본문이 JSON이 아니면 statusText 유지 */ }
      throw new ApiError(res.status, detail)
    }
    return res.json() as Promise<T>
  }
}
```

- [ ] **Step 6: `index.ts` 작성, 테스트 통과, 커밋**

```typescript
export * from './types'
export * from './client'
```

```bash
pnpm --filter @sajuguri/api-client test   # 예상: 3 passed
git add packages/api-client
git commit -m "feat: api-client 패키지 추가 (타입 이식 + fetch 래퍼)"
```

---

### Task 5: apps/web — Next.js 15 스캐폴드

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`,
  `apps/web/next.config.ts`, `apps/web/postcss.config.mjs`,
  `apps/web/app/globals.css`
- Copy: `frontend/public/mascot.svg` → `apps/web/public/mascot.svg`,
  동일 파일 → `apps/web/app/icon.svg` (Next 파비콘 컨벤션)

- [ ] **Step 1: `apps/web/package.json` 작성**

```json
{
  "name": "web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "echo 'no tests yet'"
  },
  "dependencies": {
    "@sajuguri/api-client": "workspace:*",
    "@sajuguri/core": "workspace:*",
    "@sajuguri/design": "workspace:*",
    "next": "^15.3.0",
    "next-intl": "^4.1.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.1.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: `next.config.ts` 작성**

```typescript
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const config: NextConfig = {
  output: 'standalone',           // Docker 배포 (spec §7.5)
  transpilePackages: ['@sajuguri/design', '@sajuguri/core', '@sajuguri/api-client'],
  async rewrites() {
    // 개발용 백엔드 프록시 — 운영은 리버스 프록시가 담당
    const api = process.env.API_BASE ?? 'http://localhost:8000'
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }]
  },
}

export default withNextIntl(config)
```

- [ ] **Step 3: `tsconfig.json`·`postcss.config.mjs` 작성**

`apps/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`apps/web/postcss.config.mjs`:

```javascript
export default { plugins: { '@tailwindcss/postcss': {} } }
```

- [ ] **Step 4: `app/globals.css` — 토큰 CSS 변수 + Tailwind**

```css
@import 'tailwindcss';

/* 디자인 토큰 — 원천: packages/design (docs/design.md) */
:root {
  --bg-base: #FFFBF2;
  --ink: #1A1A1A;
  --yellow: #FFD900;
  --yellow-tint: #FFF3B0;
  --amber: #FFB200;
  --orange: #FF6B00;
  --orange-tint: #FFE1CC;
  --teal: #00C2B8;
  --teal-deep: #00857D;
  --teal-tint: #D7F7F4;
  --surface: #FFFFFF;
  --border-soft: #EBE3D2;
  --text-sub: #8A8270;
}

@theme inline {
  --color-bg-base: var(--bg-base);
  --color-ink: var(--ink);
  --color-yellow: var(--yellow);
  --color-amber: var(--amber);
  --color-orange: var(--orange);
  --color-teal: var(--teal);
  --color-teal-deep: var(--teal-deep);
  --color-teal-tint: var(--teal-tint);
  --color-surface: var(--surface);
  --color-border-soft: var(--border-soft);
  --color-text-sub: var(--text-sub);
}

body {
  background: var(--bg-base);
  color: var(--ink);
}
```

- [ ] **Step 5: 마스코트 복사**

```bash
mkdir -p apps/web/public apps/web/app
cp frontend/public/mascot.svg apps/web/public/mascot.svg
cp frontend/public/mascot.svg apps/web/app/icon.svg
```

- [ ] **Step 6: 커밋** (이 시점엔 페이지가 없어 빌드 불가 — Task 6 후 검증)

```bash
git add apps/web
git commit -m "feat: apps/web Next.js 스캐폴드 (설정·토큰·마스코트)"
```

---

### Task 6: i18n 라우팅 + 레이아웃 + 탭 바 셸

**Files:**
- Create: `apps/web/i18n/{routing.ts,request.ts}`, `apps/web/middleware.ts`,
  `apps/web/messages/{ko.json,en.json}`,
  `apps/web/app/[locale]/{layout.tsx,page.tsx}`,
  `apps/web/components/TabBar.tsx`

- [ ] **Step 1: `i18n/routing.ts` — ko 무프리픽스 / en 프리픽스 (spec §1.5)**

```typescript
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'as-needed',   // ko = /, en = /en/...
  localeDetection: true,       // 첫 방문 감지 → 이후 쿠키(NEXT_LOCALE) 우선
})
```

- [ ] **Step 2: `i18n/request.ts`**

```typescript
import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 3: `middleware.ts`**

```typescript
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // /api·정적 파일 제외 — 백엔드 프록시가 로케일 리다이렉트에 걸리면 안 됨
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
```

- [ ] **Step 4: 메시지 파일 (ko+en 동시 — AGENTS.md G7)**

`apps/web/messages/ko.json`:

```json
{
  "tab": { "home": "홈", "manse": "만세력", "chat": "상담", "my": "마이" },
  "home": { "title": "사주구리", "fortuneBanner": "오늘의 운세", "fortuneSub": "너의 하루는?" }
}
```

`apps/web/messages/en.json`:

```json
{
  "tab": { "home": "Home", "manse": "Chart", "chat": "Chat", "my": "My" },
  "home": { "title": "SajuGuri", "fortuneBanner": "Today's Fortune", "fortuneSub": "How's your day?" }
}
```

- [ ] **Step 5: `app/[locale]/layout.tsx`**

```tsx
import type { ReactNode } from 'react'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import TabBar from '@/components/TabBar'
import '../globals.css'

export const metadata = { title: '사주구리' }

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          {/* 모바일 단일 컬럼 — design.md §7 */}
          <div className="mx-auto min-h-dvh max-w-[640px] px-4 pb-24 pt-5">
            {children}
          </div>
          <TabBar />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: `components/TabBar.tsx` — 4탭 셸 (이모지 금지 → 스트로크 SVG)**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'

const ICONS: Record<string, string> = {
  home: 'M3 11 L12 3.5 L21 11 M5.5 9.5 V20 H10 V14.5 H14 V20 H18.5 V9.5',
  manse: 'M4 4 h7 v7 h-7 Z M13 4 h7 v7 h-7 Z M4 13 h7 v7 h-7 Z M13 13 h7 v7 h-7 Z',
  chat: 'M4 6 a3 3 0 0 1 3-3 h10 a3 3 0 0 1 3 3 v7 a3 3 0 0 1-3 3 H10 l-4.5 4 v-4 H7 a3 3 0 0 1-3-3 Z',
  my: 'M12 4 a4 4 0 1 1 0 8 a4 4 0 0 1 0-8 M4 20 a8 8 0 0 1 16 0',
}
const TABS = [
  { key: 'home', href: '/' },
  { key: 'manse', href: '/manse' },
  { key: 'chat', href: '/chat' },
  { key: 'my', href: '/my' },
] as const

export default function TabBar() {
  const t = useTranslations('tab')
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-3.5 left-1/2 flex w-[calc(100%-28px)] max-w-[612px] -translate-x-1/2 overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-[4px_4px_0_#1A1A1A]">
      {TABS.map(({ key, href }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={key}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-extrabold ${
              active ? 'bg-yellow text-ink' : 'text-text-sub'
            }`}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={ICONS[key]} />
            </svg>
            {t(key)}
          </Link>
        )
      })}
    </nav>
  )
}
```

`@/i18n/navigation`도 생성 — `apps/web/i18n/navigation.ts`:

```typescript
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)
```

- [ ] **Step 7: `app/[locale]/page.tsx` — 홈 플레이스홀더 (앰버 배너 + 마스코트)**

```tsx
import Image from 'next/image'
import { useTranslations } from 'next-intl'

export default function Home() {
  const t = useTranslations('home')
  return (
    <main>
      <header className="mb-4 flex items-center gap-2 text-xl font-black">
        <Image src="/mascot.svg" alt="" width={26} height={26} />
        사주<span className="rounded-md bg-yellow px-1">구리</span>
      </header>
      {/* 앰버 배너 — spec §7.5, 그라데이션 금지 */}
      <section className="flex items-center gap-3 rounded-[18px] border-2 border-ink bg-amber p-4 shadow-[4px_4px_0_#1A1A1A]">
        <Image src="/mascot.svg" alt="" width={44} height={44} />
        <div>
          <h2 className="text-lg font-black">{t('fortuneBanner')}</h2>
          <p className="text-xs font-semibold text-[#5a4a00]">{t('fortuneSub')}</p>
        </div>
      </section>
    </main>
  )
}
```

또한 루트 진입 보정용 `apps/web/app/page.tsx`는 만들지 않는다 — `as-needed`
프리픽스에서 `/`는 미들웨어가 ko로 처리한다.

- [ ] **Step 8: 빌드·동작 검증**

```bash
pnpm install
pnpm --filter web build        # 예상: 빌드 성공 (standalone 출력)
pnpm --filter web dev &        # 백그라운드 기동 후:
curl -s http://localhost:3000/ | grep -o '사주'        # 예상: 사주
curl -s http://localhost:3000/en | grep -o 'SajuGuri'  # 예상: SajuGuri
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health  # 백엔드 기동 시 200
kill %1
```

- [ ] **Step 9: 커밋**

```bash
git add apps/web
git commit -m "feat: i18n 라우팅과 탭 바 셸, 홈 플레이스홀더 추가"
```

---

### Task 7: Dockerfile (standalone 배포 — spec §7.5)

**Files:**
- Create: `apps/web/Dockerfile`, `apps/web/.dockerignore`

- [ ] **Step 1: `apps/web/Dockerfile` 작성** (모노레포 루트 컨텍스트 기준)

```dockerfile
# 빌드: docker build -f apps/web/Dockerfile -t sajuguri-web .  (루트에서)
FROM node:22-alpine AS builder
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/design/package.json packages/design/
COPY packages/core/package.json packages/core/
COPY packages/api-client/package.json packages/api-client/
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
COPY packages packages
RUN pnpm --filter web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

`apps/web/.dockerignore`:

```
node_modules
.next
```

- [ ] **Step 2: 빌드 검증**

```bash
docker build -f apps/web/Dockerfile -t sajuguri-web . && \
docker run --rm -d -p 3100:3000 --name sgweb sajuguri-web && sleep 3 && \
curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/   # 예상: 200
docker rm -f sgweb
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/Dockerfile apps/web/.dockerignore
git commit -m "chore: apps/web Dockerfile 추가 (standalone)"
```

---

### Task 8: AGENTS.md 명령어 갱신 + 마무리 검증

**Files:**
- Modify: `AGENTS.md` (명령어 섹션 — 비커밋 로컬 파일)

- [ ] **Step 1: AGENTS.md 명령어 섹션을 실제 동작 명령으로 교체**

```markdown
## 명령어

\`\`\`bash
# backend (Python 3.10+, uv)
cd backend && uv run pytest
cd backend && make dev

# 모노레포 (pnpm 11 via corepack — 루트에서)
corepack enable                  # pnpm 미설치 환경 1회
pnpm install
pnpm dev                         # apps/web 개발 서버 (turbo)
pnpm build && pnpm test          # 전체 빌드·테스트

# frontend/ (레거시 Nuxt — 신규 작업 금지, 운영 유지용)
cd frontend && pnpm dev
\`\`\`
```

- [ ] **Step 2: 전체 검증 스위트**

```bash
pnpm test        # design 3 + core 1 + api-client 3 = 7 passed
pnpm typecheck   # 전 패키지 통과
pnpm build       # web 빌드 성공
cd backend && uv run pytest -q   # 기존 백엔드 테스트 회귀 없음
```

- [ ] **Step 3: design.md에 토 틴트 확정값 추기 + 커밋**

`docs/design.md` §2.2 기둥 카드 틴트 줄의 "토(머스터드 계열 틴트)"를
"토 `#FBF3D9`"로 교체.

```bash
git add docs/design.md
git commit -m "docs: 오행 토 틴트 확정값(#FBF3D9) 추기"
```

---

## Self-Review 결과

- **Spec 커버리지**: §1.5 모노레포 구조(T1)·공유 패키지(T2-4)·어댑터 규율(T3)·
  i18n ko/en+쿠키(T6)·Nuxt 격리(T1) / §7.5 Docker(T7)·파비콘(T5) — 충족.
  리포트·스토리·채팅 화면은 Phase 1~4 plan 담당 (이 plan 범위 아님)
- **플레이스홀더**: 없음 — 전 단계 실제 코드/명령 포함
- **타입 일관성**: `StorageAdapter`(T3)·`ApiClient`/`ApiError`(T4)·토큰 명칭(T2↔T5
  CSS 변수 kebab-case 변환 규칙 일치) 확인
