'use client'

/**
 * MansePickerSheet — 만세력 선택 공용 바텀시트.
 *
 * 4곳에서 중복 구현되던 "저장된 만세력 + 최근 본 만세력 + 만세력 추가하기(직접입력)"
 * 픽커를 하나로 통합한다. 호출부는 onPick(MansePick) 하나만 처리하면 된다.
 *
 * 섹션:
 *   1) 저장된 만세력 — 마스코트 아바타 + 이름 + 대표 배지(주황) + 생일
 *   2) 최근 본 만세력 (includeRecent 기본 true) — loadRecentInputs, 저장본과 중복 숨김
 *   3) 만세력 추가하기 — 중첩 BirthInputForm 폼 → 폼 값으로 onPick
 */
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ProfileResponse, SajuCalcRequest } from '@sajuguri/api-client'
import { calcSaju } from '@sajuguri/api-client'
import type { RecentBirthInput } from '@sajuguri/core'
import { loadRecentInputs, saveRecentInput } from '@sajuguri/core'
import { webStorage } from '@/lib/storage'
import { api } from '@/lib/api'
import { useSheetTransition } from '@/lib/hooks/useSheetTransition'
import MascotTinted from '@/components/ui/MascotTinted'
import BirthInputForm, { type ManseBirthInput } from '@/components/manse/BirthInputForm'

/** 통합 픽 결과 — 저장 프로필이면 profile_id가 채워진다. */
export interface MansePick {
  profile_id?: number
  name: string
  birth_date: string
  birth_time: string | null
  gender: 'male' | 'female'
  calendar: 'solar' | 'lunar'
  is_leap_month: boolean
  birth_longitude?: number
  day_stem?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]
  title: string
  onPick: (pick: MansePick) => void
  includeRecent?: boolean
}

export default function MansePickerSheet({
  open,
  onClose,
  profiles,
  title,
  onPick,
  includeRecent = true,
}: Props) {
  const t = useTranslations('mansePicker')
  const [recentInputs, setRecentInputs] = useState<RecentBirthInput[]>([])
  const [showForm, setShowForm] = useState(false)
  const { mounted, visible, onTransitionEnd } = useSheetTransition(open)

  useEffect(() => {
    if (open) {
      setShowForm(false)
      if (includeRecent) {
        loadRecentInputs(webStorage).then(setRecentInputs)
      }
    }
  }, [open, includeRecent])

  if (!mounted) return null

  // 저장 프로필과 중복되는 최근 입력 숨김 (birth_date|birth_time|gender 기준)
  const savedKeys = new Set(
    profiles.map((p) => `${p.birth_date}|${p.birth_time ?? ''}|${p.gender}`),
  )
  const filteredRecent = includeRecent
    ? recentInputs.filter(
        (r) => !savedKeys.has(`${r.birth_date}|${r.birth_time ?? ''}|${r.gender}`),
      )
    : []

  function pickFromProfile(p: ProfileResponse) {
    onPick({
      profile_id: p.id,
      name: p.name,
      birth_date: p.birth_date,
      birth_time: p.birth_time,
      gender: p.gender as 'male' | 'female',
      calendar: p.calendar as 'solar' | 'lunar',
      is_leap_month: p.is_leap_month,
      day_stem: p.day_stem,
      ...(p.longitude != null ? { birth_longitude: p.longitude } : {}),
    })
    onClose()
  }

  function pickFromRecent(r: RecentBirthInput) {
    onPick({
      name: r.name ?? '',
      birth_date: r.birth_date,
      birth_time: r.birth_time ?? null,
      gender: r.gender as 'male' | 'female',
      calendar: (r.calendar ?? 'solar') as 'solar' | 'lunar',
      is_leap_month: r.is_leap_month ?? false,
      day_stem: r.day_stem,
      ...(r.birth_longitude != null ? { birth_longitude: r.birth_longitude } : {}),
    })
    onClose()
  }

  async function pickFromForm(input: ManseBirthInput) {
    // 일간(day_stem) 계산 — 마스코트 틴팅에 사용.
    let dayStem: string | null = null
    try {
      const saju = await calcSaju(api, input as unknown as SajuCalcRequest)
      dayStem = saju.day_pillar?.stem ?? null
    } catch {
      // 계산 실패 시 day_stem 없이 진행
    }
    // 모달에서 직접 입력한 만세력도 "최근 본 만세력"에 저장한다.
    try {
      await saveRecentInput(webStorage, { ...input, day_stem: dayStem })
    } catch {
      // 저장 실패해도 픽 진행은 막지 않는다.
    }
    onPick({
      name: input.name,
      birth_date: input.birth_date,
      birth_time: input.birth_time,
      gender: input.gender,
      calendar: input.calendar,
      is_leap_month: input.is_leap_month,
      day_stem: dayStem,
      ...(input.birth_longitude != null ? { birth_longitude: input.birth_longitude } : {}),
    })
    onClose()
  }

  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 z-40 bg-ink/40"
        style={{
          opacity: visible ? 1 : 0,
          transitionProperty: 'opacity',
          transitionDuration: 'var(--motion-duration-fade)',
          transitionTimingFunction: 'var(--motion-ease-out)',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 시트 */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[640px] rounded-t-[22px] border-2 border-ink bg-surface shadow-[0_-4px_0_#1A1A1A]"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          opacity: visible ? 1 : 0,
          transitionProperty: 'transform, opacity',
          transitionDuration: 'var(--motion-duration-sheet), var(--motion-duration-fade)',
          transitionTimingFunction: 'var(--motion-ease-drawer), var(--motion-ease-out)',
          willChange: 'transform, opacity',
        }}
        onTransitionEnd={onTransitionEnd}
        role="dialog"
        aria-modal="true"
      >
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border-soft" />
        </div>

        <div className="max-h-[80dvh] overflow-y-auto px-5 pb-8 pt-3">
          <h2 className="mb-4 text-[17px] font-extrabold text-ink">{title}</h2>

          {showForm ? (
            <>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="mb-4 text-[13px] font-bold text-text-sub hover:text-ink"
              >
                ← {t('backToList')}
              </button>
              <BirthInputForm
                onSubmit={pickFromForm}
                submitLabel={t('confirmInput')}
                nameOptional={false}
              />
            </>
          ) : (
            <>
              {/* 저장된 만세력 */}
              {profiles.length > 0 && (
                <section className="mb-4">
                  <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
                    {t('savedTitle')}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {profiles.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-4 text-left shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80"
                          onClick={() => pickFromProfile(p)}
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface">
                            <MascotTinted stem={p.day_stem} width={38} height={38} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[14px] font-extrabold">{p.name}</span>
                              {p.is_representative && (
                                <span className="shrink-0 rounded-full border-[1.5px] border-ink bg-orange px-2 py-0.5 text-[10px] font-extrabold text-white">
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

              {/* 최근 본 만세력 */}
              {filteredRecent.length > 0 && (
                <section className="mb-4">
                  <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
                    {t('recentTitle')}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {filteredRecent.map((r) => (
                      <li key={`${r.birth_date}|${r.birth_time ?? ''}|${r.gender}`}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-4 text-left shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80"
                          onClick={() => pickFromRecent(r)}
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface">
                            <MascotTinted stem={r.day_stem} width={38} height={38} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-extrabold">
                              {r.name || t('unknownName')}
                            </span>
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

              {/* 만세력 추가하기 */}
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-yellow p-4 text-left shadow-[4px_4px_0_#1A1A1A] font-extrabold transition-opacity hover:opacity-80"
                onClick={() => setShowForm(true)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface text-lg">
                  +
                </span>
                <span className="text-[14px] font-extrabold">{t('directInput')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
