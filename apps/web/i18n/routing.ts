import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'as-needed',   // ko = /, en = /en/...
  localeDetection: true,       // 첫 방문 감지 → 이후 쿠키(NEXT_LOCALE) 우선
})
