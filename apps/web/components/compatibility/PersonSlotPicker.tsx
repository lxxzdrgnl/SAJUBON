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
import MansePickerSheet, { type MansePick } from '@/components/manse/MansePickerSheet'

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

// ── MansePick → PersonPick ─────────────────────────────────────────────────────

function toPersonPick(pick: MansePick, fallbackName: string): PersonPick {
  return {
    name: pick.name || fallbackName,
    birth_date: pick.birth_date,
    birth_time: pick.birth_time,
    gender: pick.gender,
    calendar: pick.calendar,
    is_leap_month: pick.is_leap_month,
    ...(pick.birth_longitude != null ? { birth_longitude: pick.birth_longitude } : {}),
  }
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
      <MansePickerSheet
        open={openSheet === 'a'}
        onClose={() => setOpenSheet(null)}
        profiles={profiles}
        title={t('pickSheet.titleA')}
        onPick={(pick) => {
          setSlotA(toPersonPick(pick, t('unknownName')))
          setOpenSheet(null)
        }}
      />

      {/* 슬롯 B 픽시트 */}
      <MansePickerSheet
        open={openSheet === 'b'}
        onClose={() => setOpenSheet(null)}
        profiles={profiles}
        title={t('pickSheet.titleB')}
        onPick={(pick) => {
          setSlotB(toPersonPick(pick, t('unknownName')))
          setOpenSheet(null)
        }}
      />
    </div>
  )
}
