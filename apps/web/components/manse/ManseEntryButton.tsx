'use client'

/** 홈 "만세력 보기" 카드 — MansePickerSheet로 만세력 선택 → /manse/result 이동. */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { ProfileResponse } from '@sajuguri/api-client'
import { manseNavQuery } from '@/lib/manse/query'
import MansePickerSheet, { type MansePick } from '@/components/manse/MansePickerSheet'

interface Props {
  profiles: ProfileResponse[]
  isLoggedIn: boolean
  children: React.ReactNode
}

export default function ManseEntryButton({ profiles, isLoggedIn, children }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const t = useTranslations('home')

  return (
    <>
      <button className="block w-full cursor-pointer text-left" onClick={() => setOpen(true)}>
        {children}
      </button>
      <MansePickerSheet
        open={open}
        onClose={() => setOpen(false)}
        profiles={isLoggedIn ? profiles : []}
        title={t('cards.manse.title')}
        onPick={(pick: MansePick) => router.push(`/manse/result?${manseNavQuery(pick)}`)}
      />
    </>
  )
}
