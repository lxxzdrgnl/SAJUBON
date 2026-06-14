'use client'

/**
 * 리포트 진입 시트 — 공용 MansePickerSheet 재사용.
 * 저장된 만세력 · 최근 본 만세력 · 만세력 추가하기(모달 내 직접 입력)에서 고르면
 * /report/new?<birth 쿼리>로 이동한다. (직접 입력분은 MansePickerSheet가 최근 본 만세력에 저장)
 */
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { ProfileResponse } from '@sajuguri/api-client'
import { manseNavQuery } from '@/lib/manse/query'
import MansePickerSheet, { type MansePick } from '@/components/manse/MansePickerSheet'

interface Props {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]
  isLoggedIn: boolean
}

export default function ReportEntrySheet({ open, onClose, profiles, isLoggedIn }: Props) {
  const t = useTranslations('report.entrySheet')
  const router = useRouter()

  function handlePick(pick: MansePick) {
    // MansePickerSheet가 onPick 직후 onClose를 호출한다.
    router.push(`/report/new?${manseNavQuery(pick)}`)
  }

  return (
    <MansePickerSheet
      open={open}
      onClose={onClose}
      profiles={isLoggedIn ? profiles : []}
      title={t('title')}
      onPick={handlePick}
    />
  )
}
