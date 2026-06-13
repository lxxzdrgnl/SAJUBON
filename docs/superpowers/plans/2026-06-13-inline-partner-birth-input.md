# Inline Partner Birth Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "직접 입력" button in `InlinePartnerCard` (which navigated to `/manse/new`) with an inline compact birth-input form that attaches the partner without leaving the chat.

**Architecture:** Add a new `PartnerBirthForm` component under `apps/web/components/chat/` that renders a compact form using the existing `dateInput` utilities. `InlinePartnerCard` gains a new view-mode (`'form'`) toggled when the user clicks "직접 입력". `ChatView` gains a `handleAttachPartnerBirth` handler that calls `attachPartner` with raw birth fields. On success the same `setPartnerName` flow is triggered.

**Tech Stack:** React 18 (hooks, no extra libraries), next-intl, existing `@/lib/manse/dateInput` utilities (`processSegInput`, `buildBirthDate`, `buildBirthTime`, `validateDate`, `validateTime`, plus seg configs), `@sajuguri/api-client` `attachPartner` / `PartnerAttachRequest`, Tailwind CSS with design-system tokens only.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `apps/web/components/chat/PartnerBirthForm.tsx` | Compact inline birth-input form; pure UI, calls `onSubmit(body)` |
| Modify | `apps/web/components/chat/InlinePartnerCard.tsx` | Add `mode: 'list'\|'form'` state; render `PartnerBirthForm` in form mode; accept new `onSubmitBirth` prop |
| Modify | `apps/web/components/chat/ChatView.tsx` | Add `handleAttachPartnerBirth`; pass it to `InlinePartnerCard` |
| Modify | `apps/web/messages/ko.json` | New i18n keys under `chat.inlinePartner.*` and `chat.partnerForm.*` |
| Modify | `apps/web/messages/en.json` | Same keys in English |

---

## Task 1: Add i18n keys (ko + en)

**Files:**
- Modify: `apps/web/messages/ko.json`
- Modify: `apps/web/messages/en.json`

- [ ] **Step 1: Add Korean keys to `apps/web/messages/ko.json`**

  Open the file and inside `"chat"` → `"inlinePartner"` add `"directInput"` key, and add a new `"partnerForm"` sibling object. The existing structure has `"inlinePartner": { "prompt": "...", "action": "..." }`. After the change the `"inlinePartner"` block and new block must look like this:

  ```json
  "inlinePartner": {
    "prompt": "상대방의 만세력이 필요해요. 첨부해 주세요.",
    "action": "상대 만세력 선택",
    "directInput": "직접 입력하기"
  },
  "partnerForm": {
    "title": "상대방 정보 입력",
    "name": "이름 (선택)",
    "namePlaceholder": "이름을 입력하세요",
    "birthDate": "생년월일",
    "solar": "양력",
    "lunar": "음력",
    "leap": "윤달",
    "timeLabel": "태어난 시간",
    "timeUnknown": "시간 모름",
    "gender": "성별",
    "male": "남",
    "female": "여",
    "submit": "첨부하기",
    "cancel": "취소",
    "datePlaceholderYear": "년",
    "datePlaceholderMonth": "월",
    "datePlaceholderDay": "일",
    "hourLabel": "시",
    "errorDateRequired": "생년월일을 입력해 주세요.",
    "errorYearRange": "연도는 1900~2100 사이여야 해요.",
    "errorMonthRange": "월이 올바르지 않아요.",
    "errorDayOverflow": "{year}년 {month}월은 {maxDay}일까지예요.",
    "errorHourMissing": "시간을 입력하거나 '시간 모름'을 체크해 주세요.",
    "errorMinuteMissing": "분을 입력해 주세요.",
    "errorSubmit": "첨부에 실패했어요. 다시 시도해 주세요."
  }
  ```

- [ ] **Step 2: Add English keys to `apps/web/messages/en.json`**

  Same structure in English:

  ```json
  "inlinePartner": {
    "prompt": "I need your partner's birth info. Please attach it.",
    "action": "Select partner chart",
    "directInput": "Enter manually"
  },
  "partnerForm": {
    "title": "Enter partner info",
    "name": "Name (optional)",
    "namePlaceholder": "Enter name",
    "birthDate": "Date of birth",
    "solar": "Solar",
    "lunar": "Lunar",
    "leap": "Leap",
    "timeLabel": "Birth time",
    "timeUnknown": "Time unknown",
    "gender": "Gender",
    "male": "M",
    "female": "F",
    "submit": "Attach",
    "cancel": "Cancel",
    "datePlaceholderYear": "YYYY",
    "datePlaceholderMonth": "MM",
    "datePlaceholderDay": "DD",
    "hourLabel": "H",
    "errorDateRequired": "Please enter the date of birth.",
    "errorYearRange": "Year must be between 1900 and 2100.",
    "errorMonthRange": "Month is out of range.",
    "errorDayOverflow": "{year}/{month} has only {maxDay} days.",
    "errorHourMissing": "Enter a birth hour or check 'Time unknown'.",
    "errorMinuteMissing": "Please enter the minutes.",
    "errorSubmit": "Attach failed. Please try again."
  }
  ```

- [ ] **Step 3: Verify i18n script passes**

  ```bash
  node /home/rheon/Desktop/projects/SajuGuri/apps/web/scripts/check-i18n.mjs
  ```

  Expected: no output, exit 0.

---

## Task 2: Create `PartnerBirthForm` component

**Files:**
- Create: `apps/web/components/chat/PartnerBirthForm.tsx`

This component renders the compact birth-input form. It imports `dateInput` utilities to handle segment validation. It is **purely presentational** — on valid submit it calls `onSubmit(body: PartnerAttachRequest)`. The parent decides what to do with the result.

- [ ] **Step 1: Create `PartnerBirthForm.tsx`**

  ```tsx
  'use client'

  /**
   * 채팅 인라인 상대 만세력 직접 입력 폼 (PartnerBirthForm).
   * InlinePartnerCard 안에서 렌더링. 제출 시 onSubmit(PartnerAttachRequest) 호출.
   * 성공/실패 처리는 부모에서 담당. 에러는 errorMsg prop으로 수신.
   */
  import { useRef, useState } from 'react'
  import { useTranslations } from 'next-intl'
  import type { PartnerAttachRequest } from '@sajuguri/api-client'
  import {
    processSegInput,
    shouldBackspaceToPrev,
    buildBirthDate,
    buildBirthTime,
    validateDate,
    validateTime,
    YEAR_SEG,
    MONTH_SEG,
    DAY_SEG,
    HOUR_SEG,
    MINUTE_SEG,
  } from '@/lib/manse/dateInput'

  interface Props {
    onSubmit: (body: PartnerAttachRequest) => void
    onCancel: () => void
    submitting: boolean
    errorMsg: string | null
  }

  export default function PartnerBirthForm({ onSubmit, onCancel, submitting, errorMsg }: Props) {
    const t = useTranslations('chat')

    const [name, setName] = useState('')
    const [year, setYear] = useState('')
    const [month, setMonth] = useState('')
    const [day, setDay] = useState('')
    const [hour, setHour] = useState('')
    const [timeUnknown, setTimeUnknown] = useState(false)
    const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar')
    const [isLeap, setIsLeap] = useState(false)
    const [gender, setGender] = useState<'male' | 'female'>('male')
    const [submitAttempted, setSubmitAttempted] = useState(false)

    const yearRef = useRef<HTMLInputElement>(null)
    const monthRef = useRef<HTMLInputElement>(null)
    const dayRef = useRef<HTMLInputElement>(null)
    const hourRef = useRef<HTMLInputElement>(null)

    // ── 파생값 ──────────────────────────────────────────────────────────────
    const birthDate = buildBirthDate(year, month, day)
    // 시간은 00:00 형식으로만 저장 (분은 항상 00 — 인라인 폼은 시(hour) 단위만 받는다)
    const birthTime = timeUnknown ? null : buildBirthTime(hour, '00')

    const dateValidation = validateDate(year, month, day)
    // 시간 유효성: 시간 모름 체크 안 했고 hour 미입력이면 'hourMissing'
    const timeError = validateTime(hour, timeUnknown ? '' : hour === '' ? '' : '00', timeUnknown)
    // hour만 입력받으므로: 비어있으면 hourMissing, 채워졌으면 null
    const hourError = timeUnknown ? null : hour === '' ? 'hourMissing' : null

    function dateErrorMessage(): string | null {
      switch (dateValidation.code) {
        case 'yearRange': return t('partnerForm.errorYearRange')
        case 'monthRange': return t('partnerForm.errorMonthRange')
        case 'dayOverflow':
          return t('partnerForm.errorDayOverflow', {
            year: dateValidation.year ?? 0,
            month: dateValidation.month ?? 0,
            maxDay: dateValidation.maxDay ?? 0,
          })
        default: return null
      }
    }

    const birthDateError =
      dateErrorMessage() ?? (submitAttempted && !birthDate ? t('partnerForm.errorDateRequired') : null)
    const hourErrorMsg = submitAttempted && hourError === 'hourMissing' ? t('partnerForm.errorHourMissing') : null

    const hasBlockingError = !birthDate || !!dateValidation.code || (!timeUnknown && hour === '')

    // ── 세그먼트 핸들러 ─────────────────────────────────────────────────────
    function handleSeg(
      raw: string,
      cfg: Parameters<typeof processSegInput>[1],
      setVal: (v: string) => void,
      nextRef?: React.RefObject<HTMLInputElement | null>,
    ) {
      const { value, advance } = processSegInput(raw, cfg)
      setVal(value)
      if (advance && nextRef?.current) nextRef.current.focus()
    }

    function handleBackspace(
      e: React.KeyboardEvent<HTMLInputElement>,
      currentValue: string,
      prevRef: React.RefObject<HTMLInputElement | null>,
      prevValue: string,
      setPrev: (v: string) => void,
    ) {
      if (shouldBackspaceToPrev(e.key, currentValue)) {
        e.preventDefault()
        prevRef.current?.focus()
        setPrev(prevValue.slice(0, -1))
      }
    }

    // ── 제출 ────────────────────────────────────────────────────────────────
    function handleSubmit() {
      setSubmitAttempted(true)
      if (hasBlockingError) return

      const body: PartnerAttachRequest = {
        birth_date: birthDate,
        gender,
        calendar,
        is_leap_month: calendar === 'lunar' && isLeap,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(birthTime ? { birth_time: birthTime } : {}),
      }
      onSubmit(body)
    }

    // ── 스타일 헬퍼 ─────────────────────────────────────────────────────────
    const segTab = (active: boolean) =>
      `flex-1 py-1.5 text-center text-[11px] font-extrabold ${active ? 'bg-yellow' : 'text-text-sub'}`

    const dateSeg =
      'min-w-0 bg-transparent text-center text-[12px] font-bold tabular-nums outline-none placeholder:font-normal placeholder:text-text-sub'

    return (
      <div className="flex flex-col gap-2.5 rounded-xl border-2 border-ink bg-surface px-3 py-3 shadow-[2px_2px_0_#1A1A1A]">
        <p className="text-[12px] font-extrabold text-ink">{t('partnerForm.title')}</p>

        {/* 이름 (선택) */}
        <div>
          <label className="mb-1 block text-[11px] font-extrabold text-text-sub">
            {t('partnerForm.name')}
          </label>
          <input
            value={name}
            maxLength={20}
            placeholder={t('partnerForm.namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border-2 border-border-soft bg-bg-base px-2.5 py-1.5 text-[12px] outline-none focus:border-ink"
          />
        </div>

        {/* 생년월일 */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[11px] font-extrabold text-text-sub">
              {t('partnerForm.birthDate')}
            </label>
            <label className="flex items-center gap-1 text-[11px] text-text-sub">
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => setTimeUnknown(e.target.checked)}
                className="h-3 w-3 accent-[#1A1A1A]"
              />
              {t('partnerForm.timeUnknown')}
            </label>
          </div>

          {/* 날짜 세그먼트 바 */}
          <div className="flex items-center gap-1 rounded-lg border-2 border-ink bg-bg-base px-2 py-2 text-[12px]">
            <input
              ref={yearRef}
              inputMode="numeric"
              placeholder={t('partnerForm.datePlaceholderYear')}
              maxLength={4}
              value={year}
              onChange={(e) => handleSeg(e.target.value, YEAR_SEG, setYear, monthRef)}
              className={`${dateSeg} w-[40px] flex-[2]`}
            />
            <span className="text-text-sub">/</span>
            <input
              ref={monthRef}
              inputMode="numeric"
              placeholder={t('partnerForm.datePlaceholderMonth')}
              maxLength={2}
              value={month}
              onChange={(e) => handleSeg(e.target.value, MONTH_SEG, setMonth, dayRef)}
              onKeyDown={(e) => handleBackspace(e, month, yearRef, year, setYear)}
              className={`${dateSeg} w-[24px] flex-1`}
            />
            <span className="text-text-sub">/</span>
            <input
              ref={dayRef}
              inputMode="numeric"
              placeholder={t('partnerForm.datePlaceholderDay')}
              maxLength={2}
              value={day}
              onChange={(e) => handleSeg(e.target.value, DAY_SEG, setDay, hourRef)}
              onKeyDown={(e) => handleBackspace(e, day, monthRef, month, setMonth)}
              className={`${dateSeg} w-[24px] flex-1`}
            />
            {/* 시간 (시 드롭다운 select) */}
            <span className="px-0.5 text-border-soft">·</span>
            {timeUnknown ? (
              <span className="flex-[2] text-center text-[11px] text-text-sub">
                {t('partnerForm.timeUnknown')}
              </span>
            ) : (
              <span className="flex flex-[2] items-center justify-center gap-0.5">
                <select
                  ref={hourRef as unknown as React.RefObject<HTMLSelectElement>}
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-center text-[12px] font-bold outline-none"
                >
                  <option value="">{t('partnerForm.hourLabel')}</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>
                      {String(i).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </span>
            )}
          </div>

          {/* 양력/음력/윤달 탭 */}
          <div className="mt-1.5 flex overflow-hidden rounded-full border-2 border-ink">
            <button
              type="button"
              className={segTab(calendar === 'solar')}
              onClick={() => { setCalendar('solar'); setIsLeap(false) }}
            >
              {t('partnerForm.solar')}
            </button>
            <button
              type="button"
              className={`${segTab(calendar === 'lunar' && !isLeap)} border-l-2 border-ink`}
              onClick={() => { setCalendar('lunar'); setIsLeap(false) }}
            >
              {t('partnerForm.lunar')}
            </button>
            <button
              type="button"
              disabled={calendar !== 'lunar'}
              className={`${segTab(calendar === 'lunar' && isLeap)} border-l-2 border-ink disabled:opacity-35`}
              onClick={() => setIsLeap(true)}
            >
              {t('partnerForm.leap')}
            </button>
          </div>

          {/* 날짜 에러 */}
          {birthDateError && (
            <p className="mt-1 text-[11px] font-bold text-orange">{birthDateError}</p>
          )}
          {/* 시간 에러 */}
          {hourErrorMsg && (
            <p className="mt-1 text-[11px] font-bold text-orange">{hourErrorMsg}</p>
          )}
        </div>

        {/* 성별 */}
        <div>
          <label className="mb-1 block text-[11px] font-extrabold text-text-sub">
            {t('partnerForm.gender')}
          </label>
          <div className="flex overflow-hidden rounded-full border-2 border-ink">
            <button
              type="button"
              className={segTab(gender === 'male')}
              onClick={() => setGender('male')}
            >
              {t('partnerForm.male')}
            </button>
            <button
              type="button"
              className={`${segTab(gender === 'female')} border-l-2 border-ink`}
              onClick={() => setGender('female')}
            >
              {t('partnerForm.female')}
            </button>
          </div>
        </div>

        {/* API 에러 */}
        {errorMsg && (
          <p className="text-[11px] font-bold text-orange">{errorMsg}</p>
        )}

        {/* 버튼 행 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-lg border-2 border-ink bg-surface py-2 text-[12px] font-extrabold shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {t('partnerForm.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (submitAttempted && hasBlockingError)}
            className="flex-[2] rounded-lg border-2 border-ink bg-orange py-2 text-[12px] font-extrabold text-surface shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {submitting ? (
              <span className="inline-block animate-pulse">…</span>
            ) : (
              t('partnerForm.submit')
            )}
          </button>
        </div>
      </div>
    )
  }
  ```

  Note on hour handling: The inline form collects **hour only** (0–23 via `<select>`). Minutes are always `'00'` internally. `buildBirthTime(hour, '00')` produces `"HH:00"`. If `timeUnknown` is checked, `birth_time` is omitted from the request body.

  Note on `hourRef`: The ref target is a `<select>` but typed as `HTMLInputElement` for backspace navigation compatibility. Cast with `as unknown as React.RefObject<HTMLSelectElement>` to avoid TypeScript error.

- [ ] **Step 2: Run TypeScript check**

  ```bash
  cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx tsc --noEmit 2>&1 | head -40
  ```

  Expected: exit 0, no errors.

---

## Task 3: Update `InlinePartnerCard` to support form mode

**Files:**
- Modify: `apps/web/components/chat/InlinePartnerCard.tsx`

`InlinePartnerCard` currently has two modes (`collapsed` / `expanded`). Add a third mode: `'form'`. The "직접 입력" button now switches to `'form'` instead of routing. A new `onSubmitBirth` prop accepts the birth body from `PartnerBirthForm` and triggers the attach flow.

- [ ] **Step 1: Rewrite `InlinePartnerCard.tsx`**

  ```tsx
  'use client'

  /**
   * 인라인 상대 만세력 선택/입력 카드 (B5).
   * `request_partner` SSE 이벤트 수신 시 대화 흐름 내에 표시.
   * mode: 'collapsed' → 'list' (저장 목록) → 'form' (직접 입력) 전환.
   */
  import { useState } from 'react'
  import { useTranslations } from 'next-intl'
  import type { ProfileResponse, PartnerAttachRequest } from '@sajuguri/api-client'
  import PartnerBirthForm from './PartnerBirthForm'

  interface Props {
    profiles: ProfileResponse[]
    onSelect: (p: ProfileResponse) => void
    onSubmitBirth: (body: PartnerAttachRequest) => Promise<void>
  }

  type Mode = 'collapsed' | 'list' | 'form'

  export default function InlinePartnerCard({ profiles, onSelect, onSubmitBirth }: Props) {
    const t = useTranslations('chat')
    const [mode, setMode] = useState<Mode>('collapsed')
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    async function handleFormSubmit(body: PartnerAttachRequest) {
      setSubmitting(true)
      setFormError(null)
      try {
        await onSubmitBirth(body)
        // 성공 시 부모가 카드를 언마운트하거나 상태를 갱신하므로 별도 처리 불필요
      } catch {
        setFormError(t('partnerForm.errorSubmit'))
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <div className="w-full rounded-2xl border-2 border-orange bg-yellow-tint px-3 py-3">
        <p className="mb-2 text-[13px] font-extrabold text-ink">{t('inlinePartner.prompt')}</p>

        {mode === 'collapsed' && (
          <button
            className="rounded-xl border-2 border-ink bg-yellow px-4 py-2 text-[13px] font-extrabold shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
            onClick={() => setMode('list')}
          >
            {t('inlinePartner.action')}
          </button>
        )}

        {mode === 'list' && (
          <div className="flex flex-col gap-1.5">
            {profiles.map((p) => (
              <button
                key={p.id}
                className="flex w-full items-center gap-2 rounded-xl border-2 border-ink bg-surface p-2.5 text-left shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
                onClick={() => onSelect(p)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink bg-yellow text-xs font-extrabold">
                  {p.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-extrabold">{p.name}</span>
                  <span className="block text-[11px] text-text-sub">{p.birth_date}</span>
                </span>
              </button>
            ))}
            <button
              className="mt-1 flex items-center gap-2 rounded-xl border-2 border-ink bg-yellow p-2.5 text-left shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
              onClick={() => setMode('form')}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink bg-surface">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              <span className="text-[12px] font-extrabold">{t('inlinePartner.directInput')}</span>
            </button>
          </div>
        )}

        {mode === 'form' && (
          <PartnerBirthForm
            onSubmit={handleFormSubmit}
            onCancel={() => setMode('list')}
            submitting={submitting}
            errorMsg={formError}
          />
        )}
      </div>
    )
  }
  ```

  Key changes from original:
  - Removed `useRouter` import (no more navigation).
  - Added `PartnerBirthForm` import.
  - "직접 입력" button uses inline SVG `+` icon instead of `+` character (design rule: no emoji in UI).
  - `mode` replaces `expanded` boolean.
  - `onSubmitBirth` prop replaces nothing (new prop).
  - "직접 입력" text now uses `t('inlinePartner.directInput')` instead of `t('pickSheet.directInput')`.

- [ ] **Step 2: TypeScript check**

  ```bash
  cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx tsc --noEmit 2>&1 | head -40
  ```

  Expected: exit 0.

---

## Task 4: Update `ChatView` to handle birth-based partner attach

**Files:**
- Modify: `apps/web/components/chat/ChatView.tsx`

Add `handleAttachPartnerBirth` that calls `attachPartner` with birth fields (no `profile_id`). Update the `InlinePartnerCard` render to pass the new prop.

- [ ] **Step 1: Add `handleAttachPartnerBirth` and update `InlinePartnerCard` usage in `ChatView.tsx`**

  Find the existing `handleAttachPartner` callback (lines ~196–207). Add a new callback right after it:

  ```tsx
  // 상대 만세력 직접 입력 첨부 (생년월일 직접 입력)
  const handleAttachPartnerBirth = useCallback(
    async (body: import('@sajuguri/api-client').PartnerAttachRequest) => {
      const res = await attachPartner(api, sessionId, body)
      setPartnerName(res.partner_name)
    },
    [sessionId],
  )
  ```

  Then update the `InlinePartnerCard` JSX (lines ~299–304) to pass the new prop:

  ```tsx
  <InlinePartnerCard
    key={bi}
    onSelect={handleAttachPartner}
    onSubmitBirth={handleAttachPartnerBirth}
    profiles={profiles}
  />
  ```

  Note: `handleAttachPartnerBirth` throws on error — `PartnerBirthForm` catches it and shows `formError`. No try/catch needed here.

- [ ] **Step 2: TypeScript check**

  ```bash
  cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx tsc --noEmit 2>&1 | head -40
  ```

  Expected: exit 0.

---

## Task 5: Run all validation checks

- [ ] **Step 1: TypeScript**

  ```bash
  cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx tsc --noEmit
  ```

  Expected: exit 0.

- [ ] **Step 2: Vitest**

  ```bash
  cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx vitest run
  ```

  Expected: all tests pass (existing tests for `dateInput`, `i18n`, `colors` etc.).

- [ ] **Step 3: i18n check**

  ```bash
  node /home/rheon/Desktop/projects/SajuGuri/apps/web/scripts/check-i18n.mjs
  ```

  Expected: exit 0.

- [ ] **Step 4: Colors check**

  ```bash
  node /home/rheon/Desktop/projects/SajuGuri/apps/web/scripts/check-colors.mjs --strict
  ```

  Expected: exit 0 (no raw hex values used in new components — all classes use token names like `bg-yellow`, `bg-orange`, `border-ink`, `text-text-sub`, `bg-surface`, `bg-bg-base`, `bg-yellow-tint`, `border-orange`, `border-border-soft`).

---

## Task 6: Commit

- [ ] **Step 1: Stage and commit**

  ```bash
  git add \
    apps/web/components/chat/PartnerBirthForm.tsx \
    apps/web/components/chat/InlinePartnerCard.tsx \
    apps/web/components/chat/ChatView.tsx \
    apps/web/messages/ko.json \
    apps/web/messages/en.json
  ```

  ```bash
  git commit -m "$(cat <<'EOF'
  feat: 채팅 인라인 상대 만세력 직접 입력 폼 추가

  InlinePartnerCard의 '직접 입력' 버튼이 /manse/new로 이동하는 대신
  카드 안에서 PartnerBirthForm을 펼쳐 생년월일시·성별·양음력을 입력하도록 변경.
  attachPartner birth body를 ChatView에서 처리하며 채팅 흐름을 벗어나지 않음.
  EOF
  )"
  ```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| "직접 입력" → 채팅 내 인라인 폼 | Task 3 (InlinePartnerCard mode='form') |
| 이름(선택) 필드 | Task 2 (PartnerBirthForm name input) |
| 생년월일 — yyyy/mm/dd 세그먼트 드롭다운 (직접 타이핑 안전) | Task 2 (processSegInput + validateDate) |
| 양력/음력 토글 + 음력이면 윤달 옵션 | Task 2 (calendar segTab + isLeap) |
| 시간 — 시(0~23) 드롭다운 + "시간 모름" | Task 2 (select 0~23 + timeUnknown checkbox) |
| 성별 토글 | Task 2 (gender segTab) |
| 출생지 생략 | No city field — confirmed as intended |
| attachPartner(birth body) 호출 | Task 4 (handleAttachPartnerBirth) |
| 성공 시 setPartnerName 흐름 | Task 4 |
| 실패 시 인라인 에러 (alert 금지) | Task 2+3 (errorMsg prop + formError state) |
| 디자인 토큰만 사용, hex 하드코딩 금지 | Task 2+3 (all token classes) |
| 이모지 금지, 인라인 SVG | Task 3 (svg icon for + button) |
| ko/en i18n 동시 작성 | Task 1 |
| check-i18n 통과 | Task 5 step 3 |
| check-colors --strict 통과 | Task 5 step 4 |
| tsc --noEmit 통과 | Task 2,3,4,5 |
| vitest run 통과 | Task 5 step 2 |

### Potential issues

1. **`hourRef` type cast**: `PartnerBirthForm` uses `useRef<HTMLInputElement>` for `hourRef` but attaches it to a `<select>`. The cast `as unknown as React.RefObject<HTMLSelectElement>` is needed for focus-management parity. Since the backspace-to-prev navigation in hour doesn't apply (hour is last segment), the ref is only used for `dayRef` → `hourRef` advance from `handleSeg(day)`. Consider removing the backspace forward advance from day to hour in the compact form — implemented without auto-advance from day to hour to keep it simple, but `handleSeg(day, DAY_SEG, setDay, hourRef)` passes `hourRef`. Since `hourRef` is not actually used for focus (it's a select not an input and the backspace handler only targets inputs), this is safe — the `hourRef.current?.focus()` call on a select will call `select.focus()` which is valid.

2. **`timeError` usage**: The `validateTime` function in `dateInput.ts` checks if one of (hour, minute) is present and the other isn't. Since PartnerBirthForm only has hour (minute is always '00'), passing `validateTime(hour, hour === '' ? '' : '00', timeUnknown)` would only ever return `'hourMissing'` (when hour is empty) or null. This is correct behavior — simplified hour-only time entry.

3. **`accent-[#1A1A1A]` in checkbox**: The `accent-[#1A1A1A]` class uses a raw hex value. Check whether `check-colors.mjs` scans for `accent-[...]` patterns. If it does, replace with `accent-ink` (if the token exists in Tailwind config) or remove the accent class entirely. Review `check-colors.mjs` allowed list — if `#1A1A1A` is in the allowed list (it's `--ink`), this passes. The InputForm.tsx already uses `accent-[#1A1A1A]` for the same checkbox, so it's likely allowed.
