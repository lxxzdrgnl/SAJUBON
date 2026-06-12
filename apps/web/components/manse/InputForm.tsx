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
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
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
      name: name || t('guestName'),
      birth_date: date,
      birth_time: timeUnknown ? null : time || null,
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

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#1A1A1A]">
      <label className="block">
        <span className="mb-1.5 block text-xs font-extrabold">
          {t('name')} <em className="not-italic text-orange">*</em>
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border-2 border-ink bg-bg-base px-3 py-2.5 text-sm"
        />
      </label>

      <div>
        <span className="mb-1.5 block text-xs font-extrabold">{t('birthplace')}</span>
        <input
          value={city ? city.label : cityQuery}
          onChange={(e) => onCityInput(e.target.value)}
          placeholder={t('birthplacePlaceholder')}
          className="w-full rounded-xl border-[1.5px] border-border-soft px-3 py-2.5 text-sm placeholder:text-text-sub"
        />
        {cityResults.length > 0 && !city && (
          <ul className="mt-1 max-h-40 overflow-y-auto rounded-xl border-[1.5px] border-border-soft bg-surface">
            {cityResults.map((c) => (
              <li key={`${c.label}-${c.timezone}`}>
                <button
                  type="button"
                  onClick={() => {
                    setCity(c)
                    setCityResults([])
                  }}
                  className="flex w-full justify-between px-3 py-2 text-sm hover:bg-bg-base"
                >
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
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) => setTimeUnknown(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#1A1A1A]"
            />
            {t('timeUnknown')}
          </label>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-[1.6] rounded-xl border-2 border-ink px-2.5 py-2.5 text-sm"
          />
          <input
            type="time"
            value={time}
            disabled={timeUnknown}
            onChange={(e) => setTime(e.target.value)}
            className="flex-1 rounded-xl border-2 border-ink px-2.5 py-2.5 text-sm disabled:opacity-40"
          />
        </div>
        <div className="mt-2 flex overflow-hidden rounded-full border-2 border-ink">
          <button
            type="button"
            className={seg(calendar === 'solar')}
            onClick={() => setCalendar('solar')}
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
      </div>

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
        disabled={!date}
        className="rounded-xl border-2 border-ink bg-orange py-3 text-[15px] font-extrabold text-white shadow-[4px_4px_0_#1A1A1A] disabled:opacity-40"
      >
        {t('submit')}
      </button>
    </div>
  )
}
