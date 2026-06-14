'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'

const KEY = 'sajuguri.locale'

/** next-intl이 읽는 NEXT_LOCALE 쿠키를 1년짜리로 심는다 — SSR이 저장 선택을 따르게. */
function writeLocaleCookie(loc: string) {
  try {
    document.cookie = `NEXT_LOCALE=${loc}; path=/; max-age=31536000; samesite=lax`
  } catch {
    /* 쿠키 불가 환경 무시 */
  }
}

/**
 * 첫 방문은 Accept-Language 자동 감지(영어 기기→영어). 사용자가 언어를 바꾸면
 * persistLocale이 localStorage+쿠키에 저장하고, 이후 모든 접속에서 이 컴포넌트가
 * localStorage→쿠키를 재확인해(Safari가 쿠키를 지워도 복원) 저장 선택을 유지한다.
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
    if (saved !== 'ko' && saved !== 'en') return
    // 저장된 선택을 쿠키에 항상 보장 → 다음 SSR이 이걸 우선한다.
    writeLocaleCookie(saved)
    // 현재 화면이 저장 선택과 다르면(쿠키가 지워져 영어로 떴을 때 등) 교정.
    if (saved !== locale) router.replace(pathname, { locale: saved, scroll: false })
  }, [locale, pathname, router])

  return null
}

/** 토글에서 호출 — 선택한 언어를 localStorage + NEXT_LOCALE 쿠키에 저장. */
export function persistLocale(next: 'ko' | 'en') {
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* localStorage 불가 환경 무시 */
  }
  writeLocaleCookie(next)
}
