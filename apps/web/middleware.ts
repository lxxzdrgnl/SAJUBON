import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

// 서버 사이드에서 백엔드를 직접 부른다 (rewrites 우회).
const API_BASE = process.env.API_BASE ?? 'http://localhost:8000'
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true'

// 쿠키 max_age는 백엔드 토큰 만료 정책과 일치시킨다 (core.config).
const ACCESS_MAX_AGE = 15 * 60 // jwt_expire_minutes
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 // refresh_token_expire_days

/** RSC prefetch 요청인지 — 회전 토큰 경쟁 방지를 위해 refresh를 건너뛴다. */
function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch'
  )
}

export default async function middleware(request: NextRequest) {
  const hasAccess = request.cookies.has('access_token')
  const refresh = request.cookies.get('refresh_token')?.value

  // access_token이 만료(브라우저가 쿠키 삭제)됐지만 refresh_token이 살아있으면
  // 무중단으로 새 토큰을 발급받는다. prefetch는 건너뛴다(회전 토큰 동시 폐기 방지).
  let rotated: { access: string; refresh: string } | null = null
  if (!hasAccess && refresh && !isPrefetch(request)) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: `refresh_token=${refresh}` },
        body: '{}',
      })
      if (res.ok) {
        const data = (await res.json()) as { access_token: string; refresh_token: string }
        rotated = { access: data.access_token, refresh: data.refresh_token }
        // 이번 요청에도 주입해, 현재 렌더(currentUser)가 곧바로 로그인 상태를 보게 한다.
        request.cookies.set('access_token', rotated.access)
        request.cookies.set('refresh_token', rotated.refresh)
      }
    } catch {
      // 네트워크 실패 시 그냥 통과 — 비로그인 흐름으로 자연스럽게 떨어진다.
    }
  }

  const response = intlMiddleware(request)

  // 갱신됐으면 브라우저 쿠키도 회전시킨다 (백엔드 _set_auth_cookies와 동일 속성).
  if (rotated) {
    const opts = { httpOnly: true, sameSite: 'lax' as const, secure: COOKIE_SECURE, path: '/' }
    response.cookies.set('access_token', rotated.access, { ...opts, maxAge: ACCESS_MAX_AGE })
    response.cookies.set('refresh_token', rotated.refresh, { ...opts, maxAge: REFRESH_MAX_AGE })
  }

  return response
}

export const config = {
  // /api·정적 파일 제외 — 백엔드 프록시가 로케일 리다이렉트에 걸리면 안 됨
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
