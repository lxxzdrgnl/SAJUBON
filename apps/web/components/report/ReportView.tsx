'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import type { ReportDetail, YearFlowMonth } from '@sajuguri/api-client'
import ShareModal from './ShareModal'
import TabbedReport from './TabbedReport'

// ── 올해의 흐름 ────────────────────────────────────────────────────────────────

function YearFlowSection({
  yearFlow,
  t,
}: {
  yearFlow: ReportDetail['year_flow']
  t: ReturnType<typeof useTranslations>
}) {
  const [expanded, setExpanded] = useState(false)
  const months: YearFlowMonth[] = yearFlow.months ?? []
  const visible = expanded ? months : months.slice(0, 4)

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[17px] font-extrabold">
        <span className="text-teal">{t('page.yearFlowTitle')}</span>{' '}
        <span className="text-ink">{yearFlow.year}</span>
      </h2>

      {/* 상/하반기 카드 */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-2xl border-2 border-ink bg-surface p-3 shadow-[4px_4px_0_#1A1A1A]">
          <p className="mb-1 text-[12px] font-extrabold text-teal">{t('page.firstHalf')}</p>
          <p className="text-[14px] leading-relaxed text-ink">{yearFlow.first_half}</p>
        </div>
        <div className="flex-1 rounded-2xl border-2 border-ink bg-surface p-3 shadow-[4px_4px_0_#1A1A1A]">
          <p className="mb-1 text-[12px] font-extrabold text-teal">{t('page.secondHalf')}</p>
          <p className="text-[14px] leading-relaxed text-ink">{yearFlow.second_half}</p>
        </div>
      </div>

      {/* 월별 표 */}
      <div className="overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-[4px_4px_0_#1A1A1A]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="px-3 py-2 text-left text-[12px] font-extrabold text-ink">{t('page.monthCol')}</th>
              <th className="px-3 py-2 text-left text-[12px] font-extrabold text-ink">{t('page.keywordCol')}</th>
              <th className="px-3 py-2 text-left text-[12px] font-extrabold text-ink">{t('page.memoCol')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(m => (
              <tr key={m.month} className="border-b-[1px] border-ink last:border-0">
                <td className="px-3 py-2 text-[13px] font-extrabold text-orange">{m.month}월</td>
                <td className="whitespace-nowrap break-keep px-3 py-2 text-[13px] font-bold text-ink">{m.keyword}</td>
                <td className="px-3 py-2 text-[13px] leading-snug text-ink">{m.memo}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!expanded && months.length > 4 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full border-t-[1px] border-ink py-2 text-[13px] font-bold text-ink hover:bg-surface"
          >
            {t('page.showMore')} ({months.length - 4})
          </button>
        )}
      </div>
    </div>
  )
}

// ── 대운 비교 ──────────────────────────────────────────────────────────────────

function DaeUnSection({
  daeUn,
  t,
}: {
  daeUn: ReportDetail['dae_un_analysis']
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[17px] font-extrabold">
        <span className="text-orange">{t('page.daeUnTitle')}</span>
      </h2>

      <div className="flex gap-2">
        {/* 현재 대운 — 오렌지 강조 */}
        <div className="flex-1 rounded-2xl border-2 border-orange bg-surface p-3 shadow-[4px_4px_0_#FF6B00]">
          <p className="mb-1 text-[12px] font-extrabold text-orange">{t('page.currentDaeUn')}</p>
          <p className="mb-0.5 font-serif text-xl font-extrabold text-ink">{daeUn.current.ganji}</p>
          <p className="mb-2 text-[12px] font-semibold text-ink opacity-60">{daeUn.current.period}</p>
          <p className="text-[14px] leading-relaxed text-ink">{daeUn.current.text}</p>
        </div>

        {/* 다음 대운 — 일반 */}
        <div className="flex-1 rounded-2xl border-2 border-ink bg-surface p-3 shadow-[4px_4px_0_#1A1A1A]">
          <p className="mb-1 text-[12px] font-extrabold text-ink">{t('page.nextDaeUn')}</p>
          <p className="mb-0.5 font-serif text-xl font-extrabold text-ink">{daeUn.next.ganji}</p>
          <p className="mb-2 text-[12px] font-semibold text-ink opacity-60">{daeUn.next.period}</p>
          <p className="text-[14px] leading-relaxed text-ink">{daeUn.next.text}</p>
        </div>
      </div>

      {/* 주의점 */}
      <div className="rounded-2xl border-2 border-ink bg-surface px-4 py-3 shadow-[2px_2px_0_#1A1A1A]">
        <p className="mb-1 text-[12px] font-extrabold text-orange">{t('page.cautionLabel')}</p>
        <p className="text-[14px] leading-relaxed text-ink">{daeUn.caution}</p>
      </div>
    </div>
  )
}

// ── 메인 ReportView ────────────────────────────────────────────────────────────

export default function ReportView({
  report,
  reportId,
  shareMode = false,
}: {
  report: ReportDetail
  reportId: number
  shareMode?: boolean
}) {
  const t = useTranslations('report')
  const [showShare, setShowShare] = useState(false)

  // birth 쿼리 재구성 (다시 생성 CTA용)
  const bi = report.birth_input
  const regenQuery = new URLSearchParams(
    Object.entries({
      name: bi.name,
      birth_date: bi.birth_date,
      birth_time: bi.birth_time,
      gender: bi.gender,
      calendar: bi.calendar,
      is_leap_month: bi.is_leap_month,
    })
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString()

  return (
    <div className="flex flex-col gap-4">
      <TabbedReport
        overview={
          <>
            <YearFlowSection yearFlow={report.year_flow} t={t} />
            <DaeUnSection daeUn={report.dae_un_analysis} t={t} />
          </>
        }
        tabs={report.tabs}
        onShare={() => setShowShare(true)}
        shareMode={shareMode}
      />

      {/* 다시 생성 CTA (공유 모드에서는 숨김) */}
      {!shareMode && (
        <div className="pb-4">
          <Link
            href={`/report/new?${regenQuery}`}
            className="block w-full rounded-xl border-2 border-ink bg-surface py-3 text-center text-sm font-extrabold text-ink shadow-[4px_4px_0_#1A1A1A]"
          >
            {t('page.regenerateBtn')}
          </Link>
        </div>
      )}

      {/* 공유 모달 */}
      {showShare && (
        <ShareModal
          reportId={reportId}
          onClose={() => setShowShare(false)}
          t={t}
        />
      )}
    </div>
  )
}
