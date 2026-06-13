'use client'

/**
 * 채팅 진입 시트 — 공용 MansePickerSheet로 만세력 선택 → 세션 생성 → /chat/[id] 이동.
 */
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { ProfileResponse, ChatSessionCreate } from '@sajuguri/api-client'
import { createSession } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import MansePickerSheet, { type MansePick } from '@/components/manse/MansePickerSheet'

interface Props {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]
}

export default function ChatEntrySheet({ open, onClose, profiles }: Props) {
  const t = useTranslations('chat')
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  const startSession = useCallback(
    async (body: ChatSessionCreate) => {
      if (creating) return
      setCreating(true)
      try {
        const session = await createSession(api, body)
        onClose()
        router.push(`/chat/${session.id}`)
      } catch {
        setCreating(false)
      }
    },
    [creating, onClose, router],
  )

  const handlePick = useCallback(
    (pick: MansePick) => {
      if (creating) return
      if (pick.profile_id != null) {
        startSession({ profile_id: pick.profile_id })
      } else {
        startSession({
          birth_date: pick.birth_date,
          birth_time: pick.birth_time,
          gender: pick.gender,
          calendar: pick.calendar,
          is_leap_month: pick.is_leap_month,
        })
      }
    },
    [creating, startSession],
  )

  return (
    <MansePickerSheet
      open={open}
      onClose={onClose}
      profiles={profiles}
      title={t('pickSheet.title')}
      onPick={handlePick}
    />
  )
}
