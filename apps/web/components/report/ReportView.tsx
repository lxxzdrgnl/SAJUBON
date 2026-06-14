'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import type { ReportDetail, YearFlowMonth } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import { shareReport } from '@sajuguri/api-client'
import ShareModal from '@/components/ui/ShareModal'
import { useShareModal } from '@/lib/hooks/useShareModal'
import TabbedReport from './TabbedReport'

// ── 원국 차트 → tool 이름 맵 ─────────────────────────────────────────────────────
// detail.charts(백엔드가 birth_input으로 재계산)를 채팅 ToolCard payload 모양 그대로
// tool 이름에 매핑한다. 탭 content의 `[[chart:TOOL]]` 마커가 이 맵으로 인라인 렌더된다.

function buildChartsToolByName(
  charts: Record<string, unknown> | undefined,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {}
  if (!charts) return out
  const map: Array<[string, string]> = [
    ['get_palja', 'palja'],
    ['get_wuxing_balance', 'wuxing_balance'],
    ['get_strength', 'strength'],
    ['get_ten_gods', 'ten_gods'],
    ['get_sin_sal', 'sin_sal'],
    ['get_twelve_un_seong', 'twelve_un_seong'],
    ['get_hap_chung', 'hap_chung'],
  ]
  for (const [tool, key] of map) {
    const payload = charts[key]
    if (payload && typeof payload === 'object') {
      out[tool] = payload as Record<string, unknown>
    }
  }
  return out
}

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
                <td className="w-[88px] min-w-[88px] whitespace-nowrap px-3 py-2 text-[13px] font-bold text-ink">{m.keyword}</td>
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

      <div className="flex flex-col gap-2">
        {/* 현재 대운 — 오렌지 강조 */}
        <div className="rounded-2xl border-2 border-orange bg-surface p-3 shadow-[4px_4px_0_#FF6B00]">
          <p className="mb-1 text-[12px] font-extrabold text-orange">{t('page.currentDaeUn')}</p>
          <p className="mb-0.5 font-serif text-xl font-extrabold text-ink">{daeUn.current.ganji}</p>
          <p className="mb-2 text-[12px] font-semibold text-ink opacity-60">{daeUn.current.period}</p>
          <p className="text-[14px] leading-relaxed text-ink">{daeUn.current.text}</p>
        </div>

        {/* 다음 대운 — 일반 */}
        <div className="rounded-2xl border-2 border-ink bg-surface p-3 shadow-[4px_4px_0_#1A1A1A]">
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
  const { shareUrl, sharing, share, close } = useShareModal()

  function handleShare() {
    if (shareUrl) return
    share(() =>
      shareReport(api, reportId, false).then(
        (res) => res.share_url || `${window.location.origin}/share/report/${res.share_token}`,
      ),
    )
  }

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

  const chartsToolByName = buildChartsToolByName(report.charts)

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
        onShare={handleShare}
        shareLabel={sharing ? t('page.shareBtn') + '...' : t('page.shareBtn')}
        shareMode={shareMode}
        chartsToolByName={chartsToolByName}
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
      <ShareModal
        open={shareUrl !== null}
        url={shareUrl ?? ''}
        title={t('page.shareTitle')}
        onClose={close}
      />
    </div>
  )
}
