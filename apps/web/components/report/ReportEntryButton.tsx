'use client'

/**
 * 홈 리포트 카드 — 클릭 시 ReportEntrySheet를 열어 프로필/최근 입력 선택 → /report/new 이동.
 */
import { useState } from 'react'
import type { ProfileResponse } from '@sajuguri/api-client'
import ReportEntrySheet from '@/components/report/ReportEntrySheet'

interface Props {
  profiles: ProfileResponse[]
  isLoggedIn: boolean
  children: React.ReactNode
}

export default function ReportEntryButton({ profiles, isLoggedIn, children }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <button
        className="block h-full w-full cursor-pointer text-left"
        onClick={() => setSheetOpen(true)}
      >
        {children}
      </button>

      <ReportEntrySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles}
        isLoggedIn={isLoggedIn}
      />
    </>
  )
}
