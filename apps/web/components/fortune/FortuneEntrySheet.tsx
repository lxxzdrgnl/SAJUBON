'use client'

/**
 * 운세 진입 시트 — 만세력 선택 바텀시트.
 * 디자인 §5.6: "누구의 운세를 볼까?" + 저장 만세력 + 게스트 최근 입력 + 직접 입력하기.
 * 힌트 문구 없음, 이모지 없음 (G2, 사용자 확정).
 */
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { ProfileResponse, SajuCalcRequest } from '@sajuguri/api-client'
import { calcSaju } from '@sajuguri/api-client'
import type { RecentBirthInput } from '@sajuguri/core'
import { loadRecentInputs, saveRecentInput } from '@sajuguri/core'
import { webStorage } from '@/lib/storage'
import { api } from '@/lib/api'
import { buildBirthKey } from '@/lib/fortune/cache'
import { manseNavQuery, profileToManseSource } from '@/lib/manse/query'
import { useSheetTransition } from '@/lib/hooks/useSheetTransition'
import MascotTinted from '@/components/ui/MascotTinted'
import BirthInputForm, { type ManseBirthInput } from '@/components/manse/BirthInputForm'

/** 오늘 이미 본 birthKey 셋 — localStorage에서 로드.
 *  날짜 키는 저장부(FortuneStoryPage)와 동일하게 로컬 날짜 기준이어야 한다.
 *  (UTC toISOString을 쓰면 KST 자정~오전9시에 저장(로컬)과 키가 어긋나 뱃지가 안 맞는다.) */
function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadSeenTodayKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const raw = window.localStorage.getItem(`sajuguri.fortune.seen.${todayLocal()}`)
  if (!raw) return new Set()
  try { return new Set(JSON.parse(raw) as string[]) } catch { return new Set() }
}

function profileToBirthKey(p: ProfileResponse): string {
  return buildBirthKey({
    birth_date: p.birth_date,
    birth_time: p.birth_time,
    gender: p.gender,
    calendar: p.calendar as 'solar' | 'lunar',
    is_leap_month: p.is_leap_month,
  })
}

function recentToBirthKey(r: RecentBirthInput): string {
  return buildBirthKey(r)
}

interface Props {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]   // SSR에서 주입 (로그인 시), 비로그인 시 []
  isLoggedIn: boolean
}

export default function FortuneEntrySheet({ open, onClose, profiles, isLoggedIn }: Props) {
  const t = useTranslations('fortune.sheet')
  const tf = useTranslations('manse.form')
  const tp = useTranslations('mansePicker')
  const router = useRouter()
  const [recentInputs, setRecentInputs] = useState<RecentBirthInput[]>([])
  const [seenKeys, setSeenKeys] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const { mounted, visible, onTransitionEnd } = useSheetTransition(open)

  useEffect(() => {
    if (!open) return
    setShowForm(false)
    loadRecentInputs(webStorage).then(setRecentInputs)
    setSeenKeys(loadSeenTodayKeys())
  }, [open])

  const goFortune = useCallback(
    (query: string) => {
      onClose()
      router.push(`/fortune?${query}`)
    },
    [router, onClose],
  )

  async function pickFromForm(input: ManseBirthInput) {
    // 일간(day_stem) 계산 — 마스코트 틴팅에 사용.
    let dayStem: string | null = null
    try {
      const saju = await calcSaju(api, input as unknown as SajuCalcRequest)
      dayStem = saju.day_pillar?.stem ?? null
    } catch {
      // 계산 실패 시 day_stem 없이 진행
    }
    // 모달 내 직접 입력분도 최근 본 만세력에 저장
    try {
      await saveRecentInput(webStorage, { ...input, day_stem: dayStem })
    } catch {
      // 저장 실패해도 진행
    }
    goFortune(manseNavQuery(input))
  }

  if (!mounted) return null

  // 저장 만세력과 중복되는 최근 입력 제거
  const savedKeys = new Set(profiles.map(profileToBirthKey))
  const filteredRecent = recentInputs.filter((r) => !savedKeys.has(recentToBirthKey(r)))

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
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[640px] rounded-t-[22px] border-2 border-ink bg-surface shadow-brutal-up"
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

        <div className="max-h-[75dvh] overflow-y-auto px-5 pb-8 pt-3">
          <h2 className="mb-4 text-[17px] font-extrabold text-ink">{t('pickSheet')}</h2>

          {showForm ? (
            <>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="mb-4 text-[13px] font-bold text-text-sub hover:text-ink"
              >
                ← {tp('backToList')}
              </button>
              <BirthInputForm onSubmit={pickFromForm} submitLabel={tp('confirmInput')} nameOptional={false} />
            </>
          ) : (
          <>
          {/* 저장된 만세력 (로그인 시) */}
          {isLoggedIn && profiles.length > 0 && (
            <section className="mb-4">
              <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
                {t('savedTitle')}
              </p>
              <ul className="flex flex-col gap-2">
                {profiles.map((p) => {
                  const key = profileToBirthKey(p)
                  const seen = seenKeys.has(key)
                  return (
                    <li key={p.id}>
                      <button
                        className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-4 text-left shadow-brutal transition-opacity hover:opacity-80"
                        onClick={() => goFortune(manseNavQuery(profileToManseSource(p)))}
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
                            {seen && (
                              <span className="shrink-0 rounded-full border-[1.5px] border-teal px-2 py-0.5 text-[10px] font-extrabold text-teal">
                                {t('seenToday')}
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
                  )
                })}
              </ul>
            </section>
          )}

          {/* 최근 입력 (저장 만세력과 중복되지 않는 항목만 표시) */}
          {filteredRecent.length > 0 && (
            <section className="mb-4">
              <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
                {t('recentTitle')}
              </p>
              <ul className="flex flex-col gap-2">
                {filteredRecent.map((r) => {
                  const key = recentToBirthKey(r)
                  const seen = seenKeys.has(key)
                  const q = manseNavQuery(r)
                  return (
                    <li key={q}>
                      <button
                        className="flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-border-soft bg-surface p-4 text-left hover:border-ink hover:shadow-brutal-sm transition-all"
                        onClick={() => goFortune(q)}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface overflow-hidden">
                          <MascotTinted stem={r.day_stem} width={38} height={38} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[14px] font-extrabold">{r.name}</span>
                            {seen && (
                              <span className="shrink-0 rounded-full border-[1.5px] border-teal px-2 py-0.5 text-[10px] font-extrabold text-teal">
                                {t('seenToday')}
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-text-sub">
                            {r.birth_date}
                            {r.birth_time ? ` · ${r.birth_time}` : ` · ${tf('timeUnknown')}`}
                            {' · '}{r.gender === 'male' ? tf('male') : tf('female')}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* 직접 입력하기 — 모달 내 폼 */}
          <button
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-yellow p-4 text-left shadow-brutal font-extrabold transition-opacity hover:opacity-80"
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
