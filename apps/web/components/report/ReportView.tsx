'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ReportDetail, YearFlowMonth } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import { shareReport } from '@sajuguri/api-client'
import ShareModal from '@/components/ui/ShareModal'
import { useShareModal } from '@/lib/hooks/useShareModal'
import ToolCard from '@/components/chat/ToolCard'
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
    ['get_dae_un', 'dae_un'],
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

      {/* 상/하반기 — 세로 스택.
          2열로 두면 390px 화면에서 한 열이 170px이라 산문이 줄당 11자로 끊긴다. */}
      <div className="flex flex-col gap-2">
        {[
          { label: t('page.firstHalf'), text: yearFlow.first_half },
          { label: t('page.secondHalf'), text: yearFlow.second_half },
        ].map(({ label, text }) => (
          <div key={label} className="rounded-lg border-2 border-ink bg-surface p-3.5 shadow-brutal-sm">
            <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-teal-deep">
              {label}
            </p>
            <p className="text-[14px] leading-relaxed text-ink">{text}</p>
          </div>
        ))}
      </div>

      {/* 월별 흐름 — 표가 아니라 행 목록.
          표는 '월' 칼럼이 좁아 "2/월"로 쪼개지고 매 행 보더가 눈을 어지럽혔다.
          리포트 아코디언과 같은 언어(모노 칩 + 굵은 제목 + 보조 설명)로 맞춘다. */}
      <div className="overflow-hidden rounded-lg border-2 border-ink bg-surface shadow-brutal">
        <ul className="divide-y divide-border-soft">
          {visible.map(m => (
            <li key={m.month} className="flex items-start gap-2.5 px-3.5 py-2.5">
              <span className="mt-px shrink-0 rounded-md border-2 border-ink bg-bg-base px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums leading-none text-ink">
                {m.month}월
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-extrabold leading-snug text-ink">{m.keyword}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-text-sub">{m.memo}</p>
              </div>
            </li>
          ))}
        </ul>
        {!expanded && months.length > 4 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full border-t-2 border-ink bg-bg-base py-2.5 text-[13px] font-extrabold text-ink transition-colors hover:bg-yellow-tint"
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
  daeUnChart,
  t,
}: {
  daeUn: ReportDetail['dae_un_analysis']
  daeUnChart?: Record<string, unknown>
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[17px] font-extrabold">
        <span className="text-orange">{t('page.daeUnTitle')}</span>
      </h2>

      {/* 대운 전체 타임라인 — 현재 대운 강조 */}
      {daeUnChart && <ToolCard tool="get_dae_un" payload={daeUnChart} />}

      <div className="flex flex-col gap-2">
        {/* 현재 대운 — 오렌지 강조 */}
        <div className="rounded-lg border-2 border-orange bg-surface p-3 shadow-pop">
          <p className="mb-1 text-[12px] font-extrabold text-orange">{t('page.currentDaeUn')}</p>
          <p className="mb-0.5 font-serif text-xl font-extrabold text-ink">{daeUn.current.ganji}</p>
          <p className="mb-2 text-[12px] font-semibold text-ink opacity-60">{daeUn.current.period}</p>
          <p className="text-[14px] leading-relaxed text-ink">{daeUn.current.text}</p>
        </div>

        {/* 다음 대운 — 일반 */}
        <div className="rounded-lg border-2 border-ink bg-surface p-3 shadow-brutal">
          <p className="mb-1 text-[12px] font-extrabold text-ink">{t('page.nextDaeUn')}</p>
          <p className="mb-0.5 font-serif text-xl font-extrabold text-ink">{daeUn.next.ganji}</p>
          <p className="mb-2 text-[12px] font-semibold text-ink opacity-60">{daeUn.next.period}</p>
          <p className="text-[14px] leading-relaxed text-ink">{daeUn.next.text}</p>
        </div>
      </div>

      {/* 주의점 */}
      <div className="rounded-lg border-2 border-ink bg-surface px-4 py-3 shadow-brutal-sm">
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

  const chartsToolByName = buildChartsToolByName(report.charts)

  return (
    <div className="flex flex-col gap-4">
      <TabbedReport
        overview={
          <>
            <YearFlowSection yearFlow={report.year_flow} t={t} />
            <DaeUnSection
              daeUn={report.dae_un_analysis}
              daeUnChart={chartsToolByName['get_dae_un']}
              t={t}
            />
          </>
        }
        tabs={report.tabs}
        onShare={handleShare}
        shareLabel={sharing ? t('page.shareBtn') + '...' : t('page.shareBtn')}
        shareMode={shareMode}
        chartsToolByName={chartsToolByName}
      />

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
