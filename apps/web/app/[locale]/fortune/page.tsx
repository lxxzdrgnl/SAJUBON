import { Suspense } from 'react'
import FortuneStoryPage from '@/components/fortune/FortuneStoryPage'

/**
 * /fortune — 운세 스토리 화면 (풀스크린 오버레이).
 * 쿼리 파라미터: birth_date, birth_time, gender, calendar, is_leap_month, birth_longitude, pname
 * 또는 record={id} (저장본 재생).
 * Suspense: useSearchParams() 사용으로 필요.
 */
export default function FortunePage() {
  return (
    <Suspense>
      <FortuneStoryPage />
    </Suspense>
  )
}
