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
            <tr>
              <th className="w-14" />
              {slots.map((s) => (
                <th key={s.loc} className={`pb-2 text-[11px] font-extrabold ${s.loc === 'day' ? 'text-orange' : 'text-text-sub'}`}>
                  {s.colLabel}
                  {s.loc === 'day' ? ' ★' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="align-top">
            <tr>
              <td className="py-2 text-[11px] font-bold text-text-sub">{t('twelveWun')}</td>
              {slots.map((s) => (
                <td key={s.loc} className="py-2 text-xs font-extrabold" style={{ color: s.pillar ? ohaengColor(s.pillar.branch_element) : undefined }}>
                  {s.pillar ? s.pillar.twelve_wun : t('none')}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 text-[11px] font-bold text-text-sub">{t('jiJangGan')}</td>
              {slots.map((s) => (
                <td key={s.loc} className="py-2 text-xs tracking-wide text-text-sub">
                  {s.pillar ? jiJangGanText(data.ji_jang_gan, s.loc) || t('none') : t('none')}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 text-[11px] font-bold text-text-sub">{t('sinSal')}</td>
              {slots.map((s) => {
                const sals = s.pillar ? sinSalsForPillar(data.sin_sals, s.loc) : []
                return (
                  <td key={s.loc} className="py-2 text-[11px]">
                    {sals.length ? (
                      sals.map((sal) => {
                        const sign = sal.type === 'lucky' ? '+' : sal.type === 'unlucky' || sal.type === 'warning' ? '-' : '·'
                        const color = sal.type === 'lucky' ? '#00665F' : sal.type === 'unlucky' || sal.type === 'warning' ? '#B34800' : 'var(--text-sub)'
                        return (
                          <div key={sal.name} className="leading-relaxed">
                            <span className="font-extrabold" style={{ color }}>{sign}</span>
                            <span className="text-ink">{sal.name}</span>
                          </div>
                        )
                      })
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
