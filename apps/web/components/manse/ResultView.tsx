import { getTranslations } from 'next-intl/server'
import type { SajuCalcResponse } from '@sajuguri/api-client'
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

/**
 * 만세력 결과 읽기전용 렌더 — manse/result 와 share/[token] 가 공유.
 * 비주얼은 ResultPanel.vue 섹션 순서와 동일. CTA·저장·공유 버튼은 호출부 책임.
 */
export default async function ResultView({ data }: { data: SajuCalcResponse }) {
  const t = await getTranslations('manse.result')

  const pillars = [
    { pillar: data.hour_pillar, key: 'hour' },
    { pillar: data.day_pillar, key: 'day' },
    { pillar: data.month_pillar, key: 'month' },
    { pillar: data.year_pillar, key: 'year' },
  ] as const

  return (
    <>
      <IljuHero dayPillar={data.day_pillar} label={t('myIlju')} />
      <TagChips data={data} />
      <h3 className="mt-1 text-[15px] font-extrabold">{t('palja')}</h3>
      <div className="flex gap-1.5">
        {pillars.map(({ pillar, key }) =>
          pillar ? (
            <PillarCard key={key} pillar={pillar} kind="stem" label={t(`pillars.${key}`)} isDay={key === 'day'} />
          ) : (
            <div key={key} className="flex-1 rounded-lg border-2 border-dashed border-ink py-2 text-center text-[10px] text-text-sub">{t(`pillars.${key}`)}<br />—</div>
          ),
        )}
      </div>
      <div className="flex gap-1.5">
        {pillars.map(({ pillar, key }) =>
          pillar ? <PillarCard key={key} pillar={pillar} kind="branch" isDay={key === 'day'} /> :
            <div key={key} className="flex-1 rounded-lg border-2 border-dashed border-ink py-3 text-center text-[10px] text-text-sub">—</div>,
        )}
      </div>
      {/* 레거시 ResultPanel.vue 섹션 순서 정합 — 합충은 팔자 바로 아래,
          오행 특성 참고표는 오행 밸런스 바로 위, 신살·12운성 상세는 합충 다음 */}
      <HapChungPanel data={data} />
      <DetailAccordion data={data} />
      <WuxingFeatureTable data={data} />
      <WuxingBalanceCard data={data} />
      <TenGodsCard data={data} />
      <StrengthCard data={data} />
      <DaeUnTimeline data={data} />
      <YeonWolUn dayStem={data.day_pillar.stem} />
      <IlJinCalendar />
    </>
  )
}
