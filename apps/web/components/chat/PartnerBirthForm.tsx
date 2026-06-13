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
  YEAR_SEG,
  MONTH_SEG,
  DAY_SEG,
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
  const hourSelectRef = useRef<HTMLSelectElement>(null)

  // ── 파생값 ──────────────────────────────────────────────────────────────────
  const birthDate = buildBirthDate(year, month, day)
  // 시간은 HH:00 형식 — 인라인 폼은 시(hour) 단위만 받는다. 시간 모름이면 null.
  const birthTime = timeUnknown ? null : (hour !== '' ? buildBirthTime(hour, '00') : null)

  const dateValidation = validateDate(year, month, day)
  // hour만 입력받으므로: 시간 모름 아닌데 hour 미입력이면 에러
  const hourError = timeUnknown ? null : (hour === '' ? 'hourMissing' : null)

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

  // ── 세그먼트 핸들러 ───────────────────────────────────────────────────────────
  function handleSeg(
    raw: string,
    cfg: Parameters<typeof processSegInput>[1],
    setVal: (v: string) => void,
    nextFocus?: () => void,
  ) {
    const { value, advance } = processSegInput(raw, cfg)
    setVal(value)
    if (advance && nextFocus) nextFocus()
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

  // ── 제출 ──────────────────────────────────────────────────────────────────────
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

  // ── 스타일 헬퍼 ───────────────────────────────────────────────────────────────
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
            onChange={(e) =>
              handleSeg(e.target.value, YEAR_SEG, setYear, () => monthRef.current?.focus())
            }
            className={`${dateSeg} w-[40px] flex-[2]`}
          />
          <span className="text-text-sub">/</span>
          <input
            ref={monthRef}
            inputMode="numeric"
            placeholder={t('partnerForm.datePlaceholderMonth')}
            maxLength={2}
            value={month}
            onChange={(e) =>
              handleSeg(e.target.value, MONTH_SEG, setMonth, () => dayRef.current?.focus())
            }
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
            onChange={(e) =>
              handleSeg(e.target.value, DAY_SEG, setDay, () => {
                if (!timeUnknown) hourSelectRef.current?.focus()
              })
            }
            onKeyDown={(e) => handleBackspace(e, day, monthRef, month, setMonth)}
            className={`${dateSeg} w-[24px] flex-1`}
          />
          {/* 시간 (시 select) */}
          <span className="px-0.5 text-border-soft">·</span>
          {timeUnknown ? (
            <span className="flex-[2] text-center text-[11px] text-text-sub">
              {t('partnerForm.timeUnknown')}
            </span>
          ) : (
            <select
              ref={hourSelectRef}
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              className="flex-[2] bg-transparent text-center text-[12px] font-bold outline-none"
            >
              <option value="">{t('partnerForm.hourLabel')}</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={String(i).padStart(2, '0')}>
                  {String(i).padStart(2, '0')}
                </option>
              ))}
            </select>
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
