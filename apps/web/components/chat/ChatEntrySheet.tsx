'use client'

/**
 * 채팅 진입 시트 — FortuneEntrySheet 패턴 재사용.
 * 저장된 만세력 선택 → 세션 생성 → /chat/[id]로 이동.
 * 직접 입력 → /manse/new로 이동 후 복귀 시 세션 생성 (B5 구현 예정, 여기서는 placeholder).
 */
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { ProfileResponse, ChatSessionCreate } from '@sajuguri/api-client'
import { createSession } from '@sajuguri/api-client'
import type { RecentBirthInput } from '@sajuguri/core'
import { loadRecentInputs } from '@sajuguri/core'
import { api } from '@/lib/api'
import { webStorage } from '@/lib/storage'
import MascotTinted from '@/components/ui/MascotTinted'

interface Props {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]
}

export default function ChatEntrySheet({ open, onClose, profiles }: Props) {
  const t = useTranslations('chat')
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [recentInputs, setRecentInputs] = useState<RecentBirthInput[]>([])

  useEffect(() => {
    if (open) {
      loadRecentInputs(webStorage).then(setRecentInputs)
    }
  }, [open])

  const startSession = useCallback(
    async (body: ChatSessionCreate) => {
      if (creating) return
      setCreating(true)
      try {
        const session = await createSession(api, body)
        onClose()
        router.push(`/chat/${session.id}`)
      } catch {
        setCreating(false)
      }
    },
    [creating, onClose, router],
  )

  if (!open) return null

  // 저장된 만세력과 중복되는 최근 입력은 숨김
  const savedKeys = new Set(
    profiles.map((p) => `${p.birth_date}|${p.birth_time ?? ''}|${p.gender}`),
  )
  const filteredRecent = recentInputs.filter(
    (r) => !savedKeys.has(`${r.birth_date}|${r.birth_time ?? ''}|${r.gender}`),
  )

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
                      onClick={() => startSession({ profile_id: p.id })}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface overflow-hidden">
                        <MascotTinted stem={p.day_stem} width={38} height={38} />
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

          {/* 최근 본 만세력 */}
          {filteredRecent.length > 0 && (
            <section className="mb-4">
              <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
                {t('pickSheet.recentTitle')}
              </p>
              <ul className="flex flex-col gap-2">
                {filteredRecent.map((r) => (
                  <li key={`${r.birth_date}|${r.birth_time ?? ''}|${r.gender}`}>
                    <button
                      className="flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-border-soft bg-surface p-4 text-left transition-all hover:border-ink hover:shadow-[2px_2px_0_#1A1A1A] disabled:opacity-50"
                      disabled={creating}
                      onClick={() =>
                        startSession({
                          birth_date: r.birth_date,
                          birth_time: r.birth_time ?? null,
                          gender: r.gender,
                          calendar: r.calendar ?? 'solar',
                          is_leap_month: r.is_leap_month ?? false,
                        })
                      }
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface overflow-hidden">
                        <MascotTinted stem={r.day_stem} width={38} height={38} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-extrabold">{r.name}</span>
                        <span className="block text-xs text-text-sub">
                          {r.birth_date}
                          {r.birth_time ? ` · ${r.birth_time}` : ''}
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
