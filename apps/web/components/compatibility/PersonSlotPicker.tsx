'use client'

/**
 * PersonSlotPicker — 궁합 두 사람 슬롯 선택기.
 * 슬롯 A (기본=대표 프로필 자동 프리필, 변경 가능)
 * 슬롯 B (빈 슬롯으로 시작)
 * 각 슬롯: 저장된 프로필 선택 | 최근 입력 선택 | 직접 입력(BirthInputForm 바텀시트)
 * 두 슬롯이 모두 채워지면 "궁합 보기" 버튼 활성화 → onComplete(a, b)
 */
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ProfileResponse } from '@sajuguri/api-client'
import type { RecentBirthInput } from '@sajuguri/core'
import { loadRecentInputs } from '@sajuguri/core'
import { webStorage } from '@/lib/storage'
import MascotTinted from '@/components/ui/MascotTinted'
import BirthInputForm from '@/components/manse/BirthInputForm'
import type { ManseBirthInput } from '@/components/manse/BirthInputForm'

// ── PersonPick 타입 ──────────────────────────────────────────────────────────

export interface PersonPick {
  name: string
  birth_date: string
  birth_time: string | null
  gender: 'male' | 'female'
  calendar: 'solar' | 'lunar'
  is_leap_month: boolean
  birth_longitude?: number
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  profiles: ProfileResponse[]
  onComplete: (a: PersonPick, b: PersonPick) => void
}

// ── 슬롯 픽시트 ──────────────────────────────────────────────────────────────

interface SlotPickSheetProps {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]
  title: string
  onSelect: (pick: PersonPick) => void
}

function SlotPickSheet({ open, onClose, profiles, title, onSelect }: SlotPickSheetProps) {
  const t = useTranslations('compatibility')
  const [recentInputs, setRecentInputs] = useState<RecentBirthInput[]>([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (open) {
      loadRecentInputs(webStorage).then(setRecentInputs)
      setShowForm(false)
    }
  }, [open])

  if (!open) return null

  // 저장 프로필과 중복되는 최근 입력 숨김 (birth_date|birth_time|gender 기준)
  const savedKeys = new Set(
    profiles.map((p) => `${p.birth_date}|${p.birth_time ?? ''}|${p.gender}`),
  )
  const filteredRecent = recentInputs.filter(
    (r) => !savedKeys.has(`${r.birth_date}|${r.birth_time ?? ''}|${r.gender}`),
  )

  function pickFromProfile(p: ProfileResponse) {
    onSelect({
      name: p.name,
      birth_date: p.birth_date,
      birth_time: p.birth_time,
      gender: p.gender as 'male' | 'female',
      calendar: p.calendar as 'solar' | 'lunar',
      is_leap_month: p.is_leap_month,
      ...(p.longitude != null ? { birth_longitude: p.longitude } : {}),
    })
    onClose()
  }

  function pickFromRecent(r: RecentBirthInput) {
    onSelect({
      name: r.name ?? t('unknownName'),
      birth_date: r.birth_date,
      birth_time: r.birth_time ?? null,
      gender: r.gender as 'male' | 'female',
      calendar: (r.calendar ?? 'solar') as 'solar' | 'lunar',
      is_leap_month: r.is_leap_month ?? false,
      ...(r.birth_longitude != null ? { birth_longitude: r.birth_longitude } : {}),
    })
    onClose()
  }

  function pickFromForm(input: ManseBirthInput) {
    onSelect({
      name: input.name,
      birth_date: input.birth_date,
      birth_time: input.birth_time,
      gender: input.gender,
      calendar: input.calendar,
      is_leap_month: input.is_leap_month,
      ...(input.birth_longitude != null ? { birth_longitude: input.birth_longitude } : {}),
    })
    onClose()
  }

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

        <div className="max-h-[80dvh] overflow-y-auto px-5 pb-8 pt-3">
          <h2 className="mb-4 text-[17px] font-extrabold text-ink">{title}</h2>

          {showForm ? (
            <>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="mb-4 text-[13px] font-bold text-text-sub hover:text-ink"
              >
                ← {t('pickSheet.backToList')}
              </button>
              <BirthInputForm
                onSubmit={pickFromForm}
                submitLabel={t('pickSheet.confirmInput')}
                nameOptional={false}
              />
            </>
          ) : (
            <>
              {/* 저장된 프로필 */}
              {profiles.length > 0 && (
                <section className="mb-4">
                  <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
                    {t('pickSheet.savedTitle')}
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
                                <span className="shrink-0 rounded-full border-[1.5px] border-ink bg-yellow px-2 py-0.5 text-[10px] font-extrabold">
                                  {t('pickSheet.repBadge')}
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

              {/* 최근 입력 */}
              {filteredRecent.length > 0 && (
                <section className="mb-4">
                  <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
                    {t('pickSheet.recentTitle')}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {filteredRecent.map((r) => (
                      <li key={`${r.birth_date}|${r.birth_time ?? ''}|${r.gender}`}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-border-soft bg-surface p-4 text-left transition-all hover:border-ink hover:shadow-[2px_2px_0_#1A1A1A]"
                          onClick={() => pickFromRecent(r)}
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface">
                            <MascotTinted stem={r.day_stem} width={38} height={38} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-extrabold">
                              {r.name ?? t('unknownName')}
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

              {/* 직접 입력하기 */}
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-yellow p-4 text-left shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80"
                onClick={() => setShowForm(true)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface text-lg">
                  +
                </span>
                <span className="text-[14px] font-extrabold">{t('pickSheet.directInput')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── 슬롯 카드 ─────────────────────────────────────────────────────────────────

interface SlotCardProps {
  label: string
  pick: PersonPick | null
  onOpen: () => void
  t: ReturnType<typeof useTranslations>
}

function SlotCard({ label, pick, onOpen, t }: SlotCardProps) {
  if (pick) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#1A1A1A]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-yellow text-lg font-black">
          {label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold">{pick.name}</span>
          <span className="block text-xs text-text-sub">
            {pick.birth_date}
            {pick.birth_time ? ` · ${pick.birth_time}` : ''}
          </span>
        </span>
        <button
          type="button"
          className="shrink-0 rounded-lg border-[1.5px] border-border-soft px-3 py-1.5 text-[12px] font-extrabold text-text-sub transition-colors hover:border-ink hover:text-ink"
          onClick={onOpen}
        >
          {t('slot.reselect')}
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-4 text-left shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80"
      onClick={onOpen}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-yellow text-lg font-black">
        {label}
      </span>
      <span className="text-[14px] font-extrabold text-text-sub">
        {t('slot.selectOrInput')}
      </span>
    </button>
  )
}

// ── PersonSlotPicker ──────────────────────────────────────────────────────────

export default function PersonSlotPicker({ profiles, onComplete }: Props) {
  const t = useTranslations('compatibility')

  const [slotA, setSlotA] = useState<PersonPick | null>(null)
  const [slotB, setSlotB] = useState<PersonPick | null>(null)
  const [openSheet, setOpenSheet] = useState<'a' | 'b' | null>(null)

  // 슬롯 A: 대표 프로필 자동 프리필
  useEffect(() => {
    const rep = profiles.find((p) => p.is_representative)
    if (rep && slotA === null) {
      setSlotA({
        name: rep.name,
        birth_date: rep.birth_date,
        birth_time: rep.birth_time,
        gender: rep.gender as 'male' | 'female',
        calendar: rep.calendar as 'solar' | 'lunar',
        is_leap_month: rep.is_leap_month,
        ...(rep.longitude != null ? { birth_longitude: rep.longitude } : {}),
      })
    }
  }, [profiles]) // eslint-disable-line react-hooks/exhaustive-deps

  const bothFilled = slotA !== null && slotB !== null

  function handleComplete() {
    if (!slotA || !slotB) return
    onComplete(slotA, slotB)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 슬롯 레이블 */}
      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
          {t('slot.labelA')}
        </p>
        <SlotCard label="A" pick={slotA} onOpen={() => setOpenSheet('a')} t={t} />
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-soft" />
        <span className="text-[13px] font-extrabold text-text-sub">♥</span>
        <div className="h-px flex-1 bg-border-soft" />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
          {t('slot.labelB')}
        </p>
        <SlotCard label="B" pick={slotB} onOpen={() => setOpenSheet('b')} t={t} />
      </div>

      {/* 궁합 보기 버튼 */}
      <button
        type="button"
        disabled={!bothFilled}
        onClick={handleComplete}
        className="mt-2 w-full rounded-xl border-2 border-ink bg-orange py-3.5 text-[15px] font-extrabold text-white shadow-[4px_4px_0_#1A1A1A] transition-opacity disabled:opacity-40 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1A1A1A]"
      >
        {t('viewCompatibility')}
      </button>

      {/* 슬롯 A 픽시트 */}
      <SlotPickSheet
        open={openSheet === 'a'}
        onClose={() => setOpenSheet(null)}
        profiles={profiles}
        title={t('pickSheet.titleA')}
        onSelect={(pick) => {
          setSlotA(pick)
          setOpenSheet(null)
        }}
      />

      {/* 슬롯 B 픽시트 */}
      <SlotPickSheet
        open={openSheet === 'b'}
        onClose={() => setOpenSheet(null)}
        profiles={profiles}
        title={t('pickSheet.titleB')}
        onSelect={(pick) => {
          setSlotB(pick)
          setOpenSheet(null)
        }}
      />
    </div>
  )
}
