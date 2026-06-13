'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import BrutalCard from '@/components/ui/BrutalCard'
import { RECORD_TYPES, type RecordItem, type Translate } from '@/lib/records/registry'
import { mergeFeed, filterFeed } from '@/lib/records/feed'

interface Props {
  /** 타입 key → 레코드 목록 (서버에서 레지스트리 fetch로 채워 전달) */
  records: Record<string, RecordItem[]>
  /** 초기 선택 필터 (마이 페이지 "전체 보기 →"의 ?type=) */
  initialType?: string
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'shrink-0 whitespace-nowrap rounded-xl border-2 border-ink px-3 py-1.5 text-[13px] font-extrabold shadow-[2px_2px_0_#1A1A1A] transition-opacity ' +
        (active ? 'bg-yellow text-ink' : 'bg-surface text-text-sub hover:opacity-80')
      }
    >
      {children}
    </button>
  )
}

export default function HistoryFeedClient({ records, initialType }: Props) {
  const t = useTranslations('my.records') as unknown as Translate
  const validInitial = initialType && RECORD_TYPES.some((x) => x.key === initialType) ? initialType : 'all'
  const [filter, setFilter] = useState<string>(validInitial)

  const typeByKey = useMemo(() => new Map(RECORD_TYPES.map((x) => [x.key, x])), [])

  // 전체 피드 — 모든 종류 병합, 최신순.
  const feed = useMemo(
    () => mergeFeed(records, RECORD_TYPES.map((x) => x.key)),
    [records],
  )

  const visible = useMemo(() => filterFeed(feed, filter), [feed, filter])

  return (
    <section>
      {/* 가로 스크롤 필터 칩 */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <ChipButton active={filter === 'all'} onClick={() => setFilter('all')}>
          {t('filterAll')}
        </ChipButton>
        {RECORD_TYPES.map((type) => (
          <ChipButton key={type.key} active={filter === type.key} onClick={() => setFilter(type.key)}>
            {type.label(t)}
          </ChipButton>
        ))}
      </div>

      {visible.length === 0 ? (
        <BrutalCard intensity="soft" className="py-8 text-center">
          <p className="text-[13px] text-text-sub">{t('feedEmpty')}</p>
        </BrutalCard>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((e) => {
            const type = typeByKey.get(e.typeKey)!
            return <li key={`${e.typeKey}-${e.item.id}`}>{type.renderCard(e.item, t)}</li>
          })}
        </ul>
      )}
    </section>
  )
}
