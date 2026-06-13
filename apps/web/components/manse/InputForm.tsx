'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { searchCities, type CityOption } from '@sajuguri/api-client'
import { saveRecentInput } from '@sajuguri/core'
import { api } from '@/lib/api'
import { webStorage } from '@/lib/storage'
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
import {
  calcSolarCorrection,
  calcCorrectedPreview,
  formatCorrection,
  SEOUL_CORRECTION,
} from '@/lib/manse/solarCorrection'

export default function InputForm() {
  const t = useTranslations('manse.form')
  const router = useRouter()

  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar')
  const [isLeap, setIsLeap] = useState(false)
  const [timeUnknown, setTimeUnknown] = useState(false)

  // 세그먼트 값
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState('')
  const [minute, setMinute] = useState('')

  // 도시 검색
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<CityOption[]>([])
  const [city, setCity] = useState<CityOption | null>(null)
  const [cityOpen, setCityOpen] = useState(false)
  const [cityLoading, setCityLoading] = useState(false)

  const [submitAttempted, setSubmitAttempted] = useState(false)

  // 세그먼트 input refs (자동 전진/backspace 포커스 이동)
  const yearRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const dayRef = useRef<HTMLInputElement>(null)
  const hourRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)
  const cityInputRef = useRef<HTMLInputElement>(null)

  // ── 파생값 ──────────────────────────────────────────────────────────
  const birthDate = buildBirthDate(year, month, day)
  const birthTime = timeUnknown ? null : buildBirthTime(hour, minute)

  const correction = useMemo(() => {
    if (!city) return SEOUL_CORRECTION
    return calcSolarCorrection(city.longitude, city.utcOffset)
  }, [city])

  const preview = useMemo(
    () => (timeUnknown ? null : calcCorrectedPreview(hour, minute, correction)),
    [timeUnknown, hour, minute, correction],
  )

  const dateValidation = validateDate(year, month, day)
  const timeError = validateTime(hour, minute, timeUnknown)

  const nameError = name.trim() ? null : t('errorName')

  function dateErrorMessage(): string | null {
    switch (dateValidation.code) {
      case 'yearRange':
        return t('errorYearRange')
      case 'monthRange':
        return t('errorMonthRange')
      case 'dayOverflow':
        return t('errorDayOverflow', {
          year: dateValidation.year ?? 0,
          month: dateValidation.month ?? 0,
          maxDay: dateValidation.maxDay ?? 0,
        })
      default:
        return null
    }
  }

  // 제출 시도 후에만 "필수 미입력" 메시지 노출, 형식 에러는 입력 즉시 노출
  const birthDateError =
    dateErrorMessage() ?? (submitAttempted && !birthDate ? t('errorDateRequired') : null)

  const timeErrorMessage =
    timeError === 'minuteMissing'
      ? t('errorMinuteMissing')
      : timeError === 'hourMissing'
        ? t('errorHourMissing')
        : null

  const hasBlockingError = !!(nameError || birthDateError || timeErrorMessage || !birthDate)

  // ── 세그먼트 입력 핸들러 (자동 전진) ──────────────────────────────────
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

  // ── 도시 검색 (디바운스 300ms) ───────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onCityInput(q: string) {
    setCityQuery(q)
    setCity(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) {
      setCityResults([])
      setCityOpen(false)
      setCityLoading(false)
      return
    }
    setCityLoading(true)
    setCityOpen(true)
    debounceRef.current = setTimeout(async () => {
      const results = await searchCities(api, q)
      setCityResults(results)
      setCityLoading(false)
      setCityOpen(results.length > 0)
    }, 300)
  }

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  function selectCity(c: CityOption) {
    setCity(c)
    setCityQuery(c.label)
    setCityResults([])
    setCityOpen(false)
  }

  function clearCity() {
    setCity(null)
    setCityQuery('')
    setCityResults([])
    setCityOpen(false)
    cityInputRef.current?.focus()
  }

  // ── 제출 ─────────────────────────────────────────────────────────────
  async function submit() {
    setSubmitAttempted(true)
    if (nameError || !birthDate || dateValidation.code || timeError) return

    const input = {
      name: name.trim() || t('guestName'),
      birth_date: birthDate,
      birth_time: birthTime,
      gender,
      calendar,
      is_leap_month: calendar === 'lunar' && isLeap,
      ...(city && !city.isKorea
        ? { birth_longitude: city.longitude, birth_utc_offset: city.utcOffset, city: city.label }
        : city
          ? { birth_longitude: city.longitude, city: city.label }
          : {}),
    }
    await saveRecentInput(webStorage, input)
    const qs = new URLSearchParams(
      Object.entries(input)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    )
    router.push(`/manse/result?${qs.toString()}`)
  }

  const seg = (active: boolean) =>
    `flex-1 py-2 text-center text-sm font-extrabold ${active ? 'bg-yellow' : 'text-text-sub'}`

  const dateSeg =
    'min-w-0 bg-transparent text-center text-sm font-bold tabular-nums outline-none placeholder:font-normal placeholder:text-text-sub'

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#1A1A1A]">
      {/* 이름 */}
      <label className="block">
        <span className="mb-1.5 block text-xs font-extrabold">
          {t('name')} <em className="not-italic text-orange">*</em>
        </span>
        <input
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border-2 border-ink bg-bg-base px-3 py-2.5 text-sm"
        />
        {submitAttempted && nameError && (
          <p className="mt-1 text-[11px] font-bold text-orange">{nameError}</p>
        )}
      </label>

      {/* 출생지 */}
      <div>
        <span className="mb-1.5 block text-xs font-extrabold">{t('birthplace')}</span>
        <div className="relative">
          <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-border-soft px-3">
            <input
              ref={cityInputRef}
              value={cityQuery}
              onChange={(e) => onCityInput(e.target.value)}
              onFocus={() => setCityOpen(cityResults.length > 0)}
              onBlur={() => setTimeout(() => setCityOpen(false), 150)}
              placeholder={t('birthplacePlaceholder')}
              autoComplete="off"
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-text-sub"
            />
            {city && (
              <button
                type="button"
                onClick={clearCity}
                aria-label="clear"
                className="shrink-0 text-sm text-text-sub"
              >
                ✕
              </button>
            )}
          </div>
          {cityOpen && (cityLoading || cityResults.length > 0) && (
            <ul className="absolute z-10 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border-2 border-ink bg-surface shadow-[4px_4px_0_#1A1A1A]">
              {cityLoading ? (
                <li className="px-3 py-2 text-sm text-text-sub">{t('searching')}</li>
              ) : (
                cityResults.map((c) => (
                  <li key={`${c.label}-${c.timezone}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        selectCity(c)
                      }}
                      className="flex w-full justify-between px-3 py-2 text-sm hover:bg-bg-base"
                    >
                      <span className="font-bold">{c.label}</span>
                      <span className="text-xs text-text-sub">{c.sublabel}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <p className="mt-1 text-[11px] text-text-sub">
          {city ? city.timezone : t('birthplaceHint')}
        </p>
      </div>

      {/* 생년월일 · 시각 */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-extrabold">{t('datetime')}</span>
          <label className="flex items-center gap-1.5 text-[11px] text-text-sub">
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) => setTimeUnknown(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#1A1A1A]"
            />
            {t('timeUnknown')}
          </label>
        </div>

        {/* 세그먼트 날짜 + 시각 입력바 */}
        <div className="flex items-center gap-1 rounded-xl border-2 border-ink bg-bg-base px-2 py-2.5 text-sm">
          <input
            ref={yearRef}
            inputMode="numeric"
            placeholder={t('datePlaceholderYear')}
            maxLength={4}
            value={year}
            onChange={(e) => handleSeg(e.target.value, YEAR_SEG, setYear, monthRef)}
            className={`${dateSeg} w-[44px] flex-[2]`}
          />
          <span className="text-text-sub">/</span>
          <input
            ref={monthRef}
            inputMode="numeric"
            placeholder={t('datePlaceholderMonth')}
            maxLength={2}
            value={month}
            onChange={(e) => handleSeg(e.target.value, MONTH_SEG, setMonth, dayRef)}
            onKeyDown={(e) => handleBackspace(e, month, yearRef, year, setYear)}
            className={`${dateSeg} w-[28px] flex-1`}
          />
          <span className="text-text-sub">/</span>
          <input
            ref={dayRef}
            inputMode="numeric"
            placeholder={t('datePlaceholderDay')}
            maxLength={2}
            value={day}
            onChange={(e) => handleSeg(e.target.value, DAY_SEG, setDay, hourRef)}
            onKeyDown={(e) => handleBackspace(e, day, monthRef, month, setMonth)}
            className={`${dateSeg} w-[28px] flex-1`}
          />
          <span className="px-0.5 text-border-soft">·</span>
          {timeUnknown ? (
            <span className="flex-[2] text-center text-[13px] text-text-sub">
              {t('timeUnknownDisplay')}
            </span>
          ) : (
            <span className="flex flex-[2] items-center justify-center gap-1">
              <input
                ref={hourRef}
                inputMode="numeric"
                placeholder={t('timePlaceholderHour')}
                maxLength={2}
                value={hour}
                onChange={(e) => handleSeg(e.target.value, HOUR_SEG, setHour, minuteRef)}
                onKeyDown={(e) => handleBackspace(e, hour, dayRef, day, setDay)}
                className={`${dateSeg} w-[28px] flex-1`}
              />
              <span className="text-text-sub">:</span>
              <input
                ref={minuteRef}
                inputMode="numeric"
                placeholder={t('timePlaceholderMinute')}
                maxLength={2}
                value={minute}
                onChange={(e) => handleSeg(e.target.value, MINUTE_SEG, setMinute)}
                onKeyDown={(e) => handleBackspace(e, minute, hourRef, hour, setHour)}
                className={`${dateSeg} w-[28px] flex-1`}
              />
            </span>
          )}
        </div>

        {/* 양력·음력·윤달 세그먼트 */}
        <div className="mt-2 flex overflow-hidden rounded-full border-2 border-ink">
          <button
            type="button"
            className={seg(calendar === 'solar')}
            onClick={() => {
              setCalendar('solar')
              setIsLeap(false)
            }}
          >
            {t('solar')}
          </button>
          <button
            type="button"
            className={`${seg(calendar === 'lunar' && !isLeap)} border-l-2 border-ink`}
            onClick={() => {
              setCalendar('lunar')
              setIsLeap(false)
            }}
          >
            {t('lunar')}
          </button>
          <button
            type="button"
            disabled={calendar !== 'lunar'}
            className={`${seg(calendar === 'lunar' && isLeap)} border-l-2 border-ink disabled:opacity-35`}
            onClick={() => setIsLeap(true)}
          >
            {t('leap')}
          </button>
        </div>

        {/* 진태양시 보정 미리보기 */}
        {!timeUnknown && preview && (hour || minute) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-text-sub">
            <span>{t('correctionLabel', { minutes: formatCorrection(preview.correction) })}</span>
            <span>→</span>
            <span className="tabular-nums text-ink">{preview.applied}</span>
            {preview.sisi && (
              <span className="rounded bg-bg-base px-1.5 py-0.5 font-bold text-ink">
                {t(`sisi.${preview.sisi.key}`)}({preview.sisi.hanja})
              </span>
            )}
            {preview.sisi && <span>{preview.sisi.range}</span>}
          </div>
        )}

        {/* 날짜 에러 */}
        {birthDateError && (
          <p className="mt-1 text-[11px] font-bold text-orange">{birthDateError}</p>
        )}
        {/* 시각 에러 */}
        {submitAttempted && timeErrorMessage && (
          <p className="mt-1 text-[11px] font-bold text-orange">{timeErrorMessage}</p>
        )}
        {/* 시간 모름 안내 */}
        {timeUnknown && (
          <p className="mt-1 text-[11px] text-text-sub">{t('timeUnknownNote')}</p>
        )}
      </div>

      {/* 성별 */}
      <div>
        <span className="mb-1.5 block text-xs font-extrabold">{t('gender')}</span>
        <div className="flex overflow-hidden rounded-full border-2 border-ink">
          <button
            type="button"
            className={seg(gender === 'male')}
            onClick={() => setGender('male')}
          >
            {t('male')}
          </button>
          <button
            type="button"
            className={`${seg(gender === 'female')} border-l-2 border-ink`}
            onClick={() => setGender('female')}
          >
            {t('female')}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={hasBlockingError}
        className="rounded-xl border-2 border-ink bg-orange py-3 text-[15px] font-extrabold text-white shadow-[4px_4px_0_#1A1A1A] disabled:opacity-40"
      >
        {t('submit')}
      </button>
    </div>
  )
}
