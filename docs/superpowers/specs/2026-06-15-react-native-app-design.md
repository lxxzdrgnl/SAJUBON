# 사주구리 React Native (Expo) App — Design Spec

> **Status:** Draft for user review. Written autonomously while the user was asleep, per explicit
> request ("리액트 네이티브 앱 만들고 있어봐 브레인 스토밍 할거 있으면 하고 spec작성부터 하자").
> All non-obvious decisions are recommendations with rationale; anything I couldn't decide alone is in
> **§12 Open Questions**. Nothing is implemented yet — this is design only.

**Goal:** Port the existing 사주구리 web app (Next.js 15) to a native iOS/Android app using Expo,
reusing the existing FastAPI backend and shared TypeScript packages. Target: a fully working app
testable on the user's iPhone via Expo (dev build), structured so App Store / Play Store submission
is a small follow-up step rather than a rewrite.

**Scope boundary (per user):** "일단 테스트까지만 목표로 하자 등록을 원한다면 바로 할 수 있을 정도로."
Primary test surface is iPhone via Expo. No store submission in this scope, but no architectural
choices that would block it.

---

## 1. Why Expo, and what we reuse

The backend and the data layer are already done and battle-tested. This is a **client port**, not a new
product. The win comes from reusing everything below the UI:

| Layer | Reuse strategy |
|---|---|
| **Backend (FastAPI)** | 100% reused. One small additive change for native auth (see §4). |
| **`@sajuguri/api-client`** | Reused as-is. It's a zero-dependency `fetch` wrapper that accepts `baseUrl` + `defaultHeaders`. RN injects `Authorization: Bearer` instead of relying on cookies. |
| **`@sajuguri/core`** | Reused (SSE parser `parseSSEStream`, shared types). |
| **`@sajuguri/design`** | Tokens reused; consumed by a new RN theme module. |
| **`messages/{ko,en}.json`** | Reused verbatim via `use-intl` (the framework-agnostic core of `next-intl`). |
| **UI (`apps/web/**`)** | NOT reused — RN has no DOM. Rebuilt screen-by-screen, but 1:1 against the web feature map (§3). |

**New package layout:** add `apps/mobile` to the existing pnpm workspace, as a sibling of `apps/web`.

```
SajuGuri/
  apps/
    web/            (existing)
    mobile/         (NEW — Expo app)
  packages/
    api-client/     (reused, possibly +1 helper)
    core/           (reused)
    design/         (reused + new RN theme export)
```

---

## 2. Tech stack (recommendations)

Each pick optimizes for **fidelity to the web app** and **familiarity** (the user knows Next.js App
Router + Tailwind). Where a choice is contentious, the alternative and the risk are noted.

| Concern | Choice | Why / alternative |
|---|---|---|
| Framework | **Expo (SDK 52+)** | User-confirmed. Managed workflow + dev builds. |
| Navigation | **expo-router** | File-based routing mirrors Next.js App Router — least cognitive load. Tabs map directly to the web TabBar. Alt: bare react-navigation (more boilerplate). |
| Styling | **NativeWind v4** | Tailwind-for-RN. Lets us port `className` strings and the existing Tailwind mental model. **Risk:** the brutalist *hard-offset shadow* (`4px 4px 0 #1A1A1A`, no blur) has no native equivalent — iOS `shadow*` always blurs, Android uses `elevation`. We solve this with a dedicated `<BrutalShadow>` primitive (a duplicated offset `View` behind the card), NOT CSS shadow. See §6. Alt: plain StyleSheet + theme constants (more verbose, no className reuse). |
| Server state | **TanStack Query** | Caching, polling (jobs), invalidation, retry. Replaces the ad-hoc fetch+useState in web. |
| Token storage | **expo-secure-store** | Keychain/Keystore-backed. NOT AsyncStorage for tokens. |
| Prefs (locale) | **AsyncStorage** | Non-sensitive (selected locale, onboarding flags). |
| Auth flow | **expo-auth-session / expo-web-browser** | `openAuthSessionAsync` (ASWebAuthenticationSession on iOS) for the Google OAuth round-trip. See §4. |
| SVG (mascot, charts) | **react-native-svg** | Required to render the mascot tinting and all chart tools. |
| Markdown (reports/chat) | **react-native-markdown-display** | Custom rule to intercept `[[chart:TOOL]]` markers → inline chart components. |
| Chat streaming (SSE over POST) | **`expo/fetch`** (streaming fetch) | Chat is `POST .../message` returning an SSE stream. `EventSource`/`react-native-sse` are GET-only, so they don't fit. `expo/fetch` supports streaming response bodies. **Risk:** must verify against the backend; fallback is an XHR-progress reader. See §7 and §12. |
| Animations | **react-native-reanimated** | Story transitions, score count-ups, staggered reveals. |
| Image export (story summary) | **react-native-view-shot** + **expo-sharing / expo-media-library** | Replaces the web Canvas export of the Spotify-Wrapped summary card. |
| Push | **expo-notifications** | Token registration + tap-to-navigate. Backend foundation already exists (§8). |
| i18n | **use-intl** | Same ICU message files as web — zero translation re-work. |

---

## 3. Feature map (what screens exist)

Derived 1:1 from the web app. Each row becomes one or more expo-router screens. "Auth" = requires login.

| # | Feature | Route(s) | Auth | Key API calls | Notable UX |
|---|---|---|---|---|---|
| 0 | **Auth** | `/auth/login`, OAuth callback (deep link) | — | Google OAuth → tokens; `getMe`, `logout` | WebBrowser auth session; secure token store |
| 1 | **Home** | `/(tabs)/index` | optional | `listProfiles` | Fortune banner (→ manse picker sheet) + feature cards; MascotTinted by rep stem |
| 2 | **Manse** | `/(tabs)/manse`, `/manse/result` | optional | `calcSaju`, `searchCities` | Birth input (date/time/calendar/city) → pillar chart result + charts |
| 3 | **Report** | `/report/new`, `/report/[id]` | ✅ | `createReportJob`, `getJob` (poll), `getReport`, `deleteReport`, `shareReport` | Async job → tabbed long report w/ inline charts (markdown + `[[chart:]]`) |
| 4 | **Chat** | `/(tabs)/chat`, `/chat/[id]` | ✅ | `listSessions`, `createSession`, `getHistory`, `sendMessage` (SSE), `attachPartner`/`detachPartner`, `deleteSession` | Streaming tokens, inline tool-result cards, partner attach for 궁합 |
| 5 | **Question** | `/question` | optional | `askQuestion`, `listConsultations`, `shareConsultation`, `deleteConsultation` | One-off Q&A w/ manse picker sheet; result w/ optional charts |
| 6 | **Compatibility** | `/compatibility/new`, `/compatibility/[id]` | ✅ | `createCompatibilityJob` (+ `fromSession`), `getJob`, `getCompatibilityReport`, `delete`, `share` | Dual-person slot picker → async job → tabbed report w/ per-person + 궁합 charts |
| 7 | **Daily fortune** | `/fortune` (full-screen story) | optional | `createDailyStory`, `listDailyRecords`, `getDailyRecord`, `deleteDailyRecord`, `createFortuneShare` | Full-screen Spotify-Wrapped story; tap nav; image export of summary |
| 8 | **My / Profile** | `/(tabs)/my`, `/my/profiles` | ✅ | `listProfiles`, `createProfile`, `setRepresentative`, `deleteProfile`; record lists per type | Account, 만세력 CRUD, 내 기록 feed (soft-delete aware), settings, language toggle |
| 9 | **Shared views** (public) | deep links / web fallback | — | `getShared*` (manse/report/question/compatibility/fortune) | **Out of scope for native UI** — shared links open the web app (see §11). |

**Cross-cutting shared components** (build once, reuse everywhere):
`MansePickerSheet`, `BrutalCard`, `BrutalShadow`, `Chip`, `Accordion`, `Button` variants,
`MascotTinted`, `PillarCard`, the chart-tool set, `MarkdownReport`, `ShareSheet`, `TabBar`.

---

## 4. Authentication — the highest-risk piece

**Problem.** Web auth is httpOnly-cookie-based: the OAuth callback does `Set-Cookie: access_token / refresh_token`
and the browser auto-attaches them (`credentials: 'include'`). React Native has **no shared cookie jar**;
httpOnly cookies are invisible to JS and not auto-sent. So native must use **Bearer tokens**.

**Good news.** The backend already supports Bearer:
- `dependencies/auth.py::_extract_token` checks `Authorization: Bearer` **first**, cookie second.
- `POST /api/refresh` already accepts `{ refresh_token }` in the **body** (legacy/native path) and returns JSON tokens.
- Tokens: access = 15 min, refresh = 30 days, HS256.

So the only gap is **getting the initial token pair into the app** after Google OAuth.

### 4.1 Recommended native auth flow (deep-link token return)

Backend `routers/auth.py` already branches on `client` (web vs legacy). Add a **`native`** branch:

1. App builds auth URL: `GET {API}/api/auth/google?client=native` and opens it with
   `WebBrowser.openAuthSessionAsync(authUrl, "sajuguri://auth/callback")`
   (iOS uses ASWebAuthenticationSession — the secure, OS-blessed pattern).
2. User completes Google consent. Backend does the Google code exchange + `social_login` (unchanged).
3. For `client=native`, the callback **redirects to the app scheme** carrying the freshly minted token pair:
   `sajuguri://auth/callback#access_token=...&refresh_token=...`
   (fragment, not query, so tokens never hit server logs of any intermediary).
4. `openAuthSessionAsync` returns that URL to the app; the app parses the tokens and writes them to
   `expo-secure-store`.
5. From then on, every API call sends `Authorization: Bearer <access>`.

**Backend change required (small, additive):** in the OAuth callback, when `oauth_client == "native"`,
redirect to the app scheme with tokens in the fragment instead of setting cookies. ~15 lines. No change
to token issuance, `get_current_user`, or `/api/refresh`.

> **Alternative considered:** a dedicated PKCE `/api/auth/token-exchange` endpoint. Rejected for now —
> more backend work, and the backend already owns the Google exchange, so the deep-link return reuses
> existing logic. Revisit only if we later drop the backend from the OAuth loop.

### 4.2 Token lifecycle in the app

- **Storage:** `expo-secure-store` keys `access_token`, `refresh_token`.
- **API client wrapper:** a thin module wraps `@sajuguri/api-client`'s `ApiClient`, injecting
  `Authorization` from secure store and handling **401 → refresh → retry once**. On refresh failure,
  clear tokens and route to `/auth/login`.
- **Bootstrap:** on launch, if a refresh token exists, attempt `getMe`; on 401, refresh; on failure, treat as logged out.
- **Logout:** `POST /api/auth/logout` (Bearer) → clear secure store.

### 4.3 App scheme / deep links

- Scheme: `sajuguri://` (set in `app.json` `scheme`).
- Universal/App Links (https) deferred — needed only for opening shared web links inside the app, which
  is out of scope (§11). The custom scheme is enough for OAuth callback + push tap routing.

---

## 5. Navigation structure (expo-router)

```
app/
  _layout.tsx                 # root: providers (Query, intl, auth gate, fonts)
  auth/
    login.tsx
    callback.tsx              # handles sajuguri://auth/callback
  (tabs)/
    _layout.tsx               # bottom TabBar (4 tabs)
    index.tsx                 # Home
    manse.tsx                 # Manse input
    chat.tsx                  # Chat session list
    my.tsx                    # My / account
  manse/result.tsx
  report/new.tsx
  report/[id].tsx
  chat/[id].tsx
  question.tsx
  compatibility/new.tsx
  compatibility/[id].tsx
  fortune/index.tsx           # full-screen story (no tab chrome)
  my/profiles.tsx
```

- **TabBar:** 4 tabs (Home, Manse, Chat, My) — matches web. Active tab = yellow bg, brutalist floating
  bar pinned above the safe-area inset. Built as a custom `tabBar` so we control the brutal shadow.
- **Auth gate:** report/chat/compatibility/my require login → redirect to `/auth/login` with a return path.
  Home/manse/question/fortune work logged-out (matching web).

---

## 6. Design system port

All values are already extracted (see the design exploration). Port path:

1. **`packages/design`** gains an RN-safe export (plain JS objects — colors, ohaeng, story palette, radii).
   Tokens are already framework-agnostic TS; just ensure no web-only imports leak.
2. **NativeWind theme** maps tokens to Tailwind classes so we keep `bg-yellow`, `border-ink`, etc.
3. **The brutal shadow is the one thing that does NOT translate.** `shadow-[4px_4px_0_#1A1A1A]` is a
   *hard offset with zero blur*. iOS shadows always blur; Android uses elevation (also blurred, and
   z-only). **Solution:** a `<BrutalShadow offset={4}>` primitive that renders a solid `#1A1A1A` View
   shifted +x/+y behind its child. Every brutal card/button/chip/tab composes through it. This is the
   single most important fidelity primitive — get it right first.
4. **Fonts:** body = system (SF Pro / Roboto). Ganji (한자) = **Noto Serif KR** bundled via
   `expo-font` (only the weights 700/900 used). Verify hanja glyph coverage on device.
5. **MascotTinted:** port the mascot SVG to `react-native-svg`; apply `stemToMascotBody(stem)` tint;
   gray stems (임/계) get the glow + black facial detail special-case. Reuse the `ganjiNickname.ts`
   stem→color map (pure logic, port directly).
6. **Fortune story palette:** port `lib/fortune/story.ts` (pure functions — palette pool, `cardPalette`,
   accent pairs, luminance-based ink). No web dependency; direct port.

---

## 7. Hard parts, called out

These four carry the implementation risk. Plans should schedule them with buffer and a fallback each.

1. **Brutal shadow fidelity (§6.3)** — solved by `BrutalShadow`, but every primitive depends on it. Build + visually verify on a real iPhone before building screens on top.
2. **Chat SSE over POST (§2 streaming)** — `POST /chat/{id}/message` streams SSE. Verify `expo/fetch`
   streaming works end-to-end against the backend; if not, fall back to an XHR `onprogress` incremental
   reader feeding the existing `parseSSEStream`. **De-risk this in a spike before the full chat screen.**
3. **Inline chart markers** — reports/chat embed `[[chart:TOOL_NAME]]` in markdown; ~12 chart tools must
   be reimplemented in `react-native-svg`. This is volume work; each chart is a small isolated component.
4. **Fortune story** — full-screen gesture nav + Reanimated transitions + count-ups + canvas-equivalent
   image export (view-shot). Highest UI complexity; schedule last among features.

---

## 8. Push notifications

Backend foundation already exists:
- `POST /api/devices { platform, token }` (Bearer) — idempotent upsert; `DeviceToken` table.
- On job completion, backend POSTs to `https://exp.host/--/api/v2/push/send` with
  `{ to, title, body, data: { type, result_id } }`; `DeviceNotRegistered` → token auto-deleted.

App responsibilities:
1. `Notifications.requestPermissionsAsync()` after first login.
2. `getExpoPushTokenAsync()` → `registerDeviceToken(api, { platform, token })` on login + token refresh.
3. Foreground handler + **tap handler**: route `data.type` (`saju_report` | `compatibility`) +
   `data.result_id` → the corresponding detail screen.
4. iOS push on a physical device requires an Expo dev build (not Expo Go) and APNs creds — but APNs
   setup is an EAS one-time credential step, deferred until the user wants real-device push. Token
   registration + tap routing can be built and unit-exercised before that.

---

## 9. i18n

- Reuse `apps/web/messages/{ko,en}.json` **verbatim** via `use-intl` (next-intl's framework-agnostic core,
  same ICU format). Point the mobile app at the same files (workspace import or a copy step — TBD §12).
- Locale: detect via `expo-localization`, persist override in AsyncStorage, default `ko` (matches web's
  "force Korean even on English device" behavior — the user has repeatedly flagged unwanted English).
- **Note:** the user has strong feelings about accidental English ("왜 계속 영어로 말해"). Default and
  fallback must be `ko`; never let an untranslated key render an English fallback in the Korean UI.

---

## 10. Data & state

- **TanStack Query** for all server reads; mutations invalidate the relevant query keys.
- **Job polling:** `useJob(jobId)` query with `refetchInterval` (~2.5s, matching web's `useGenerationJob`),
  stop on `done`/`failed`, hard cap ~4 min, then show a "still cooking, we'll notify you" state (push
  covers the rest). Report/compatibility creation returns `202 { job_id }` → navigate to a generating
  screen that polls.
- **Soft delete:** all list queries already exclude `deleted_at` server-side; the app just renders what
  it gets and offers delete (DELETE endpoints already soft-delete). Honor the project rule that every
  content type supports delete.

---

## 11. Out of scope (this phase)

- **Native rendering of public shared links.** Shared `getShared*` views stay web-only; if the app needs
  to open one, it opens the web URL in a browser. Native deep-link handling of share tokens is deferred.
- **Store submission** (App Store / Play). Architecture stays submission-ready (EAS config, icons, splash
  scaffolded) but no signing/review in this phase.
- **Real-device iOS push delivery** (needs APNs creds via EAS) — wiring built, live delivery deferred.
- **Android-specific polish** — primary test target is iPhone; Android should run but isn't the focus.
- **Offline mode / caching beyond Query defaults.**

---

## 12. Open questions (need user answer when awake)

1. **pnpm on host is broken** (per project memory — backend tests use `uv`, web uses `npx tsc`). Expo
   dev (`npx expo start` + Metro) needs a working JS package manager **on the host** (Metro + device
   connection don't run in Docker comfortably). How do you want to handle this — fix host pnpm, use
   npm/yarn just for `apps/mobile`, or another approach? **This blocks Phase 0.**
2. **Styling approach:** NativeWind (port Tailwind classes, recommended) vs plain StyleSheet+theme.
   Confirm NativeWind is acceptable.
3. **Message file sharing:** import `apps/web/messages/*.json` across the workspace, or copy into
   `apps/mobile`? (Workspace import keeps them in sync but couples the apps.)
4. **App identity:** confirm scheme `sajuguri://` and bundle IDs (e.g., `com.sajuguri.app` iOS /
   `com.sajuguri.app` Android).
5. **Backend native-auth change:** OK to add the `client=native` deep-link token-return branch to the
   OAuth callback (§4.1)? It's additive and won't affect web.
6. **Chat SSE:** acceptable to spike `expo/fetch` streaming first, with the XHR fallback if it fails (§7.2)?
7. **Feature ordering:** the phase plan (§13) front-loads scaffold→auth→home→manse and defers chat/
   compatibility/story. Any feature you want pulled earlier for testing?

---

## 13. Phased roadmap (each phase = its own implementation plan later)

Phases are ordered so the app is **runnable and testable on your iPhone as early as possible**, with the
hardest/most-visual features last. Each is independently shippable to a dev build.

- **Phase 0 — Scaffold & design foundation.** Add `apps/mobile` Expo app to the workspace; expo-router
  skeleton; NativeWind + token theme; `BrutalShadow` + core primitives (`BrutalCard`, `Chip`, `Button`,
  `Accordion`); fonts; consume shared packages. Exit: blank-but-branded app runs on iPhone.
- **Phase 1 — Auth.** Backend `client=native` branch; WebBrowser OAuth; secure-store tokens; api-client
  Bearer+refresh wrapper; `getMe`; login/logout; auth gate. Exit: log in with Google on device.
- **Phase 2 — Navigation & Home.** TabBar; Home (fortune banner + feature cards); `MascotTinted`;
  `MansePickerSheet`; profile list. Exit: navigate the shell, see personalized home.
- **Phase 3 — Manse.** Birth input (date/time/calendar/city search) → `calcSaju` → `PillarCard` result +
  per-person charts. Exit: compute and view a 만세력 natively.
- **Phase 4 — Profiles & My.** Profile CRUD, representative, my-records feed (soft-delete aware),
  settings, language toggle. Exit: manage 만세력 and account.
- **Phase 5 — Report.** Create job → polling/generating screen → tabbed report with markdown +
  `[[chart:]]` inline charts; share; delete. Exit: generate and read a full report.
- **Phase 6 — Question.** One-off Q&A with picker sheet; history; share; delete.
- **Phase 7 — Chat.** SSE spike first; session list; streaming chat with tool cards; partner attach.
- **Phase 8 — Compatibility.** Dual-person picker; job; tabbed report with per-person + 궁합 charts.
- **Phase 9 — Daily fortune story.** Full-screen Reanimated story; image export; records.
- **Phase 10 — Push.** Token registration; foreground + tap routing to results.
- **Phase 11 — Polish & store-readiness.** i18n sweep; share fidelity; icons/splash; EAS config so a
  build can be submitted on demand.

---

## Appendix A — API client surface (reused)

Auth: `getMe`, `logout`. Cities: `searchCities`. Profiles: `listProfiles`, `createProfile`,
`setRepresentative`, `deleteProfile`. Saju: `calcSaju`. Daily: `createDailyStory`, `listDailyRecords`,
`getDailyRecord`, `deleteDailyRecord`, `createFortuneShare`, `getSharedFortune`. Question: `askQuestion`,
`listConsultations`, `shareConsultation`, `getSharedConsultation`, `deleteConsultation`. Share:
`createShare`, `getSharedResult`. Reports: `createReportJob`, `listReports`, `getReport`, `deleteReport`,
`shareReport`, `getSharedReport`. Compatibility: `createCompatibilityJob`,
`createCompatibilityJobFromSession`, `listCompatibilityReports`, `getCompatibilityReport`,
`deleteCompatibilityReport`, `shareCompatibilityReport`, `getSharedCompatibilityReport`. Chat:
`listSessions`, `deleteSession`, `createSession`, `getHistory`, `attachPartner`, `detachPartner`,
`sendMessage` (SSE). Devices: `registerDeviceToken`. Jobs: `getJob`.

The `ApiClient` accepts `baseUrl` + `defaultHeaders`; native passes `Authorization: Bearer`. All
endpoints with public `getShared*` variants need no auth.

## Appendix B — Brand tokens (port targets)

Core: `--bg-base #FFFBF2`, `--ink #1A1A1A`, `--yellow #FFD900`, `--yellow-tint #FFF3B0`,
`--amber #FFB200`, `--orange #FF6B00`, `--orange-tint #FFE1CC`, `--teal #00C2B8`, `--teal-deep #00857D`,
`--teal-tint #D7F7F4`, `--surface #FFFFFF`, `--border-soft #EBE3D2`, `--text-sub #8A8270`,
`--sky #4DA8E8`, `--sky-tint #DCEFFB`.
Ohaeng: 목 #00A86B, 화 #FF6B00, 토 #D9A400, 금 #7D7A70, 수 #0090A8 (+ tints).
Stem→mascot: 갑/을 #7FC7BE, 병/정 #EA6845, 무/기 #FFD900, 경/신 #E8EAED, 임/계 #8B8178 (glow).
Radii: card 16, button 11, chip 10, pill 999, sheet 22. Shadow: brutal `4px 4px 0 #1A1A1A` (→ `BrutalShadow`).
Story palette: 20-color vivid pool + curated accent pairs (port `story.ts` directly).
