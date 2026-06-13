import { describe, it, expect, vi } from 'vitest'
import {
  askQuestion,
  listConsultations,
  shareConsultation,
  getSharedConsultation,
  deleteConsultation,
} from './question'
import type { ApiClient } from './client'

function mockApi(data: unknown): ApiClient {
  return {
    get: vi.fn().mockResolvedValue(data),
    post: vi.fn().mockResolvedValue(data),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as ApiClient
}

describe('askQuestion', () => {
  it('POST /api/question 호출', async () => {
    const res = { id: 1, headline: 'h', content: 'c', category: 'career' }
    const api = mockApi(res)
    const body = { birth_date: '1990-01-01', birth_time: '12:00', gender: 'male' as const, question: '올해 운세 어때?' }
    const result = await askQuestion(api, body)
    expect(api.post).toHaveBeenCalledWith('/api/question', body)
    expect(result.id).toBe(1)
  })
})

describe('listConsultations', () => {
  it('GET /api/question/history 호출', async () => {
    const items = [
      { id: 1, profile_name: '홍길동', question: 'q', category: 'career', headline: 'h', content: 'c', created_at: '2026-06-13', share_token: null },
    ]
    const api = mockApi(items)
    const result = await listConsultations(api)
    expect(api.get).toHaveBeenCalledWith('/api/question/history')
    expect(result[0].profile_name).toBe('홍길동')
  })
})

describe('shareConsultation', () => {
  it('POST /api/question/{id}/share 호출 후 share_url 조립', async () => {
    const api = mockApi({ share_token: 'tok123456' })
    const result = await shareConsultation(api, 7)
    expect(api.post).toHaveBeenCalledWith('/api/question/7/share')
    expect(result.share_token).toBe('tok123456')
    expect(result.share_url).toContain('/share/question/tok123456')
  })
})

describe('getSharedConsultation', () => {
  it('GET /api/question/share/{token} 호출', async () => {
    const detail = { id: 1, question: 'q', category: 'career', headline: 'h', content: 'c', created_at: '2026-06-13', share_token: 'tok' }
    const api = mockApi(detail)
    const result = await getSharedConsultation(api, 'tok')
    expect(api.get).toHaveBeenCalledWith('/api/question/share/tok')
    expect(result.headline).toBe('h')
  })
})

describe('deleteConsultation', () => {
  it('DELETE /api/question/{id} 호출', async () => {
    const api = mockApi(undefined)
    await deleteConsultation(api, 3)
    expect(api.delete).toHaveBeenCalledWith('/api/question/3')
  })
})
