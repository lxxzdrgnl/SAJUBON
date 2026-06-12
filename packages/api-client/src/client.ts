/** fetch 기반 API 클라이언트 — 인증은 httpOnly 쿠키 (credentials: 'include') */

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`API ${status}: ${detail}`)
    this.name = 'ApiError'
  }
}

export class ApiClient {
  constructor(private baseUrl: string) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' })
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
    })
    if (!res.ok) {
      let detail = res.statusText
      try {
        const data = await res.json()
        if (typeof data?.detail === 'string') detail = data.detail
      } catch { /* 본문이 JSON이 아니면 statusText 유지 */ }
      throw new ApiError(res.status, detail)
    }
    return res.json() as Promise<T>
  }
}
