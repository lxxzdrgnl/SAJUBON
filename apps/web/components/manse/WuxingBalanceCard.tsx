'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { SajuCalcResponse } from '@sajuguri/api-client'
import { ohaengColor } from '@/lib/ohaeng'
import {
  selectWuxingPercent, judge, balanceScore, balanceLabel, balanceSummary,
  pentagramVertices, nodeRadius, pctLabelPos, arrowPath, linePath,
  SANG_SAENG_PAIRS, SANG_GEUK_PAIRS, WUXING_ORDER, type Verdict,
} from '@/lib/manse/wuxing'

function ToggleCheck({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] font-bold text-text-sub">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-4 w-4 items-center justify-center rounded border-2 border-ink ${checked ? 'bg-yellow' : 'bg-surface'}`}
        aria-pressed={checked}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {label}
    </label>
  )
}

function verdictChip(v: Verdict): string {
  if (v === '과다') return 'bg-orange-tint text-[#B34800]'
  if (v === '부족') return 'bg-teal-tint text-[#00665F]'
  return 'bg-border-soft text-text-sub'
}

function ElementBar({ name, pct, verdict, vLabel }: { name: string; pct: number; verdict: Verdict; vLabel: string }) {
  const color = ohaengColor(name)
  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <span className="w-5 font-black" style={{ color }}>{name}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border-soft">
        <i className="block h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="w-10 text-right text-xs font-bold text-text-sub">{pct}%</span>
      <span className={`w-10 rounded-md py-0.5 text-center text-[10px] font-extrabold ${verdictChip(verdict)}`}>{vLabel}</span>
    </div>
  )
}

function Pentagram({ pct, dayElement, t }: { pct: Record<string, number>; dayElement: string; t: ReturnType<typeof useTranslations> }) {
  const v = pentagramVertices()
  const polygon = v.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 300" className="w-full max-w-[280px]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="wx-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#00C2B8" opacity="0.7" />
          </marker>
        </defs>
        <polygon points={polygon} fill="none" stroke="var(--border-soft)" strokeWidth="1.5" strokeDasharray="4,3" />
        {SANG_GEUK_PAIRS.map(([fi, ti], idx) => (
          <path key={`geuk-${idx}`} d={linePath(v, fi, ti)} stroke="#FF6B00" strokeWidth="1" strokeDasharray="4,3" opacity="0.25" fill="none" />
        ))}
        {SANG_SAENG_PAIRS.map(([fi, ti], idx) => (
          <path key={`saeng-${idx}`} d={arrowPath(v, pct, fi, ti)} stroke="#00C2B8" strokeWidth="1.5" opacity="0.5" fill="none" markerEnd="url(#wx-arrow)" />
        ))}
        <circle cx="150" cy="150" r="24" fill="var(--bg-base)" stroke="var(--ink)" strokeWidth="1.5" />
        <text x="150" y="145" textAnchor="middle" fontSize="9" fill="var(--text-sub)">{t('dayLabel')}</text>
        <text x="150" y="162" textAnchor="middle" fontSize="15" fontWeight="bold" fill={ohaengColor(dayElement)}>{dayElement}</text>
        {WUXING_ORDER.map((el, i) => {
          const color = ohaengColor(el)
          const lp = pctLabelPos(v, pct, i)
          return (
            <g key={el}>
              <circle cx={v[i].x} cy={v[i].y} r={nodeRadius(pct[el] ?? 0)} fill={color} fillOpacity="0.14" stroke={color} strokeWidth="2" />
              <text x={v[i].x} y={v[i].y + 6} textAnchor="middle" fontSize="16" fontWeight="bold" fill={color}>{el}</text>
              <text x={lp.x} y={lp.y} textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>{pct[el] ?? 0}%</text>
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex gap-5 text-[11px] text-text-sub">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-teal" />{t('saeng')}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-5 border-t-[1.5px] border-dashed border-orange" />{t('geuk')}</span>
      </div>
    </div>
  )
}

/** 오행 밸런스 카드 — 균형도 블랙 뱃지 + 5색 가로 바 / 펜타그램 탭 전환 (design.md §5.3) */
export default function WuxingBalanceCard({ data }: { data: SajuCalcResponse }) {
  const t = useTranslations('manse.charts.wuxing')
  const [tab, setTab] = useState<'bar' | 'penta'>('bar')
  const [applyHap, setApplyHap] = useState(true)
  const [applyJohu, setApplyJohu] = useState(false)
  const pct = selectWuxingPercent(data, applyHap, applyJohu)
  const score = balanceScore(pct)
  const label = balanceLabel(score)
  const { over, lack } = balanceSummary(pct)
  const dayElement = data.day_pillar.stem_element

  const summaryText =
    over.length || lack.length
      ? [over.length ? `${over.join('·')} ${t('over')}` : '', lack.length ? `${lack.join('·')} ${t('lack')}` : '']
          .filter(Boolean)
          .join(' + ')
      : t('balanced')

  const tabBtn = (key: 'bar' | 'penta') =>
    `rounded-lg border-2 border-ink px-3 py-1 text-xs font-extrabold ${tab === key ? 'bg-yellow text-ink shadow-brutal-sm' : 'bg-surface text-text-sub'}`

  return (
    <section className="rounded-lg border-2 border-ink bg-surface p-4 shadow-brutal">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-extrabold">{t('title')}</h3>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setTab('bar')} className={tabBtn('bar')}>{t('tabBar')}</button>
          <button type="button" onClick={() => setTab('penta')} className={tabBtn('penta')}>{t('tabPentagram')}</button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-ink px-2.5 py-1 text-xs font-black text-yellow">{score}/100</span>
        <span className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${label.tone === 'good' ? 'bg-teal-tint text-[#00665F]' : label.tone === 'mid' ? 'bg-yellow-tint text-[#6b5500]' : 'bg-orange-tint text-[#B34800]'}`}>
          {label.text}
        </span>
        <span className="text-[11px] text-text-sub">{summaryText}</span>
      </div>

      {/* 보정 토글 — 레거시 기능 보존 (G3) */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
        <ToggleCheck checked={applyHap} onToggle={() => setApplyHap(!applyHap)} label={t('applyHap')} />
        <ToggleCheck checked={applyJohu} onToggle={() => setApplyJohu(!applyJohu)} label={t('applyJohu')} />
      </div>

      {tab === 'bar' ? (
        <div>
          {WUXING_ORDER.map((el) => {
            const v = judge(pct[el])
            const vLabel = v === '과다' ? t('verdictOver') : v === '부족' ? t('verdictLack') : t('verdictOk')
            return <ElementBar key={el} name={el} pct={pct[el]} verdict={v} vLabel={vLabel} />
          })}
        </div>
      ) : (
        <Pentagram pct={pct} dayElement={dayElement} t={t} />
      )}
    </section>
  )
}
