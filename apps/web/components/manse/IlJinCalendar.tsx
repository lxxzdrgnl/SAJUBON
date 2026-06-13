'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import type { IlJinEntry } from '@sajuguri/api-client'
import { calendarGrid, dateKey, prevMonth, nextMonth } from '@/lib/manse/ilJin'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

/** 일진 달력 — 월 달력 + 간지·음력·절기 (IlJinCalendar.vue 이식). 그리드 로직은 lib/manse/ilJin */
export default function IlJinCalendar() {
  const t = useTranslations('manse.charts.ilJin')
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
    const q = new URLSearchParams({ year: String(year), month: String(month) })
    api.get<IlJinEntry[]>(`/api/saju/il-jin?${q}`)
      .then((d) => { if (alive) { setEntries(d); setLoading(false) } })
      .catch(() => { if (alive) { setError(true); setLoading(false) } })
    return () => { alive = false }
  }, [year, month])

  const grid = calendarGrid(year, month, entries)
  const go = (fn: typeof prevMonth) => { const n = fn(year, month); setYear(n.year); setMonth(n.month) }

  return (
    <section className="rounded-2xl border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#1A1A1A]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-extrabold">{t('title')}</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go(prevMonth)} className="rounded-lg border-2 border-ink bg-surface px-2 py-1 text-sm font-black shadow-[2px_2px_0_#1A1A1A]">‹</button>
          <span className="min-w-[88px] text-center text-sm font-extrabold">{year} {MONTH_NAMES[month - 1]}</span>
          <button type="button" onClick={() => go(nextMonth)} className="rounded-lg border-2 border-ink bg-surface px-2 py-1 text-sm font-black shadow-[2px_2px_0_#1A1A1A]">›</button>
        </div>
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-text-sub">{t('error')}</p>
      ) : loading ? (
        <p className="py-6 text-center text-sm text-text-sub">{t('loading')}</p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((wd, i) => (
              <div key={wd} className={`py-1 text-center text-[12px] font-bold ${i === 0 ? 'text-orange' : i === 6 ? 'text-[#0090A8]' : 'text-text-sub'}`}>{wd}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell, idx) => {
              const isToday = cell.date === todayStr
              return (
                <div
                  key={idx}
                  className={`min-h-[72px] rounded-lg p-1 ${isToday ? 'border-2 border-ink bg-yellow-tint' : cell.entry?.solar_term ? 'bg-[#FBF3D9]' : ''}`}
                >
                  {cell.day && (
                    <>
                      <div className={`text-[13px] font-bold ${isToday ? 'text-ink' : idx % 7 === 0 ? 'text-orange' : idx % 7 === 6 ? 'text-[#0090A8]' : 'text-ink'}`}>{cell.day}</div>
                      {cell.entry?.solar_term && <div className="text-[11px] font-semibold text-[#B07A00]">{cell.entry.solar_term}</div>}
                      {cell.entry && <div className="text-[12px] font-semibold text-text-sub">{cell.entry.ganji_name}</div>}
                      {cell.entry && (
                        <div className={`text-[11px] ${cell.entry.is_leap_month ? 'text-[#0090A8]' : 'text-text-sub'}`}>
                          {cell.entry.is_leap_month ? t('leapMark') : ''}{cell.entry.lunar_month}/{cell.entry.lunar_day}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 border-t-2 border-ink pt-2 text-[11px] text-text-sub">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border-2 border-ink bg-yellow-tint" />{t('today')}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[#FBF3D9]" />{t('solarTerm')}</span>
            <span className="flex items-center gap-1"><span className="text-[#0090A8]">{t('leapMark')}</span>{t('leap')}</span>
          </div>
        </>
      )}
    </section>
  )
}
