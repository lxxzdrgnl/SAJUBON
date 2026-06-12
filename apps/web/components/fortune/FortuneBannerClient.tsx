'use client'

/**
 * 홈 운세 배너 클릭 핸들러 — 만세력 선택 시트 열기.
 * 서버 컴포넌트(home page.tsx)에서 profiles를 내려받아 클라이언트 시트에 전달.
 */
import { useState } from 'react'
import type { ProfileResponse } from '@sajuguri/api-client'
import FortuneEntrySheet from '@/components/fortune/FortuneEntrySheet'

interface Props {
  profiles: ProfileResponse[]
  isLoggedIn: boolean
  children: React.ReactNode
}

export default function FortuneBannerClient({ profiles, isLoggedIn, children }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <button
        className="block w-full cursor-pointer text-left"
        onClick={() => setSheetOpen(true)}
        aria-label="오늘의 운세 보기"
      >
        {children}
      </button>

      <FortuneEntrySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles}
        isLoggedIn={isLoggedIn}
      />
    </>
  )
}
