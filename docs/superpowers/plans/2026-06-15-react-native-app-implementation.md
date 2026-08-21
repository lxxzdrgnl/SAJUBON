# 사주구리 React Native (Expo) App — Implementation Plan

> **For agentic workers:** Execute with superpowers:subagent-driven-development. Steps use `- [ ]`.
> Spec: `docs/superpowers/specs/2026-06-15-react-native-app-design.md`.

**Goal:** Port the 사주구리 web app to a native iOS/Android Expo app, reusing the FastAPI backend and
`@sajuguri/*` packages.

**Architecture:** Expo SDK 56 + expo-router (file routes) in the existing pnpm monorepo. NativeWind v4
mirrors the web Tailwind tokens (className parity). Auth uses Bearer tokens (not cookies) via a deep-link
OAuth return. Server state via TanStack Query.

**Tech stack:** expo-router, NativeWind v4 + react-native-css-interop, react-native-svg, TanStack Query,
expo-secure-store, expo-auth-session/web-browser, expo-notifications, use-intl, react-native-markdown-display.

---

## Status legend
- ✅ DONE (committed + validated: `tsc --noEmit` clean, `expo export` bundles, `expo-doctor` 21/21)
- 🟡 IN PROGRESS
- ⬜ TODO

| Phase | Status | Commit |
|---|---|---|
| Backend: native OAuth branch | ✅ | `fc1c233` |
| 0 — Scaffold & design system | ✅ | `f13a2d2` |
| 1 — Auth (Bearer + Google OAuth) | ✅ | `c42b601` |
| 2 — Home profile integration | ✅ | `a94a091` |
| 3 — Manse (input → calc → result) | ✅ | `15b097c` |
| 4 — Profiles & My records | ✅ | `2f0acf1` |
| 5 — Report (async job + tabbed report) | ✅ | `8ed4244` |
| 6 — Question (one-off Q&A) | ✅ | `2e6ea68` |
| 7 — Chat (SSE streaming) | ✅ | `c2c71cc` |
| 8 — Compatibility | ✅ | `c91dc01` |
| 9 — Daily fortune story | ✅ | `e168f89` |
| 10 — Push notifications | ✅ | `227a86b` |
| 11 — i18n sweep + store-readiness | ⬜ deferred | |

**All phases validated:** `tsc --noEmit` clean, `expo export` bundles 1977 modules, `expo-doctor` 21/21.
Validation is build-level only — on-device visual/interaction QA, real Google OAuth, and push delivery
require the user's iPhone + an EAS dev build.

## Deferred / follow-up (documented cuts, not blockers for testing)
- **MansePicker bottom sheet** — each entry screen (manse/report/question/compatibility) does its own
  profile-pick / birth-form inline; a shared bottom-sheet picker is a nice-to-have refactor.
- **Inline charts in report/compat/chat** — `[[chart:]]` markers are stripped cleanly (no raw tokens);
  the ~12-tool react-native-svg chart system is the main remaining feature. Manse already has its own
  charts (WuxingBar/StrengthSection/TenGodsRow/DaeUnRow) to draw from.
- **Chat partner attach** (`request_partner`/`attachPartner`) — event handled but no inline UI yet.
- **Phase 11 i18n** — UI is Korean-only (matches the user's strong ko preference); `use-intl` string
  externalization deferred. Fonts: web already uses system gothic for ganji (`font-serif`→sans), so no
  CJK font bundling needed to match. Store assets (icon/splash) use Expo defaults — generate from the
  mascot before submission.
- **BirthInputForm extraction** — currently `@/components/manse/BirthInputForm`, reused across phases by import; fine as-is.

---

## Established conventions (every task MUST follow)

**Imports / primitives:** `@/components/ui/{Screen,BrutalCard,BrutalShadow,Button,Chip,CardIcon,MascotTinted}`,
`@/theme` (colors, ohaeng, ohaengTint, radii, MAX_WIDTH), `@/lib/ganji`, `@/lib/auth/AuthContext` (`useAuth()` → `{ status, user, api, login, logout }`).
**API:** all functions from `@sajuguri/api-client` take `api` first; pass `useAuth().api`. Exact request/response
types live in `packages/api-client/src/types.ts` — read them, don't guess.
**Styling:** NativeWind className, web-parity names (`bg-bg-base`, `text-ink`, `border-ink`, `bg-yellow`,
`text-text-sub`...). Hard shadows ONLY via `BrutalShadow`. No gray borders, no pastel backgrounds.
**Hanja:** `font-serif` class. **All UI text Korean** (user is sensitive to accidental English; ko default + fallback).
**Validation per task:** `cd apps/mobile && npx tsc --noEmit` (zero errors) + controller runs `expo export` before commit.
**Commit style:** no Co-Authored-By, no scope parens, split independent changes.

---

## Phase 2 — Home profile integration + MansePicker

**Files:** Modify `src/app/(tabs)/index.tsx`; Create `src/components/manse/MansePickerSheet.tsx`,
`src/lib/queries.ts` (shared query hooks).

- [ ] Add `useProfiles()` query hook in `src/lib/queries.ts` wrapping `listProfiles(api)` (enabled only when `status==='authed'`).
- [ ] Home header: show representative profile's mascot (`day_stem`) + name; fallback to default mascot + "사주구리" when guest/none. (Web ref: `apps/web/app/[locale]/page.tsx` repProfile logic.)
- [ ] Fortune banner subtitle: time-based greeting with rep name (port `apps/web/lib/greetings.ts`).
- [ ] `MansePickerSheet`: bottom sheet listing saved profiles + "직접 입력" option. Reused by manse/report/question/compatibility entry points. Use a RN modal (react-native Modal or @gorhom/bottom-sheet — prefer the latter only if needed; a plain Modal is fine).
- [ ] Wire feature cards: 만세력→picker→/manse/result; 풀리포트→(login gate)→picker→/report/new; etc. Guests get login prompt for auth-only features.

## Phase 3 — Manse (IN PROGRESS via subagent)

**Files:** `src/app/(tabs)/manse.tsx` (input form), `src/app/manse/result.tsx`, `src/components/manse/*`.
Birth input → `calcSaju` → result (four pillars, ilju hero, element balance, strength, yongsin, ten gods, dae-un).
The `BirthInputForm` built here is the shared input reused by Phases 5/6/8.

- [ ] (subagent) Build per the dispatched brief; controller validates `expo export` + reviews + commits.
- [ ] Follow-up: extract `BirthInputForm` to `src/components/forms/BirthInputForm.tsx` if subagent kept it manse-local, so report/question/compatibility reuse it.

## Phase 4 — Profiles & My records

**Files:** `src/app/(tabs)/my.tsx` (extend), `src/app/my/profiles.tsx`, `src/components/records/*`.
API: `listProfiles`, `createProfile`, `setRepresentative`, `deleteProfile`; record lists per type.

- [ ] `my/profiles.tsx`: list saved 만세력 (mascot by day_stem, name, birth summary), create (reuse BirthInputForm), set representative, delete (confirm dialog). Soft-delete is server-side; just call delete + invalidate query.
- [ ] My records feed: tabs/sections for reports, compatibility, consultations, daily — each via its `list*` function, with delete. (Web ref: `apps/web/lib/records/registry.tsx`.) Honor the project rule that every content type supports delete.
- [ ] Empty/guest states in Korean.

## Phase 5 — Report (async job + tabbed report)

**Files:** `src/app/report/new.tsx`, `src/app/report/[id].tsx`, `src/components/report/*`,
`src/components/charts/*`, `src/components/markdown/MarkdownReport.tsx`, `src/lib/jobs.ts`.
API: `createReportJob` (202 `{job_id}`), `getJob` (poll), `getReport`, `deleteReport`, `shareReport`.

- [ ] `useJob(jobId)` hook: `useQuery` with `refetchInterval` 2500ms, stop on `done`/`failed`, ~4min cap, then "still cooking / we'll notify you" state.
- [ ] `report/new.tsx`: pick profile (MansePicker) or BirthInputForm → `createReportJob` → navigate to a generating screen polling the job → on `done` go to `report/[id]`.
- [ ] `MarkdownReport`: render markdown via `react-native-markdown-display` with a custom rule intercepting `[[chart:TOOL_NAME]]` markers → inline chart components. (Web ref: chart marker system; read how web maps markers.)
- [ ] Chart components in `src/components/charts/` (react-native-svg): wuxing balance, strength, ten gods, dae-un timeline, etc. Build incrementally; reuse across report/compatibility/question.
- [ ] `report/[id].tsx`: tabbed report (tabs[], year_flow, dae_un_analysis, charts). Share + delete actions.

## Phase 6 — Question (one-off Q&A)

**Files:** `src/app/question.tsx`, `src/components/question/*`.
API: `askQuestion`, `listConsultations`, `shareConsultation`, `deleteConsultation`.

- [ ] Question screen: MansePicker/BirthInputForm + question text + category → `askQuestion` → render headline + content (+ optional charts via MarkdownReport). History list + share + delete.

## Phase 7 — Chat (SSE streaming) — DE-RISK FIRST

**Files:** `src/app/(tabs)/chat.tsx` (session list), `src/app/chat/[id].tsx`, `src/components/chat/*`, `src/lib/sse.ts`.
API: `listSessions`, `createSession`, `getHistory`, `sendMessage` (SSE over POST), `attachPartner`/`detachPartner`, `deleteSession`. SSE parser: `parseSSEStream` from `@sajuguri/core`.

- [ ] **Spike:** verify `expo/fetch` streams the `POST /api/chat/{id}/message` SSE body. `sendMessage(sessionId, message, baseUrl, token)` — pass `API_BASE` + access token. If `expo/fetch` streaming fails, fall back to an XHR `onprogress` incremental reader feeding `parseSSEStream`. Decide before building the screen.
- [ ] Session list (tab): list + create + delete. Chat screen: history + streaming bubbles (user=yellow right, AI=teal-border left + mascot), inline tool-result cards, partner attach for 궁합.

## Phase 8 — Compatibility

**Files:** `src/app/compatibility/new.tsx`, `src/app/compatibility/[id].tsx`, `src/components/compat/*`.
API: `createCompatibilityJob` (+ `fromSession`), `getJob`, `getCompatibilityReport`, `deleteCompatibilityReport`, `shareCompatibilityReport`.

- [ ] Dual-person slot picker (each slot = MansePicker/BirthInputForm) → `createCompatibilityJob` → poll job → `compatibility/[id]`.
- [ ] Tabbed report: score, synastry, tabs, per-person + 궁합-specific charts (day-relation, yongsin, branches+hap). Reuse chart components from Phase 5. Share + delete.

## Phase 9 — Daily fortune story

**Files:** `src/app/fortune/index.tsx`, `src/components/fortune/*`, `src/lib/story.ts` (port `apps/web/lib/fortune/story.ts`).
API: `createDailyStory`, `listDailyRecords`, `getDailyRecord`, `deleteDailyRecord`, `createFortuneShare`.

- [ ] Port `story.ts` (vivid 20-color pool, `cardPalette`, accent pairs, luminance ink) — pure logic, direct port.
- [ ] Full-screen story (no tab chrome): Reanimated card transitions, tap-zones (left=prev, right=next), segment progress, score count-ups, MascotTinted. Card sequence: intro, overall, 6 categories, color, caution, summary.
- [ ] Summary card image export: `react-native-view-shot` → `expo-sharing`/`expo-media-library` (replaces web Canvas export).

## Phase 10 — Push notifications

**Files:** `src/lib/push.ts`, hook into `AuthContext` + root layout.
API: `registerDeviceToken(api, { platform, token })`. Backend already sends on job completion with `data: { type, result_id }`.

- [ ] After first login: `Notifications.requestPermissionsAsync()` → `getExpoPushTokenAsync()` → `registerDeviceToken` (on login + token refresh).
- [ ] Foreground handler + **tap handler**: route `data.type` (`saju_report`|`compatibility`) + `result_id` to the detail screen.
- [ ] Note: real iOS delivery needs an EAS dev build + APNs creds (deferred); wiring + tap-routing built now.

## Phase 11 — i18n sweep + store-readiness

**Files:** `src/lib/i18n.ts`, root layout provider; `app.json`, assets.
- [ ] `use-intl` provider consuming `apps/web/messages/{ko,en}.json` (shared import — workspace path or a small sync). Replace hardcoded Korean strings with `t()` keys progressively. Default + fallback `ko` (never English fallback in Korean UI).
- [ ] Locale detect via `expo-localization`, override persisted in AsyncStorage.
- [ ] Bundle NotoSerifKR (Bold/Black) via `expo-font` for hanja; app icon + splash from brand assets; finalize `app.json` (icons, splash) so an EAS build is submission-ready.

---

## Risks / open items
1. **API base URL for device testing** — `EXPO_PUBLIC_API_BASE` must point to host LAN IP or prod domain (iPhone can't reach localhost). See `.env.example`.
2. **Chat SSE over POST** — de-risk `expo/fetch` streaming before Phase 7 (XHR fallback ready).
3. **Chart volume** — ~12 chart tools to reimplement in react-native-svg; build incrementally, shared across phases.
4. **On-device verification** — controller validates via `tsc` + `expo export` only; visual/interaction QA and real OAuth/push require the user's iPhone.
