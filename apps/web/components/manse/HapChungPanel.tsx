'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { SajuCalcResponse, Pillar } from '@sajuguri/api-client'
import { ohaengColor } from '@/lib/ohaeng'
import { ALL_TABS, buildEntries, hasData, activePillars, PLABEL, type TabKey, type PillarKey } from '@/lib/manse/hapChung'

const PALACE_WEIGHTS: Record<PillarKey, { stem: string; branch: string }> = {
  hour: { stem: '×1.0', branch: '×0.8' },
  day: { stem: '×1.5', branch: '×1.0' },
  month: { stem: '×1.0', branch: '×2.0' },
  year: { stem: '×1.0', branch: '×1.0' },
}

function pillarOf(data: SajuCalcResponse, p: PillarKey): Pillar | null {
  return (data[`${p}_pillar`] as Pillar | null) ?? null
}

/** 합충 분석 — 삼합/육합/충/형/파/해/원진 + 궁성 탭 (HapChungPanel.vue 이식). 엔트리 빌드는 lib/manse/hapChung */
export default function HapChungPanel({ data }: { data: SajuCalcResponse }) {
  const t = useTranslations('manse.charts.hapChung')
  const [tab, setTab] = useState<TabKey>('gung_seong')
  const active = activePillars(data)
  const entries = buildEntries(data, tab)
  const showWeight = tab === 'gung_seong'

  function MiniGrid({ stems, branches }: { stems: PillarKey[]; branches: PillarKey[] }) {
    return (
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {active.map((pk) => {
          const p = pillarOf(data, pk)
          /* Box: 고정 높이로 가중치 라벨과 간지 글자가 겹치지 않게 분리 */
          const Box = ({ ch, on, weight }: { ch?: string; on: boolean; weight?: string }) => (
            <div className={`flex h-[56px] flex-col items-center justify-center rounded-lg border-2 ${on ? 'border-orange bg-orange text-white' : 'border-border-soft bg-surface'}`}>
              <span className="font-serif text-xl font-black leading-none">{ch ?? '—'}</span>
              {/* 가중치 영역을 고정 높이(16px)로 예약 — 없으면 빈 줄로 유지해 정렬 안정 */}
              <span className={`mt-0.5 text-[9px] font-bold ${on ? 'text-white/70' : 'text-text-sub'}`}>{weight ?? ''}</span>
            </div>
          )
          return (
            <div key={pk} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-text-sub">{PLABEL[pk]}주</span>
              <Box ch={p?.stem} on={stems.includes(pk)} weight={showWeight ? PALACE_WEIGHTS[pk].stem : undefined} />
              <Box ch={p?.branch} on={branches.includes(pk)} weight={showWeight ? PALACE_WEIGHTS[pk].branch : undefined} />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-[4px_4px_0_#1A1A1A]">
      <h3 className="px-4 pt-4 text-[15px] font-extrabold">{t('title')}</h3>

      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {ALL_TABS.map((tabDef) => {
          const has = hasData(data, tabDef.key)
          const isActive = tab === tabDef.key
          return (
            <button
              key={tabDef.key}
              type="button"
              onClick={() => setTab(tabDef.key)}
              className={`rounded-full border-2 px-2.5 py-0.5 text-[11px] font-extrabold ${
                isActive
                  ? 'border-ink bg-yellow text-ink shadow-[2px_2px_0_#1A1A1A]'
                  : has
                    ? 'border-ink bg-surface text-ink shadow-[2px_2px_0_#1A1A1A]'
                    : 'border-border-soft bg-surface text-text-sub'
              }`}
            >
              {tabDef.label}
            </button>
          )
        })}
      </div>

      <div className="border-t-[1.5px] border-border-soft px-4 py-3">
        {showWeight ? (
          <>
            <p className="mb-2 text-xs leading-relaxed text-text-sub">{t('gungSeongDesc')}</p>
            <MiniGrid stems={[]} branches={[]} />
          </>
        ) : entries.length === 0 ? (
          <p className="py-2 text-sm text-text-sub">{t('empty')}</p>
        ) : (
          <div className="flex flex-col gap-5">
            {entries.map((e, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <p className="text-sm leading-snug text-ink [&_b]:font-black [&_b]:text-orange" dangerouslySetInnerHTML={{ __html: e.text }} />
                {e.broken && <span className="w-fit rounded-[10px] border-2 border-ink bg-orange-tint px-2 py-0.5 text-[11px] font-extrabold text-[#B34800] shadow-[2px_2px_0_#1A1A1A]">{t('broken')}</span>}
                {e.resultEl && !e.broken && (
                  <span className="w-fit rounded-[10px] border-2 border-ink px-2 py-0.5 text-[11px] font-extrabold shadow-[2px_2px_0_#1A1A1A]" style={{ color: ohaengColor(e.resultEl), background: `${ohaengColor(e.resultEl)}1A` }}>
                    → {e.resultEl}화(化)
                  </span>
                )}
                <MiniGrid stems={e.stems} branches={e.branches} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
