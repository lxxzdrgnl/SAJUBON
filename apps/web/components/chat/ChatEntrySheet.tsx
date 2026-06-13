'use client'

/**
 * 채팅 진입 시트 — FortuneEntrySheet 패턴 재사용.
 * 저장된 만세력 선택 → 세션 생성 → /chat/[id]로 이동.
 * 직접 입력 → /manse/new로 이동 후 복귀 시 세션 생성 (B5 구현 예정, 여기서는 placeholder).
 */
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { ProfileResponse } from '@sajuguri/api-client'
import { createSession } from '@sajuguri/api-client'
import { api } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]
}

export default function ChatEntrySheet({ open, onClose, profiles }: Props) {
  const t = useTranslations('chat')
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  const handleProfile = useCallback(
    async (p: ProfileResponse) => {
      if (creating) return
      setCreating(true)
      try {
        const session = await createSession(api, { profile_id: p.id })
        onClose()
        router.push(`/chat/${session.id}`)
      } catch {
        setCreating(false)
      }
    },
    [creating, onClose, router],
  )

  if (!open) return null

  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 z-40 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 시트 */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[640px] rounded-t-[22px] border-2 border-ink bg-surface shadow-[0_-4px_0_#1A1A1A]"
        role="dialog"
        aria-modal="true"
      >
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border-soft" />
        </div>

        <div className="max-h-[75dvh] overflow-y-auto px-5 pb-8 pt-3">
          <h2 className="mb-4 text-[17px] font-extrabold text-ink">{t('pickSheet.title')}</h2>

          {/* 저장된 만세력 */}
          {profiles.length > 0 && (
            <section className="mb-4">
              <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
                {t('pickSheet.savedTitle')}
              </p>
              <ul className="flex flex-col gap-2">
                {profiles.map((p) => (
                  <li key={p.id}>
                    <button
                      className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-4 text-left shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80 disabled:opacity-50"
                      disabled={creating}
                      onClick={() => handleProfile(p)}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-yellow text-xs font-extrabold">
                        {p.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-extrabold">{p.name}</span>
                          {p.is_representative && (
                            <span className="shrink-0 rounded-full border-[1.5px] border-ink bg-yellow px-2 py-0.5 text-[10px] font-extrabold">
                              대표
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-text-sub">
                          {p.birth_date}
                          {p.birth_time ? ` · ${p.birth_time}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 직접 입력하기 */}
          <button
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-yellow p-4 text-left shadow-[4px_4px_0_#1A1A1A] font-extrabold transition-opacity hover:opacity-80"
            onClick={() => { onClose(); router.push('/manse/new') }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface text-lg">
              +
            </span>
            <span className="text-[14px] font-extrabold">{t('pickSheet.directInput')}</span>
          </button>
        </div>
      </div>
    </>
  )
}
