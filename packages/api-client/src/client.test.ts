import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient, ApiError } from './client'

const mockFetch = vi.fn()
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
})

describe('ApiClient', () => {
  it('GET — baseUrl 결합 + credentials include', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }))
    const api = new ApiClient('http://localhost:8000')
    const r = await api.get<{ ok: number }>('/api/health')
    expect(r.ok).toBe(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/health',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('POST — JSON 직렬화', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))
    const api = new ApiClient('http://localhost:8000')
    await api.post('/api/saju/calc', { birth_date: '1995-03-02' })
    const [, init] = mockFetch.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ birth_date: '1995-03-02' })
  })

  it('defaultHeaders — 모든 요청에 병합 (SSR 쿠키 포워딩)', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))
    const api = new ApiClient('http://localhost:8000', { Cookie: 'access_token=abc' })
    await api.get('/api/auth/me')
    const [, init] = mockFetch.mock.calls[0]
    expect(init.headers).toMatchObject({ Cookie: 'access_token=abc' })
  })

  it('defaultHeaders — 요청별 헤더와 함께 병합', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))
    const api = new ApiClient('http://localhost:8000', { Cookie: 'x=1' })
    await api.post('/api/profiles', { name: '나' })
    const [, init] = mockFetch.mock.calls[0]
    expect(init.headers).toMatchObject({
      Cookie: 'x=1',
      'Content-Type': 'application/json',
    })
  })

  it('비 2xx → ApiError(status, detail)', async () => {
    mockFetch.mockImplementation(() =>
      new Response(JSON.stringify({ detail: '세션 없음' }), { status: 404 }),
    )
    const api = new ApiClient('http://localhost:8000')
    await expect(api.get('/api/chat/x/history')).rejects.toMatchObject({
      status: 404,
      detail: '세션 없음',
    })
    await expect(api.get('/api/chat/x/history')).rejects.toBeInstanceOf(ApiError)
  })
})
