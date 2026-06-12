import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './client'
import { getMe, logout } from './auth'

const mockFetch = vi.fn()
beforeEach(() => { vi.stubGlobal('fetch', mockFetch); mockFetch.mockReset() })

describe('getMe', () => {
  it('성공 → MeResponse', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({
      id: 1, email: 'a@b.com', role: 'user', provider: 'google',
    }), { status: 200 }))
    const api = new ApiClient('http://x')
    const me = await getMe(api)
    expect(mockFetch.mock.calls[0][0]).toBe('http://x/api/auth/me')
    expect(me).toEqual({ id: 1, email: 'a@b.com', role: 'user', provider: 'google' })
  })

  it('401 → null (비로그인)', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ detail: '로그인이 필요합니다.' }), { status: 401 }))
    const api = new ApiClient('http://x')
    expect(await getMe(api)).toBeNull()
  })
})

describe('logout', () => {
  it('POST /api/auth/logout 호출', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))
    const api = new ApiClient('http://x')
    await logout(api)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://x/api/auth/logout')
    expect(init.method).toBe('POST')
  })

  it('실패해도 throw 안 함', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 500 }))
    const api = new ApiClient('http://x')
    await expect(logout(api)).resolves.toBeUndefined()
  })
})
