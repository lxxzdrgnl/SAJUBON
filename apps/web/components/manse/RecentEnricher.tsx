'use client'

/**
 * 결과 페이지(서버 컴포넌트)가 가진 일간(day_stem)을 게스트 최근 입력 localStorage에 보강한다.
 * 과거에 day_stem 없이 저장된 항목도 결과를 한 번 열면 너구리 아바타가 일간색으로 틴팅된다.
 * 키 매칭은 recentInput의 중복키(생일·시각·성별·양/음력) 로직을 그대로 따른다.
 */
import { useEffect } from 'react'
import { enrichRecentInputDayStem } from '@sajuguri/core'
import { webStorage } from '@/lib/storage'

interface Props {
  birth_date: string
  birth_time: string | null
  gender: string
  calendar: string
  day_stem: string
}

export default function RecentEnricher({ birth_date, birth_time, gender, calendar, day_stem }: Props) {
  useEffect(() => {
    if (!birth_date || !gender || !day_stem) return
    void enrichRecentInputDayStem(
      webStorage,
      { birth_date, birth_time, gender: gender as 'male' | 'female', calendar: calendar as 'solar' | 'lunar' },
      day_stem,
    )
  }, [birth_date, birth_time, gender, calendar, day_stem])
  return null
}
