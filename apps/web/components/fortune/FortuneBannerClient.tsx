'use client'

/**
 * 홈 운세 배너 클릭 핸들러 — 만세력 선택 시트 열기.
 * 서버 컴포넌트(home page.tsx)에서 profiles를 내려받아 클라이언트 시트에 전달.
 */
import { useEffect, useState } from 'react'
import type { ProfileResponse } from '@sajuguri/api-client'
import FortuneEntrySheet from '@/components/fortune/FortuneEntrySheet'

interface Props {
  profiles: ProfileResponse[]
  isLoggedIn: boolean
  children: React.ReactNode
}

export default function FortuneBannerClient({ profiles, isLoggedIn, children }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)

  // ?fortune=1 진입(공유 페이지의 "나도 내 운세 보기" CTA 등) → 만세력 선택 시트 자동 오픈.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('fortune')) {
      setSheetOpen(true)
      // 쿼리 정리 — 새로고침·뒤로가기 때 다시 안 열리도록
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

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
