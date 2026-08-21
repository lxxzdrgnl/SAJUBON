'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ReportTab } from '@sajuguri/api-client'
import type { ReactNode } from 'react'
import Markdown from '@/components/ui/Markdown'
import { renderTextWithCharts, markerToolsInText, CHART_MARKER_RE } from '@/lib/chat/chartMarkers'

// ── 헤드라인 아코디언 ──────────────────────────────────────────────────────────

/**
 * 한 문단(Markdown) 안의 `[[chart:TOOL]]` 마커를 인라인 ToolCard로 치환해 렌더.
 * 마커가 없으면(대부분) 평소처럼 Markdown 한 덩이만 렌더된다.
 * chartsToolByName가 비면 마커는 토큰만 제거되고 텍스트는 평문 렌더된다.
 */
function ParagraphWithCharts({
  text,
  chartsToolByName,
  keyPrefix,
  className,
}: {
  text: string
  chartsToolByName: Record<string, Record<string, unknown>>
  keyPrefix: string
  className: string
}) {
  const nodes = renderTextWithCharts(text, chartsToolByName, keyPrefix, {
    renderText: (seg, key) => (
      <Markdown key={key} className={className}>{seg}</Markdown>
    ),
  })
  return <>{nodes}</>
}

function TabAccordion({
  tab,
  t,
  chartsToolByName,
}: {
  tab: ReportTab
  t: ReturnType<typeof useTranslations>
  chartsToolByName: Record<string, Record<string, unknown>>
}) {
  const [open, setOpen] = useState(false)
  const paragraphs = tab.content.split('\n\n').filter(Boolean)
  const lastIdx = paragraphs.length - 1

  return (
    <div
      className={`overflow-hidden rounded-2xl bg-surface transition-all ${
        open
          ? 'border-2 border-orange shadow-pop'
          : 'border-2 border-ink shadow-brutal'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-start gap-2 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="shrink-0 rounded border-2 border-ink px-2 py-0.5 text-[11px] font-extrabold text-ink shadow-gloss"
              style={{ background: 'var(--holo)' }}
            >
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
        <div className="border-t-2 border-dashed border-ink px-4 py-3">
          {paragraphs.map((para, i) =>
            i === lastIdx ? (
              // 마지막 문단 = "현실 조언" 박스. 단, 궁합 리포트는 차트 마커+캡션을 조언 문단
              // 뒤에 빈 줄 없이 붙여 마지막 문단에 끼어든다(사주 리포트는 빈 줄로 분리돼 무관).
              // → 첫 차트 마커 기준으로 쪼개서, 앞쪽(순수 조언 텍스트)만 박스에 넣고
              //   마커 이후(차트+캡션)는 본문으로 박스 위에 렌더한다. 박스엔 차트가 안 갇힌다.
              (() => {
                const hasChart = markerToolsInText(para).some((tool) => chartsToolByName[tool])
                if (!hasChart) {
                  return (
                    <div key={i} className="mt-3 rounded-xl bg-[#DCF4FF] px-4 py-3">
                      <p className="mb-1 text-[11px] font-extrabold text-orange">{t('page.adviceBoxLabel')}</p>
                      <ParagraphWithCharts
                        text={para}
                        chartsToolByName={chartsToolByName}
                        keyPrefix={`p${i}`}
                        className="text-[14px] text-ink"
                      />
                    </div>
                  )
                }
                const markerStart = para.search(CHART_MARKER_RE)
                const adviceText = para.slice(0, markerStart).trim()
                const chartBlock = para.slice(markerStart)
                return (
                  <div key={i}>
                    {/* 차트 + 캡션 — 본문 흐름(박스 위) */}
                    <ParagraphWithCharts
                      text={chartBlock}
                      chartsToolByName={chartsToolByName}
                      keyPrefix={`p${i}-chart`}
                      className="mb-3 text-[14px] text-ink"
                    />
                    {/* 현실 조언 — 텍스트만 */}
                    {adviceText && (
                      <div className="mt-3 rounded-xl bg-[#DCF4FF] px-4 py-3">
                        <p className="mb-1 text-[11px] font-extrabold text-orange">{t('page.adviceBoxLabel')}</p>
                        <Markdown className="text-[14px] text-ink">{adviceText}</Markdown>
                      </div>
                    )}
                  </div>
                )
              })()
            ) : (
              <ParagraphWithCharts
                key={i}
                text={para}
                chartsToolByName={chartsToolByName}
                keyPrefix={`p${i}`}
                className="mb-3 text-[14px] text-ink"
              />
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
  /**
   * 원국 차트 payload 맵 (tool 이름 → payload). 탭 content의 `[[chart:TOOL]]`
   * 마커가 이 맵으로 인라인 ToolCard로 치환된다. 없으면 마커는 무시된다.
   */
  chartsToolByName?: Record<string, Record<string, unknown>>
}

export default function TabbedReport({
  tabs,
  overview,
  onShare,
  shareLabel,
  shareMode = false,
  chartsToolByName = {},
}: TabbedReportProps) {
  const t = useTranslations('report')
  const label = shareLabel ?? t('page.shareBtn')

  return (
    <div className="flex flex-col gap-4">
      {/* 오버뷰 슬롯 — 탭 위에 도메인별 컴포넌트 삽입 */}
      {overview}

      {/* 헤드라인 아코디언 */}
      {tabs.map((tab, i) => (
        <TabAccordion key={i} tab={tab} t={t} chartsToolByName={chartsToolByName} />
      ))}

      {/* 공유 버튼 (공유 모드에서는 숨김) */}
      {!shareMode && onShare && (
        <div className="pb-4">
          <button
            type="button"
            onClick={onShare}
            className="w-full rounded-xl border-2 border-ink bg-teal py-3 text-sm font-extrabold text-white shadow-brutal"
          >
            {label}
          </button>
        </div>
      )}
    </div>
  )
}
