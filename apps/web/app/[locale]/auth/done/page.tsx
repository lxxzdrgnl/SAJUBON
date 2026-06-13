'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'

/**
 * OAuth 콜백 착지 페이지. 백엔드가 httpOnly 쿠키를 심고 여기로 리다이렉트한다.
 * 쿠키는 이미 브라우저에 저장됐으므로 홈으로 교체 이동만 한다.
 */
export default function AuthDone() {
  const router = useRouter()
  const t = useTranslations('auth')
  useEffect(() => {
    router.replace('/')
  }, [router])
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm font-extrabold text-text-sub">{t('signingIn')}</p>
    </main>
  )
}
