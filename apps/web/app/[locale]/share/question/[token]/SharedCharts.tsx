'use client'

/**
 * 공유 페이지 차트 영역 — 저장된 charts/more를 ToolCard로 렌더.
 * /question 결과 화면의 차트 렌더 방식과 동일 (자동 charts + more 칩 토글).
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ToolChartItem } from '@sajuguri/api-client'
import ToolCard from '@/components/chat/ToolCard'

interface Props {
  charts: ToolChartItem[]
  more: ToolChartItem[]
}

export default function SharedCharts({ charts, more }: Props) {
  const tToolCard = useTranslations('chat.toolCard')
  const [openMore, setOpenMore] = useState<Set<number>>(new Set())

  if (charts.length === 0 && more.length === 0) return null

  const toggleMore = (i: number) => {
    setOpenMore((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {charts.map((item, i) => (
        <ToolCard key={i} tool={item.tool} payload={item.payload} />
      ))}

      {more.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {more.map((item, i) => {
              const isOpen = openMore.has(i)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleMore(i)}
                  className={`rounded-full border-2 px-3 py-1 text-[12px] font-extrabold transition-colors ${
                    isOpen
                      ? 'border-teal bg-teal-tint text-teal-deep'
                      : 'border-border-soft bg-surface text-text-sub hover:border-ink hover:text-ink'
                  }`}
                >
                  {tToolCard.has(`labels.${item.tool}`) ? tToolCard(`labels.${item.tool}`) : item.tool}
                </button>
              )
            })}
          </div>
          {more.map((item, i) =>
            openMore.has(i) ? (
              <ToolCard key={i} tool={item.tool} payload={item.payload} />
            ) : null,
          )}
        </div>
      )}
    </div>
  )
}
