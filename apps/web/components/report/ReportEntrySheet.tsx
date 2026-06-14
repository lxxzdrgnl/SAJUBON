'use client'

/**
 * 리포트 진입 시트 — FortuneEntrySheet 패턴 재사용.
 * 저장된 만세력 선택 → /report/new?<birth 쿼리>로 이동.
 * 직접 입력 → /manse/new로 이동.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { ProfileResponse } from '@sajuguri/api-client'
import type { RecentBirthInput } from '@sajuguri/core'
import { loadRecentInputs } from '@sajuguri/core'
import { webStorage } from '@/lib/storage'
import { manseNavQuery, profileToManseSource } from '@/lib/manse/query'
import MascotTinted from '@/components/ui/MascotTinted'

interface Props {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]
  isLoggedIn: boolean
}

export default function ReportEntrySheet({ open, onClose, profiles, isLoggedIn }: Props) {
  const t = useTranslations('report.entrySheet')
  const router = useRouter()
  const [recentInputs, setRecentInputs] = useState<RecentBirthInput[]>([])

  useEffect(() => {
    if (open) {
      loadRecentInputs(webStorage).then(setRecentInputs)
    }
  }, [open])

  function goReport(query: string) {
    onClose()
    router.push(`/report/new?${query}`)
  }

  if (!open) return null

  // 저장 만세력과 중복되는 최근 입력 제거
  const savedKeys = new Set(
    profiles.map((p) => `${p.birth_date}|${p.birth_time ?? ''}|${p.gender}|${p.calendar}`)
  )
  const filteredRecent = recentInputs.filter(
    (r) => !savedKeys.has(`${r.birth_date}|${r.birth_time ?? ''}|${r.gender}|${r.calendar ?? 'solar'}`)
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
          <h2 className="mb-4 text-[17px] font-extrabold text-ink">{t('title')}</h2>

          {/* 저장된 만세력 (로그인 시) */}
          {isLoggedIn && profiles.length > 0 && (
            <section className="mb-4">
              <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
                {t('savedTitle')}
              </p>
              <ul className="flex flex-col gap-2">
                {profiles.map((p) => (
                  <li key={p.id}>
                    <button
                      className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-4 text-left shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80"
                      onClick={() => goReport(manseNavQuery(profileToManseSource(p)))}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface overflow-hidden">
                        <MascotTinted stem={p.day_stem} width={38} height={38} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-extrabold">{p.name}</span>
                          {p.is_representative && (
                            <span className="shrink-0 rounded-full border-[1.5px] border-ink bg-yellow px-2 py-0.5 text-[10px] font-extrabold">
                              {t('repBadge')}
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

          {/* 최근 입력 (저장 만세력과 중복되지 않는 항목만) */}
          {filteredRecent.length > 0 && (
            <section className="mb-4">
              <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
                {t('recentTitle')}
              </p>
              <ul className="flex flex-col gap-2">
                {filteredRecent.map((r) => {
                  const q = manseNavQuery(r)
                  return (
                    <li key={q}>
                      <button
                        className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-4 text-left hover:shadow-[2px_2px_0_#1A1A1A] transition-all"
                        onClick={() => goReport(q)}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface overflow-hidden">
                          <MascotTinted stem={r.day_stem} width={38} height={38} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="truncate text-[14px] font-extrabold">{r.name}</span>
                          <span className="block text-xs text-text-sub">
                            {r.birth_date}
                            {r.birth_time ? ` · ${r.birth_time}` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
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
            <span className="text-[14px] font-extrabold">{t('directInput')}</span>
          </button>
        </div>
      </div>
    </>
  )
}
