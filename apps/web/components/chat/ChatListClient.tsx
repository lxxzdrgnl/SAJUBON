'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { ChatSession, ProfileResponse } from '@sajuguri/api-client'
import BrutalCard from '@/components/ui/BrutalCard'
import ChatEntrySheet from './ChatEntrySheet'

interface Props {
  sessions: ChatSession[]
  profiles: ProfileResponse[]
}

function formatDate(dt: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(dt))
}

export default function ChatListClient({ sessions, profiles }: Props) {
  const t = useTranslations('chat')
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-black">{t('title')}</h1>
        <button
          className="rounded-xl border-2 border-[#4DA8E8] bg-surface px-4 py-1.5 text-sm font-extrabold text-[#4DA8E8] shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
          onClick={() => setSheetOpen(true)}
        >
          {t('newSession')}
        </button>
      </div>

      {sessions.length === 0 ? (
        <BrutalCard className="flex flex-col items-center gap-3 py-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.svg" alt="" width={64} height={64} />
          <p className="text-[15px] font-extrabold">{t('empty')}</p>
          <p className="text-sm text-text-sub">{t('emptyHint')}</p>
          <button
            className="mt-1 rounded-xl border-2 border-[#4DA8E8] bg-surface px-6 py-2.5 text-sm font-extrabold text-[#4DA8E8] shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80"
            onClick={() => setSheetOpen(true)}
          >
            {t('newSession')}
          </button>
        </BrutalCard>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/chat/${s.id}`}>
                <BrutalCard
                  intensity="soft"
                  className="flex items-center justify-between hover:border-ink hover:shadow-[2px_2px_0_#1A1A1A] transition-all"
                >
                  <span className="truncate text-[14px] font-extrabold text-ink">
                    {s.title || t('sessionFallback')}
                  </span>
                  <span className="ml-3 shrink-0 text-xs text-text-sub">
                    {formatDate(s.last_message_at)}
                  </span>
                </BrutalCard>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ChatEntrySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles}
      />
    </>
  )
}
