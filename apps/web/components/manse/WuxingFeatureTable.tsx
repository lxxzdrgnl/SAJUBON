import { getTranslations } from 'next-intl/server'
import type { SajuCalcResponse } from '@sajuguri/api-client'
import { ohaengColor } from '@/lib/ohaeng'
import Accordion from '@/components/ui/Accordion'

/** 오행 특성 참고표 (정적) — WuxingFeatureTable.vue 데이터 보존, 과다/부족 오행 강조 */
const FEATURES = [
  { el: '목', dir: '동 · 봄', traits: '창의·성장·인자함', body: '간·담·눈', jobs: '교육·의료·법' },
  { el: '화', dir: '남 · 여름', traits: '열정·표현·명랑함', body: '심장·소장·혀', jobs: '방송·영업·IT' },
  { el: '토', dir: '중앙 · 환절기', traits: '신뢰·중용·포용력', body: '위·비장·입', jobs: '부동산·금융·중개' },
  { el: '금', dir: '서 · 가을', traits: '의리·결단·정의감', body: '폐·대장·코', jobs: '군경·기계·법조' },
  { el: '수', dir: '북 · 겨울', traits: '지혜·유연·통찰력', body: '신장·방광·귀', jobs: '철학·유통·무역' },
] as const

export default async function WuxingFeatureTable({ data }: { data: SajuCalcResponse }) {
  const t = await getTranslations('manse.charts.feature')
  const dominant = data.dominant_elements ?? []
  const weak = data.weak_elements ?? []

  return (
    <Accordion title={t('title')}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="text-text-sub">
              <th className="py-1.5 pr-2 font-bold">{t('colEl')}</th>
              <th className="py-1.5 pr-2 font-bold">{t('colDir')}</th>
              <th className="py-1.5 pr-2 font-bold">{t('colTraits')}</th>
              <th className="py-1.5 pr-2 font-bold">{t('colBody')}</th>
              <th className="py-1.5 font-bold">{t('colJobs')}</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => {
              const isOver = dominant.includes(f.el)
              const isLack = weak.includes(f.el)
              return (
                <tr key={f.el} className={`border-t border-border-soft ${isOver ? 'bg-orange-tint/40' : isLack ? 'bg-teal-tint/40' : ''}`}>
                  <td className="py-2 pr-2">
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <span className="text-sm font-black" style={{ color: ohaengColor(f.el) }}>{f.el}</span>
                      {isOver && <span className="rounded bg-orange-tint px-1 py-px text-[9px] font-extrabold text-[#B34800]">{t('over')}</span>}
                      {isLack && <span className="rounded bg-teal-tint px-1 py-px text-[9px] font-extrabold text-[#00665F]">{t('lack')}</span>}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-text-sub">{f.dir}</td>
                  <td className="py-2 pr-2">{f.traits}</td>
                  <td className="py-2 pr-2 text-text-sub">{f.body}</td>
                  <td className="py-2 text-text-sub">{f.jobs}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Accordion>
  )
}
