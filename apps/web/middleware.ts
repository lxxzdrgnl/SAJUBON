import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // /api·정적 파일 제외 — 백엔드 프록시가 로케일 리다이렉트에 걸리면 안 됨
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
