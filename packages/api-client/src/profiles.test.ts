import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './client'
import { listProfiles, createProfile } from './profiles'

const mockFetch = vi.fn()
beforeEach(() => { vi.stubGlobal('fetch', mockFetch); mockFetch.mockReset() })

describe('listProfiles', () => {
  it('GET /api/profiles', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([
      { id: 1, name: '나', birth_date: '1990-03-15', is_representative: true },
    ]), { status: 200 }))
    const api = new ApiClient('http://x')
    const r = await listProfiles(api)
    expect(mockFetch.mock.calls[0][0]).toBe('http://x/api/profiles')
    expect(r[0].name).toBe('나')
  })
})

describe('createProfile', () => {
  it('POST /api/profiles + body 직렬화', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ id: 9, name: '나' }), { status: 201 }))
    const api = new ApiClient('http://x')
    const body = {
      name: '나', birth_date: '1990-03-15', birth_time: '14:30',
      gender: 'male' as const, calendar: 'solar' as const,
    }
    const r = await createProfile(api, body)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://x/api/profiles')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(body)
    expect(r.id).toBe(9)
  })
})
