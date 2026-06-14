import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'as-needed',   // ko = /, en = /en/...
  // 첫 방문은 Accept-Language 자동 감지(영어 기기→영어). 이후엔 NEXT_LOCALE 쿠키 우선.
  // 저장한 선택은 LocaleBoot가 localStorage→쿠키로 복원해 다음 접속에 유지된다.
  localeDetection: true,
})
