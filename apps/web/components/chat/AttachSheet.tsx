'use client'

/**
 * 첨부 바텀시트 (B5) — + 버튼 클릭 시 표시.
 * - 내 만세력 교체 (ChatEntrySheet 재사용 방향)
 * - 상대 만세력 첨부 (저장 목록 + 직접 입력 → /manse/new)
 */
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import type { ProfileResponse } from '@sajuguri/api-client'

interface Props {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]
  onAttachPartner: (p: ProfileResponse) => void
  sessionId: string
}

export default function AttachSheet({ open, onClose, profiles, onAttachPartner, sessionId: _sessionId }: Props) {
  const t = useTranslations('chat')
  const router = useRouter()

  if (!open) return null

  return (
    <>
      {/* 백드롭 */}
      <div className="fixed inset-0 z-40 bg-ink/40" onClick={onClose} aria-hidden="true" />

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

        <div className="px-5 pb-8 pt-3">
          <h2 className="mb-4 text-[17px] font-extrabold text-ink">{t('attach.title')}</h2>

          {/* 상대 만세력 첨부 */}
          <section className="mb-4">
            <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
              {t('attach.attachPartner')}
            </p>
            {profiles.length > 0 ? (
              <ul className="flex flex-col gap-2 max-h-[40dvh] overflow-y-auto">
                {profiles.map((p) => (
                  <li key={p.id}>
                    <button
                      className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-3 text-left shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80"
                      onClick={() => onAttachPartner(p)}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-yellow-tint text-xs font-extrabold">
                        {p.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-extrabold">{p.name}</span>
                        <span className="block text-xs text-text-sub">
                          {p.birth_date}{p.birth_time ? ` · ${p.birth_time}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* 직접 입력 */}
            <button
              className="mt-2 flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-yellow p-3 text-left shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80"
              onClick={() => { onClose(); router.push('/manse/new') }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface text-lg">
                +
              </span>
              <span className="text-[13px] font-extrabold">{t('pickSheet.directInput')}</span>
            </button>
          </section>
        </div>
      </div>
    </>
  )
}
