import { getTranslations } from 'next-intl/server'
import type { SajuCalcResponse } from '@sajuguri/api-client'
import GanjiColumn from '@/components/manse/GanjiColumn'

/** 대운 타임라인 — 가로 스크롤, 현재 대운 오렌지 강조 (DaeUnSlider.vue 이식) */
export default async function DaeUnTimeline({ data }: { data: SajuCalcResponse }) {
  const t = await getTranslations('manse.charts.daeUn')
  const list = (data.dae_un_list ?? []).slice(0, 10)
  const currentAge = data.current_dae_un?.start_age

  return (
    <section className="rounded-2xl border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#1A1A1A]">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[15px] font-extrabold">{t('title')}</h3>
        <span className="rounded-full border-2 border-ink bg-yellow px-2 py-0.5 text-[11px] font-extrabold">
          {t('startAge', { age: data.dae_un_start_age })}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {list.map((e) => {
          const current = e.start_age === currentAge
          return (
            <div
              key={e.start_age}
              className={current
                ? 'shrink-0 rounded-xl border-2 border-orange bg-[#FFF4E3] px-2 py-1 shadow-[3px_3px_0_#FF6B00]'
                : 'shrink-0'}
            >
              <GanjiColumn
                topLabel={t('age', { age: e.start_age })}
                stem={e.stem}
                stemElement={e.stem_element}
                branch={e.branch}
                branchElement={e.branch_element}
                stemTenGod={e.stem_ten_god}
                branchTenGod={e.branch_ten_god}
                twelveWun={e.twelve_wun}
                highlight={current}
                badge={current ? t('current') : undefined}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
