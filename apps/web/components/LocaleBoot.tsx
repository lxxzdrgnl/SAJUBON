'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'

const KEY = 'sajuguri.locale'

/**
 * 사용자가 고른 언어를 localStorage에 영속화하고, 재방문 시 그 선택을 강제한다.
 * 영어 기기(Accept-Language=en)라도 한국어를 골랐으면 다음 접속에 한국어로 뜬다.
 * 토글(LanguageToggle*)이 setItem 하고, 이 컴포넌트가 부팅 시 불일치하면 교정한다.
 */
export default function LocaleBoot() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(KEY)
    } catch {
      return
    }
    if ((saved === 'ko' || saved === 'en') && saved !== locale) {
      router.replace(pathname, { locale: saved })
    }
  }, [locale, pathname, router])

  return null
}

/** 토글에서 호출 — 선택한 언어를 영속화. */
export function persistLocale(next: 'ko' | 'en') {
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* localStorage 불가 환경 무시 */
  }
}
