import { ApiClient, ApiError } from '@sajuguri/api-client'
import { API_BASE } from '../config'
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './tokens'

// 인증 ApiClient — 웹은 httpOnly 쿠키를 쓰지만 RN은 쿠키를 못 쓰므로 Bearer 토큰을 주입한다.
// get/post/patch/delete(공개 메서드)를 오버라이드해 Authorization 헤더 + 401 시 1회 refresh-retry 처리.
// @sajuguri/api-client의 모든 함수(getMe, listProfiles ...)가 이 인스턴스를 그대로 받는다.
export class AuthedApiClient extends ApiClient {
  private refreshing: Promise<boolean> | null = null

  constructor(
    private base: string,
    private onAuthFail?: () => void,
  ) {
    super(base)
  }

  private async authedFetch(path: string, init: RequestInit, retry = true): Promise<Response> {
    const access = await getAccessToken()
    const headers = {
      ...(init.headers as Record<string, string> | undefined),
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    }
    const res = await fetch(`${this.base}${path}`, { ...init, headers })
    if (res.status === 401 && retry) {
      const refreshed = await this.tryRefresh()
      if (refreshed) return this.authedFetch(path, init, false)
      this.onAuthFail?.()
    }
    return res
  }

  // 동시 401이 여러 refresh를 부르지 않도록 단일 in-flight 보장
  private tryRefresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null
      })
    }
    return this.refreshing
  }

  private async doRefresh(): Promise<boolean> {
    const rt = await getRefreshToken()
    if (!rt) return false
    try {
      const res = await fetch(`${this.base}/api/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      })
      if (!res.ok) {
        await clearTokens()
        return false
      }
      const data = (await res.json()) as { access_token: string; refresh_token: string }
      await saveTokens(data.access_token, data.refresh_token)
      return true
    } catch {
      return false
    }
  }

  private async toError(res: Response): Promise<ApiError> {
    let detail = res.statusText
    try {
      const d = (await res.json()) as { detail?: unknown }
      if (typeof d?.detail === 'string') detail = d.detail
    } catch {
      /* JSON 아니면 statusText 유지 */
    }
    return new ApiError(res.status, detail)
  }

  private async handle<T>(res: Response): Promise<T> {
    if (!res.ok) throw await this.toError(res)
    return res.json() as Promise<T>
  }

  override async get<T>(path: string): Promise<T> {
    return this.handle<T>(await this.authedFetch(path, { method: 'GET' }))
  }

  override async post<T>(path: string, body?: unknown): Promise<T> {
    return this.handle<T>(
      await this.authedFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    )
  }

  override async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.handle<T>(
      await this.authedFetch(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    )
  }

  override async delete(path: string): Promise<void> {
    const res = await this.authedFetch(path, { method: 'DELETE' })
    if (!res.ok) throw await this.toError(res)
  }
}

/** 앱 전역에서 쓸 인증 클라이언트 팩토리 */
export function createAuthedApi(onAuthFail?: () => void): AuthedApiClient {
  return new AuthedApiClient(API_BASE, onAuthFail)
}
