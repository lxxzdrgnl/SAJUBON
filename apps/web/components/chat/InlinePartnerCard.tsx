'use client'

/**
 * 인라인 상대 만세력 선택/입력 카드 (B5).
 * `request_partner` SSE 이벤트 수신 시 대화 흐름 내에 표시.
 * 인라인 카드(프롬프트 + 버튼)는 그대로 두고, 버튼을 누르면 공용 MansePickerSheet를 연다.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ProfileResponse, PartnerAttachRequest } from '@sajuguri/api-client'
import MansePickerSheet, { type MansePick } from '@/components/manse/MansePickerSheet'

interface Props {
  profiles: ProfileResponse[]
  onSelect: (p: ProfileResponse) => void
  onSubmitBirth: (body: PartnerAttachRequest) => Promise<void>
}

export default function InlinePartnerCard({ profiles, onSelect, onSubmitBirth }: Props) {
  const t = useTranslations('chat')
  const [sheetOpen, setSheetOpen] = useState(false)

  async function handlePick(pick: MansePick) {
    if (pick.profile_id != null) {
      const profile = profiles.find((p) => p.id === pick.profile_id)
      if (profile) onSelect(profile)
      return
    }
    await onSubmitBirth({
      birth_date: pick.birth_date,
      gender: pick.gender,
      calendar: pick.calendar,
      is_leap_month: pick.is_leap_month,
      ...(pick.birth_time ? { birth_time: pick.birth_time } : {}),
      ...(pick.name?.trim() ? { name: pick.name.trim() } : {}),
    })
  }

  return (
    <>
      <div className="w-full rounded-2xl border-2 border-orange bg-yellow-tint px-3 py-3">
        <p className="mb-2 text-[13px] font-extrabold text-ink">{t('inlinePartner.prompt')}</p>
        <button
          className="rounded-xl border-2 border-ink bg-yellow px-4 py-2 text-[13px] font-extrabold shadow-brutal-sm transition-opacity hover:opacity-80"
          onClick={() => setSheetOpen(true)}
        >
          {t('inlinePartner.action')}
        </button>
      </div>

      <MansePickerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles}
        title={t('inlinePartner.sheetTitle')}
        onPick={handlePick}
      />
    </>
  )
}
