import { getTranslations } from 'next-intl/server'
import type { SajuCalcResponse } from '@sajuguri/api-client'
import { ohaengColor } from '@/lib/ohaeng'
import { donutArcs, groupSummary, dominantGroups, TG_ELEMENT, DONUT_GEOMETRY } from '@/lib/manse/tenGods'

/** 십성 구조 카드 — SVG 도넛(중앙 핵심 구조) + 그룹 요약 바 (SipseongDonutChart.vue 이식) */
export default async function TenGodsCard({ data }: { data: SajuCalcResponse }) {
  const t = await getTranslations('manse.charts.tenGods')
  const dist = data.ten_gods_distribution ?? {}
  const arcs = donutArcs(dist, (ss) => ohaengColor(TG_ELEMENT[ss] ?? ''))
  const summary = groupSummary(dist)
  const dominant = dominantGroups(dist)
  const { CX, CY } = DONUT_GEOMETRY

  return (
    <section className="rounded-2xl border-2 border-ink bg-surface p-4 shadow-brutal">
      <h3 className="mb-3 text-[15px] font-extrabold">{t('title')}</h3>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <svg viewBox="0 0 120 120" className="h-[140px] w-[140px]" xmlns="http://www.w3.org/2000/svg">
            {arcs.map((a) => (
              <path key={a.ss} d={a.d} fill={a.color} stroke="#FFFFFF" strokeWidth="1.5" />
            ))}
            <text x={CX} y={CY - 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-sub)">{t('core')}</text>
            <text x={CX} y={CY + 10} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--ink)">
              {dominant.join('·') || '—'}
            </text>
          </svg>
        </div>

        <div className="w-full min-w-0 flex-1">
          <p className="mb-1.5 text-[11px] font-extrabold text-text-sub">{t('summary')}</p>
          {summary.map((g) => {
            const hot = dominant.includes(g.group)
            return (
              <div key={g.group} className="mt-2 flex items-center gap-2 text-sm">
                <span className="w-12 shrink-0">
                  <span className={`block text-[13px] font-black ${hot ? 'text-orange' : 'text-ink'}`}>{g.group}</span>
                  <span className="block text-[9px] text-text-sub">{g.label}</span>
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-soft">
                  <i className="block h-full rounded-full" style={{ width: `${Math.min(g.pct, 100)}%`, background: hot ? 'var(--orange)' : '#A09880' }} />
                </div>
                <span className="w-9 text-right text-xs font-bold text-text-sub">{g.pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
