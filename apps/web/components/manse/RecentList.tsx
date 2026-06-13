'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { loadRecentInputs, removeRecentInput, type RecentBirthInput } from '@sajuguri/core'
import { webStorage } from '@/lib/storage'
import { createProfile } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import BrutalCard from '@/components/ui/BrutalCard'
import MascotTinted from '@/components/ui/MascotTinted'
import { toResultQuery } from '@/lib/manse/query'

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

function SaveIcon({ className }: { className?: string }) {
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

/** 입력값 중복 판정 키 — removeRecentInput과 동일한 기준 */
function itemKey(i: RecentBirthInput) {
  return `${i.birth_date}|${i.birth_time}|${i.gender}|${i.calendar}`
}

interface ItemState {
  saveState: 'idle' | 'busy' | 'done' | 'error'
  confirmDelete: boolean
}

export default function RecentList({
  isLoggedIn = false,
  savedKeys = [],
}: {
  isLoggedIn?: boolean
  /** 저장된 만세력 키 목록(`birth_date|birth_time|gender`) — 중복 항목은 최근에서 숨김 */
  savedKeys?: string[]
}) {
  const t = useTranslations('manse.index')
  const tf = useTranslations('manse.form')
  const router = useRouter()
  const [items, setItems] = useState<RecentBirthInput[] | null>(null)
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({})

  useEffect(() => {
    loadRecentInputs(webStorage).then(setItems)
  }, [])

  if (items === null) return null

  // 저장된 만세력과 중복되는 최근 항목은 숨긴다 (저장 후 router.refresh() 시 사라짐)
  const savedSet = new Set(savedKeys)
  const visibleItems = items.filter(
    (i) => !savedSet.has(`${i.birth_date}|${i.birth_time ?? ''}|${i.gender}`),
  )

  // 보일 최근 항목이 없으면(전부 저장됐거나 기록 없음) 섹션을 숨긴다.
  // 저장된 만세력이 있는데 "아직 본 만세력이 없어요"는 부적절하므로 메시지 대신 null.
  if (visibleItems.length === 0) return null

  function getItemState(key: string): ItemState {
    return itemStates[key] ?? { saveState: 'idle', confirmDelete: false }
  }

  function patchItemState(key: string, patch: Partial<ItemState>) {
    setItemStates((prev) => ({
      ...prev,
      [key]: { ...getItemState(key), ...patch },
    }))
  }

  async function handleDelete(e: React.MouseEvent, item: RecentBirthInput) {
    e.preventDefault()
    const key = itemKey(item)
    // 낙관적 제거
    setItems((prev) => prev?.filter((i) => itemKey(i) !== key) ?? null)
    patchItemState(key, { confirmDelete: false })
    await removeRecentInput(webStorage, item)
  }

  async function handleSave(e: React.MouseEvent, item: RecentBirthInput) {
    e.preventDefault()
    const key = itemKey(item)
    const state = getItemState(key)
    if (state.saveState === 'busy' || state.saveState === 'done') return
    patchItemState(key, { saveState: 'busy' })
    try {
      await createProfile(api, {
        name: item.name,
        birth_date: item.birth_date,
        birth_time: item.birth_time,
        calendar: item.calendar,
        gender: item.gender,
        is_leap_month: item.is_leap_month,
        city: item.city,
        longitude: item.birth_longitude,
      })
      patchItemState(key, { saveState: 'done' })
      // 저장 즉시 '저장된 만세력' 목록에 반영
      router.refresh()
    } catch {
      patchItemState(key, { saveState: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[15px] font-extrabold">{t('recent')}</h2>
      {visibleItems.map((i) => {
        const key = itemKey(i)
        const state = getItemState(key)
        const saveLabel =
          state.saveState === 'done'
            ? t('recentSaved')
            : state.saveState === 'error'
              ? t('recentSaveError')
              : t('recentSave')

        return (
          <div key={key} className="relative">
            <Link href={`/manse/result?${toResultQuery(i)}`}>
              <BrutalCard className="flex items-center gap-3 pr-24">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface overflow-hidden">
                  <MascotTinted stem={i.day_stem} width={40} height={40} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-extrabold">{i.name}</span>
                  <span className="block text-xs text-text-sub">
                    {i.birth_date} · {i.birth_time ?? tf('timeUnknown')} · {i.gender === 'male' ? tf('male') : tf('female')}
                  </span>
                </span>
              </BrutalCard>
            </Link>

            {/* 액션 버튼 — 카드 우측 */}
            {state.confirmDelete ? (
              // 삭제 확인 — 카드 전체를 덮는 오버레이 (이름·생일과 겹치지 않게)
              <div
                className="absolute inset-0 flex items-center justify-between gap-2 rounded-2xl border-2 border-ink bg-surface px-4"
                onClick={(e) => e.preventDefault()}
              >
                <span className="min-w-0 truncate text-[13px] font-extrabold text-ink">
                  {t('recentDeleteConfirm')}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, i)}
                    className="rounded-lg border-2 border-ink bg-orange px-3 py-1 text-[12px] font-extrabold text-white shadow-[2px_2px_0_#1A1A1A]"
                  >
                    {t('recentDeleteConfirmYes')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); patchItemState(key, { confirmDelete: false }) }}
                    className="rounded-lg border-2 border-ink bg-surface px-3 py-1 text-[12px] font-extrabold text-ink shadow-[2px_2px_0_#1A1A1A]"
                  >
                    {t('recentDeleteConfirmCancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5"
                onClick={(e) => e.preventDefault()}
              >
                {isLoggedIn ? (
                  <button
                    type="button"
                    disabled={state.saveState === 'busy' || state.saveState === 'done'}
                    onClick={(e) => handleSave(e, i)}
                    className="flex items-center gap-1 rounded-lg border-2 border-ink bg-yellow px-2 py-1 text-[11px] font-extrabold text-ink shadow-[2px_2px_0_#1A1A1A] disabled:opacity-50"
                  >
                    <SaveIcon className="h-3 w-3 shrink-0" />
                    <span>{saveLabel}</span>
                  </button>
                ) : (
                  <span
                    className="rounded-lg border-2 border-ink px-2 py-1 text-[11px] font-bold text-text-sub"
                    title={t('recentSaveLoginHint')}
                  >
                    {t('recentSave')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); patchItemState(key, { confirmDelete: true }) }}
                  title={t('recentDelete')}
                  className="flex items-center justify-center rounded-lg border-2 border-ink bg-surface p-1.5 shadow-[2px_2px_0_#1A1A1A]"
                >
                  <TrashIcon className="h-4 w-4 text-ink" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
