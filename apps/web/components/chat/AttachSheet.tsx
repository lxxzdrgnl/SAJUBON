'use client'

/**
 * 첨부 바텀시트 (B5) — + 버튼 클릭 시 표시.
 * 상대 만세력 첨부 — 공용 MansePickerSheet로 저장/최근/직접입력 일원화.
 */
import { useTranslations } from 'next-intl'
import type { ProfileResponse, PartnerAttachRequest } from '@sajuguri/api-client'
import MansePickerSheet, { type MansePick } from '@/components/manse/MansePickerSheet'

interface Props {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]
  onAttachPartner: (p: ProfileResponse) => void
  onSubmitPartnerBirth: (body: PartnerAttachRequest) => Promise<void>
  sessionId: string
}

export default function AttachSheet({
  open,
  onClose,
  profiles,
  onAttachPartner,
  onSubmitPartnerBirth,
  sessionId: _sessionId,
}: Props) {
  const t = useTranslations('chat')

  async function handlePick(pick: MansePick) {
    if (pick.profile_id != null) {
      const profile = profiles.find((p) => p.id === pick.profile_id)
      if (profile) onAttachPartner(profile)
      return
    }
    await onSubmitPartnerBirth({
      birth_date: pick.birth_date,
      gender: pick.gender,
      calendar: pick.calendar,
      is_leap_month: pick.is_leap_month,
      ...(pick.birth_time ? { birth_time: pick.birth_time } : {}),
      ...(pick.name ? { name: pick.name } : {}),
    })
  }

  return (
    <MansePickerSheet
      open={open}
      onClose={onClose}
      profiles={profiles}
      title={t('attach.title')}
      onPick={handlePick}
    />
  )
}
