import { describe, it, expect, vi } from 'vitest'
import { createShare, getSharedResult } from './share'
import type { ApiClient } from './client'

function mockApi(data: unknown): ApiClient {
  return {
    get: vi.fn().mockResolvedValue(data),
    post: vi.fn().mockResolvedValue(data),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as ApiClient
}

const calcSnapshot = { day_pillar: { ganji_name: '갑자' } } as never

describe('createShare', () => {
  it('POST /api/share — birth_input 동반', async () => {
    const res = {
      share_token: 'tok-123',
      share_url: 'https://x/share/tok-123',
      created_at: '2026-06-13T00:00:00Z',
    }
    const api = mockApi(res)
    const body = {
      calc_snapshot: calcSnapshot,
      birth_input: { birth_date: '1990-01-01', birth_time: null, gender: 'male' as const },
    }
    const result = await createShare(api, body)
    expect(api.post).toHaveBeenCalledWith('/api/share', body)
    expect(result.share_token).toBe('tok-123')
  })

  it('POST /api/share — profile_id 동반', async () => {
    const res = { share_token: 't', share_url: 'u', created_at: 'c' }
    const api = mockApi(res)
    await createShare(api, { calc_snapshot: calcSnapshot, profile_id: 7 })
    expect(api.post).toHaveBeenCalledWith('/api/share', { calc_snapshot: calcSnapshot, profile_id: 7 })
  })
})

describe('getSharedResult', () => {
  it('GET /api/share/{token}', async () => {
    const res = {
      share_token: 'tok-123',
      profile_id: null,
      birth_input: { birth_date: '1990-01-01', birth_time: null, gender: 'male' },
      calc_snapshot: calcSnapshot,
      created_at: '2026-06-13T00:00:00Z',
    }
    const api = mockApi(res)
    const result = await getSharedResult(api, 'tok-123')
    expect(api.get).toHaveBeenCalledWith('/api/share/tok-123')
    expect(result.calc_snapshot).toBeDefined()
  })
})
