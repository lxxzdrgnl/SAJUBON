'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import type { YeonUnEntry, WolUnEntry } from '@sajuguri/api-client'
import GanjiColumn from '@/components/manse/GanjiColumn'

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

/** 연운·월운 — 탭 + API 호출 (YeonUnSlider·WolUnSlider 이식). day_stem 기반 GET */
export default function YeonWolUn({ dayStem }: { dayStem: string }) {
  const t = useTranslations('manse.charts.yeonWol')
  const [tab, setTab] = useState<'yeon' | 'wol'>('yeon')
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [yeon, setYeon] = useState<YeonUnEntry[] | null>(null)
  const [wol, setWol] = useState<WolUnEntry[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!dayStem) return
    const q = new URLSearchParams({ start_year: String(currentYear - 2), count: '10', day_stem: dayStem })
    api.get<YeonUnEntry[]>(`/api/saju/yeon-un?${q}`).then(setYeon).catch(() => setError(true))
  }, [dayStem, currentYear])

  useEffect(() => {
    if (!dayStem || tab !== 'wol' || wol !== null) return
    const q = new URLSearchParams({ year: String(currentYear), day_stem: dayStem })
    api.get<WolUnEntry[]>(`/api/saju/wol-un?${q}`).then(setWol).catch(() => setError(true))
  }, [tab, dayStem, currentYear, wol])

  const tabBtn = (key: 'yeon' | 'wol') =>
    `rounded-lg border-2 border-ink px-3 py-1 text-xs font-extrabold ${tab === key ? 'bg-yellow text-ink shadow-brutal-sm' : 'bg-surface text-text-sub'}`

  const list = tab === 'yeon' ? yeon : wol
  const loading = list === null && !error

  return (
    <section className="rounded-2xl border-2 border-ink bg-surface p-4 shadow-brutal">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-extrabold">{t('title')}</h3>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setTab('yeon')} className={tabBtn('yeon')}>{t('tabYeon')}</button>
          <button type="button" onClick={() => setTab('wol')} className={tabBtn('wol')}>{t('tabWol')}</button>
        </div>
      </div>

      {error ? (
        <p className="py-3 text-sm text-text-sub">{t('error')}</p>
      ) : loading ? (
        <p className="py-3 text-sm text-text-sub">{t('loading')}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {tab === 'yeon'
            ? (yeon ?? []).map((e) => (
                <GanjiColumn
                  key={e.year}
                  topLabel={String(e.year)}
                  stem={e.stem} stemElement={e.stem_element}
                  branch={e.branch} branchElement={e.branch_element}
                  stemTenGod={e.stem_ten_god} branchTenGod={e.branch_ten_god} twelveWun={e.twelve_wun}
                  highlight={e.year === currentYear}
                  badge={e.year === currentYear ? t('thisYear') : undefined}
                  dim={e.year < currentYear}
                />
              ))
            : (wol ?? []).map((e) => (
                <GanjiColumn
                  key={e.month}
                  topLabel={MONTH_NAMES[e.month - 1]}
                  stem={e.stem} stemElement={e.stem_element}
                  branch={e.branch} branchElement={e.branch_element}
                  stemTenGod={e.stem_ten_god} branchTenGod={e.branch_ten_god} twelveWun={e.twelve_wun}
                  highlight={e.month === currentMonth}
                  badge={e.month === currentMonth ? t('thisMonth') : undefined}
                />
              ))}
        </div>
      )}
    </section>
  )
}
