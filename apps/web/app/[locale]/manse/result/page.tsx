import { getTranslations } from 'next-intl/server'
import { serverApi } from '@/lib/api'
import type { SajuCalcResponse, ProfileCreateRequest } from '@sajuguri/api-client'
import { currentUser } from '@/lib/serverAuth'
import SaveButton from '@/components/manse/SaveButton'
import IljuHero from '@/components/manse/IljuHero'
import PillarCard from '@/components/manse/PillarCard'
import TagChips from '@/components/manse/TagChips'
import DetailAccordion from '@/components/manse/DetailAccordion'
import WuxingBalanceCard from '@/components/manse/WuxingBalanceCard'
import TenGodsCard from '@/components/manse/TenGodsCard'
import StrengthCard from '@/components/manse/StrengthCard'
import DaeUnTimeline from '@/components/manse/DaeUnTimeline'
import YeonWolUn from '@/components/manse/YeonWolUn'
import IlJinCalendar from '@/components/manse/IlJinCalendar'
import HapChungPanel from '@/components/manse/HapChungPanel'
import WuxingFeatureTable from '@/components/manse/WuxingFeatureTable'

export default async function ManseResult({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const t = await getTranslations('manse.result')
  const tc = await getTranslations('manse.charts.cta')
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

  // 로그인 상태에서만 저장 버튼 노출. 저장 스키마는 longitude(진태양시)를 쓴다.
  const user = await currentUser()
  const saveInput: ProfileCreateRequest | null =
    user && p.birth_date && p.gender
      ? {
          name: p.name || '이름 없음',
          birth_date: p.birth_date,
          birth_time: p.birth_time ?? null,
          calendar: p.calendar === 'lunar' ? 'lunar' : 'solar',
          gender: p.gender === 'female' ? 'female' : 'male',
          is_leap_month: p.is_leap_month === 'true',
          ...(p.city ? { city: p.city } : {}),
          ...(p.birth_longitude ? { longitude: Number(p.birth_longitude) } : {}),
        }
      : null

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
      <DetailAccordion data={data} />
      <WuxingBalanceCard data={data} />
      <TenGodsCard data={data} />
      <StrengthCard data={data} />
      <DaeUnTimeline data={data} />
      <YeonWolUn dayStem={data.day_pillar.stem} />
      <IlJinCalendar />
      <HapChungPanel data={data} />
      <WuxingFeatureTable data={data} />

      {/* CTA — 리포트·상담 라우트 미존재: 비활성 스타일 (준비 중) */}
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          disabled
          className="flex-1 cursor-not-allowed rounded-xl border-2 border-border-soft bg-surface py-3 text-center text-sm font-extrabold text-text-sub opacity-60"
        >
          {tc('report')}
          <span className="ml-1 text-[10px] font-bold">· {tc('soon')}</span>
        </button>
        <button
          type="button"
          disabled
          className="flex-1 cursor-not-allowed rounded-xl border-2 border-border-soft bg-surface py-3 text-center text-sm font-extrabold text-text-sub opacity-60"
        >
          {tc('chat')}
          <span className="ml-1 text-[10px] font-bold">· {tc('soon')}</span>
        </button>
      </div>

      {saveInput && <SaveButton input={saveInput} />}
    </main>
  )
}
