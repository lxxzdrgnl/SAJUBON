'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ApiClient, setRepresentative, deleteProfile } from '@sajuguri/api-client'
import type { ProfileResponse } from '@sajuguri/api-client'
import { Link } from '@/i18n/navigation'
import BrutalCard from '@/components/ui/BrutalCard'
import { manseNavQuery, profileToManseSource } from '@/lib/manse/query'
import MascotTinted from '@/components/ui/MascotTinted'

const api = new ApiClient('')

// 스타로크 SVG 아이콘 — 이모지 없이 인라인 사용
function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

export default function SavedListClient({
  profiles: initialProfiles,
}: {
  profiles: ProfileResponse[]
}) {
  const t = useTranslations('manse.saved')
  const tf = useTranslations('manse.form')
  const router = useRouter()
  const [profiles, setProfiles] = useState(initialProfiles)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<number | null>(null)

  // router.refresh() 후 서버가 내려준 새 목록(대표 변경·신규 저장)을 반영
  useEffect(() => {
    setProfiles(initialProfiles)
  }, [initialProfiles])

  if (profiles.length === 0)
    return <p className="py-6 text-center text-sm text-text-sub">{t('empty')}</p>

  async function handleSetRepresentative(e: React.MouseEvent, id: number) {
    e.preventDefault()
    if (loadingId !== null) return
    setLoadingId(id)
    try {
      await setRepresentative(api, id)
      // 낙관적 업데이트 — 대표 뱃지 즉시 이동
      setProfiles((prev) => prev.map((p) => ({ ...p, is_representative: p.id === id })))
      startTransition(() => { router.refresh() })
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDeleteConfirm(e: React.MouseEvent, id: number) {
    e.preventDefault()
    if (loadingId !== null) return
    setLoadingId(id)
    try {
      await deleteProfile(api, id)
      // 낙관적 업데이트 — 상태에서 즉시 제거
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      startTransition(() => { router.refresh() })
    } finally {
      setLoadingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {profiles.map((p) => (
        <div key={p.id} className="relative">
          <Link href={`/manse/result?${manseNavQuery(profileToManseSource(p))}`}>
            <BrutalCard className="flex items-center gap-3 pr-24">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface overflow-hidden">
                <MascotTinted stem={p.day_stem} width={40} height={40} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-extrabold">{p.name}</span>
                  {p.is_representative && (
                    <span className="shrink-0 rounded-full border-[1.5px] border-ink bg-orange px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {t('representative')}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-text-sub">
                  {p.birth_date} · {p.birth_time ?? tf('timeUnknown')} ·{' '}
                  {p.gender === 'male' ? tf('male') : tf('female')}
                </span>
              </span>
            </BrutalCard>
          </Link>

          {/* 액션 버튼 — 카드 우측 */}
          {confirmDeleteId === p.id ? (
            // 삭제 확인 — 카드 전체를 덮는 오버레이 (이름·생일과 겹치지 않게)
            <div
              className="absolute inset-0 flex items-center justify-between gap-2 rounded-2xl border-2 border-ink bg-surface px-4"
              onClick={(e) => e.preventDefault()}
            >
              <span className="min-w-0 truncate text-[13px] font-extrabold text-ink">
                {t('deleteConfirm')}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  disabled={loadingId === p.id || isPending}
                  onClick={(e) => handleDeleteConfirm(e, p.id)}
                  className="rounded-lg border-2 border-ink bg-orange px-3 py-1 text-[12px] font-extrabold text-white shadow-brutal-sm disabled:opacity-50"
                >
                  {t('deleteConfirmYes')}
                </button>
                <button
                  type="button"
                  disabled={loadingId === p.id}
                  onClick={(e) => { e.preventDefault(); setConfirmDeleteId(null) }}
                  className="rounded-lg border-2 border-ink bg-surface px-3 py-1 text-[12px] font-extrabold text-ink shadow-brutal-sm disabled:opacity-50"
                >
                  {t('deleteConfirmCancel')}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5"
              onClick={(e) => e.preventDefault()}
            >
              {!p.is_representative && (
                <button
                  type="button"
                  disabled={loadingId !== null || isPending}
                  onClick={(e) => handleSetRepresentative(e, p.id)}
                  title={t('setRepresentative')}
                  className="flex items-center gap-1 rounded-lg border-2 border-ink bg-yellow px-2 py-1 text-[11px] font-extrabold text-ink shadow-brutal-sm disabled:opacity-50"
                >
                  <StarIcon className="h-3 w-3 shrink-0" />
                  <span>{t('setRepresentative')}</span>
                </button>
              )}
              <button
                type="button"
                disabled={loadingId !== null || isPending}
                onClick={(e) => { e.preventDefault(); setConfirmDeleteId(p.id) }}
                title={t('delete')}
                className="flex items-center justify-center rounded-lg border-2 border-ink bg-surface p-1.5 shadow-brutal-sm disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4 text-ink" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
