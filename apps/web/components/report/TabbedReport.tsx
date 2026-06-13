'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ReportTab } from '@sajuguri/api-client'
import type { ReactNode } from 'react'
import Markdown from '@/components/ui/Markdown'

// ── 헤드라인 아코디언 ──────────────────────────────────────────────────────────

function TabAccordion({ tab, t }: { tab: ReportTab; t: ReturnType<typeof useTranslations> }) {
  const [open, setOpen] = useState(false)
  const paragraphs = tab.content.split('\n\n').filter(Boolean)
  const lastIdx = paragraphs.length - 1

  return (
    <div
      className={`overflow-hidden rounded-2xl bg-surface transition-all ${
        open
          ? 'border-2 border-orange shadow-[4px_4px_0_#FF6B00]'
          : 'border-[1.5px] border-border-soft'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-start gap-2 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-[6px] bg-orange px-2 py-0.5 text-[11px] font-extrabold text-white">
              {tab.category}
            </span>
            {tab.requested && (
              <span className="shrink-0 rounded-full border-[1.5px] border-orange px-2 py-0.5 text-[10px] font-extrabold text-orange">
                {t('page.requestedBadge')}
              </span>
            )}
          </div>
          <p className="text-[15.5px] font-extrabold leading-snug text-ink">
            {tab.headline}
          </p>
        </div>
        <svg
          className={`mt-1 h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t-[1.5px] border-dashed border-border-soft px-4 py-3">
          {paragraphs.map((para, i) =>
            i === lastIdx ? (
              <div key={i} className="mt-3 rounded-xl bg-[#FFF4E3] px-4 py-3">
                <p className="mb-1 text-[11px] font-extrabold text-orange">{t('page.adviceBoxLabel')}</p>
                <Markdown className="text-[14px] text-ink">{para}</Markdown>
              </div>
            ) : (
              <Markdown key={i} className="mb-3 text-[14px] text-ink">{para}</Markdown>
            ),
          )}
        </div>
      )}
    </div>
  )
}

// ── 제네릭 탭 리포트 뷰 ────────────────────────────────────────────────────────

export interface TabbedReportProps {
  tabs: ReportTab[]
  overview?: ReactNode
  onShare?: () => void
  shareLabel?: string
  shareMode?: boolean
}

export default function TabbedReport({
  tabs,
  overview,
  onShare,
  shareLabel,
  shareMode = false,
}: TabbedReportProps) {
  const t = useTranslations('report')
  const label = shareLabel ?? t('page.shareBtn')

  return (
    <div className="flex flex-col gap-4">
      {/* 오버뷰 슬롯 — 탭 위에 도메인별 컴포넌트 삽입 */}
      {overview}

      {/* 헤드라인 아코디언 */}
      {tabs.map((tab, i) => (
        <TabAccordion key={i} tab={tab} t={t} />
      ))}

      {/* 공유 버튼 (공유 모드에서는 숨김) */}
      {!shareMode && onShare && (
        <div className="pb-4">
          <button
            type="button"
            onClick={onShare}
            className="w-full rounded-xl border-2 border-ink bg-teal py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_#1A1A1A]"
          >
            {label}
          </button>
        </div>
      )}
    </div>
  )
}
