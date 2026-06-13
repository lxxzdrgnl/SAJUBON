import { getTranslations } from 'next-intl/server'
import type { SajuCalcResponse } from '@sajuguri/api-client'
import { ohaengColor } from '@/lib/ohaeng'
import { pillarSlots, sinSalsForPillar, jiJangGanText } from '@/lib/manse/pillars'
import Accordion from '@/components/ui/Accordion'

/** 12운성·신살·지장간 상세 — 기둥별 (Table.vue 하단부 이식). 길신=틸·흉살=오렌지 부호 */
export default async function DetailAccordion({ data }: { data: SajuCalcResponse }) {
  const t = await getTranslations('manse.charts.detail')
  const slots = pillarSlots(data)

  return (
    <Accordion title={t('title')}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] table-fixed border-collapse text-center">
          <thead>
            <tr className="border-b-2 border-ink">
              {/* 행 라벨 열 */}
              <th className="w-14 py-2" />
              {slots.map((s) => (
                <th
                  key={s.loc}
                  className={`pb-2 pt-2 text-[11px] font-extrabold ${
                    s.loc === 'day' ? 'text-orange' : 'text-text-sub'
                  }`}
                >
                  {s.colLabel}
                  {s.loc === 'day' ? ' ★' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="align-top">
            {/* 12운성 행 */}
            <tr className="border-b border-ink">
              <td className="py-2.5 pr-1 text-[11px] font-extrabold text-text-sub">{t('twelveWun')}</td>
              {slots.map((s) => (
                <td key={s.loc} className="py-2.5 text-sm font-extrabold" style={{ color: s.pillar ? ohaengColor(s.pillar.branch_element) : undefined }}>
                  {s.pillar ? s.pillar.twelve_wun : t('none')}
                </td>
              ))}
            </tr>
            {/* 지장간 행 */}
            <tr className="border-b border-ink">
              <td className="py-2.5 pr-1 text-[11px] font-extrabold text-text-sub">{t('jiJangGan')}</td>
              {slots.map((s) => (
                <td key={s.loc} className="py-2.5 text-xs font-bold tracking-wide text-ink">
                  {s.pillar ? jiJangGanText(data.ji_jang_gan, s.loc) || t('none') : t('none')}
                </td>
              ))}
            </tr>
            {/* 신살 행 */}
            <tr>
              <td className="py-2.5 pr-1 text-[11px] font-extrabold text-text-sub">{t('sinSal')}</td>
              {slots.map((s) => {
                const sals = s.pillar ? sinSalsForPillar(data.sin_sals, s.loc) : []
                return (
                  <td key={s.loc} className="py-2.5 text-[11px]">
                    {sals.length ? (
                      <div className="flex flex-col items-center gap-1">
                        {sals.map((sal) => {
                          const isLucky = sal.type === 'lucky'
                          const isUnlucky = sal.type === 'unlucky' || sal.type === 'warning'
                          return (
                            <span
                              key={sal.name}
                              className={`inline-block rounded-[8px] border-[1.5px] border-ink px-1.5 py-px text-[10px] font-extrabold shadow-[1.5px_1.5px_0_#1A1A1A] ${
                                isLucky
                                  ? 'bg-teal-tint text-[#00665F]'
                                  : isUnlucky
                                    ? 'bg-orange-tint text-[#B34800]'
                                    : 'bg-surface text-text-sub'
                              }`}
                            >
                              {isLucky ? '+' : isUnlucky ? '-' : '·'}{sal.name}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-text-sub">{t('none')}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </Accordion>
  )
}
