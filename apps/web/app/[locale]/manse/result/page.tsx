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
