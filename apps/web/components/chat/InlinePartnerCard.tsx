'use client'

/**
 * 인라인 상대 만세력 선택 카드 (B5).
 * `request_partner` SSE 이벤트 수신 시 대화 흐름 내에 표시.
 * 선택 → attachPartner 호출.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import type { ProfileResponse } from '@sajuguri/api-client'

interface Props {
  profiles: ProfileResponse[]
  onSelect: (p: ProfileResponse) => void
}

export default function InlinePartnerCard({ profiles, onSelect }: Props) {
  const t = useTranslations('chat')
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="w-full rounded-2xl border-2 border-orange bg-yellow-tint px-3 py-3">
      <p className="mb-2 text-[13px] font-extrabold text-ink">{t('inlinePartner.prompt')}</p>

      {!expanded ? (
        <button
          className="rounded-xl border-2 border-ink bg-yellow px-4 py-2 text-[13px] font-extrabold shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
          onClick={() => setExpanded(true)}
        >
          {t('inlinePartner.action')}
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          {profiles.map((p) => (
            <button
              key={p.id}
              className="flex w-full items-center gap-2 rounded-xl border-2 border-ink bg-surface p-2.5 text-left shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
              onClick={() => onSelect(p)}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink bg-yellow text-xs font-extrabold">
                {p.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-extrabold">{p.name}</span>
                <span className="block text-[11px] text-text-sub">{p.birth_date}</span>
              </span>
            </button>
          ))}
          <button
            className="mt-1 flex items-center gap-2 rounded-xl border-2 border-ink bg-yellow p-2.5 text-left shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
            onClick={() => router.push('/manse/new')}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink bg-surface text-base">+</span>
            <span className="text-[12px] font-extrabold">{t('pickSheet.directInput')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
