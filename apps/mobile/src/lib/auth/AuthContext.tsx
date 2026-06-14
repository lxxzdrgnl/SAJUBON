import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as WebBrowser from 'expo-web-browser'
import { getMe, logout as apiLogout, type MeResponse } from '@sajuguri/api-client'
import { API_BASE, AUTH_REDIRECT } from '../config'
import { createAuthedApi, type AuthedApiClient } from './client'
import { clearTokens, getRefreshToken, saveTokens } from './tokens'

WebBrowser.maybeCompleteAuthSession()

type AuthStatus = 'loading' | 'authed' | 'guest'

interface AuthValue {
  status: AuthStatus
  user: MeResponse | null
  api: AuthedApiClient
  /** 구글 OAuth 로그인. 성공 시 true. */
  login: () => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

/** 딥링크 콜백 URL의 프래그먼트(#access_token=...&refresh_token=...)를 파싱.
 *  RN의 URLSearchParams는 문자열 파싱이 불완전해 수동으로 분해한다. */
function parseTokensFromUrl(url: string): { access: string; refresh: string } | null {
  const hashIndex = url.indexOf('#')
  if (hashIndex < 0) return null
  const out: Record<string, string> = {}
  for (const pair of url.slice(hashIndex + 1).split('&')) {
    const eq = pair.indexOf('=')
    if (eq < 0) continue
    out[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1))
  }
  const access = out.access_token
  const refresh = out.refresh_token
  if (!access || !refresh) return null
  return { access, refresh }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<MeResponse | null>(null)

  // onAuthFail은 최신 상태를 안전하게 갱신하도록 ref로 래핑
  const onAuthFail = useRef(() => {
    setUser(null)
    setStatus('guest')
  })

  const api = useMemo(() => createAuthedApi(() => onAuthFail.current()), [])

  // 부팅: refresh 토큰이 있으면 getMe로 세션 복원
  useEffect(() => {
    let alive = true
    ;(async () => {
      const rt = await getRefreshToken()
      if (!rt) {
        if (alive) setStatus('guest')
        return
      }
      const me = await getMe(api)
      if (!alive) return
      if (me) {
        setUser(me)
        setStatus('authed')
      } else {
        await clearTokens()
        setStatus('guest')
      }
    })()
    return () => {
      alive = false
    }
  }, [api])

  const login = useCallback(async (): Promise<boolean> => {
    const authUrl = `${API_BASE}/api/auth/google?client=native`
    const result = await WebBrowser.openAuthSessionAsync(authUrl, AUTH_REDIRECT)
    if (result.type !== 'success') return false
    const tokens = parseTokensFromUrl(result.url)
    if (!tokens) return false
    await saveTokens(tokens.access, tokens.refresh)
    const me = await getMe(api)
    if (!me) {
      await clearTokens()
      return false
    }
    setUser(me)
    setStatus('authed')
    return true
  }, [api])

  const logout = useCallback(async () => {
    await apiLogout(api)
    await clearTokens()
    setUser(null)
    setStatus('guest')
  }, [api])

  const value = useMemo<AuthValue>(
    () => ({ status, user, api, login, logout }),
    [status, user, api, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
