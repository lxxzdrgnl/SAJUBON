import { describe, it, expect, vi } from 'vitest'
import { createDailyStory, listDailyRecords, getDailyRecord, deleteDailyRecord } from './daily'
import type { ApiClient } from './client'

function mockApi(data: unknown): ApiClient {
  return {
    get: vi.fn().mockResolvedValue(data),
    post: vi.fn().mockResolvedValue(data),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as ApiClient
}

const sampleResponse = {
  date: '2026-06-13',
  day_ganji: { stem: '갑', branch: '자' },
  profile_name: '홍길동',
  cards: [
    { kind: 'intro', title: '오늘의 일진', headline: '오늘은 갑자일', body: '좋은 날이야' },
    { kind: 'overall', title: '총운', score: 72, headline: '무난한 하루', body: '큰 일 없어' },
  ],
  scores: { exam: 65, money: 72, love: 80, career: 70, health: 60, social: 75 },
  keyword: '균형',
  record_id: null,
  rewritten: false,
}

describe('createDailyStory', () => {
  it('POST /api/daily/story 호출', async () => {
    const api = mockApi(sampleResponse)
    const req = {
      birth_input: {
        birth_date: '1990-01-01',
        birth_time: '12:00',
        gender: 'male' as const,
      },
      date: '2026-06-13',
    }
    const result = await createDailyStory(api, req)
    expect(api.post).toHaveBeenCalledWith('/api/daily/story', req)
    expect(result.date).toBe('2026-06-13')
    expect(result.cards).toHaveLength(2)
  })
})

describe('listDailyRecords', () => {
  it('GET /api/daily/records 호출', async () => {
    const records = [{ id: 1, date: '2026-06-13', profile_name: '홍길동', keyword: '균형' }]
    const api = mockApi(records)
    const result = await listDailyRecords(api)
    expect(api.get).toHaveBeenCalledWith('/api/daily/records')
    expect(result).toHaveLength(1)
  })
})

describe('getDailyRecord', () => {
  it('GET /api/daily/records/{id} 호출', async () => {
    const api = mockApi(sampleResponse)
    const result = await getDailyRecord(api, 42)
    expect(api.get).toHaveBeenCalledWith('/api/daily/records/42')
    expect(result.keyword).toBe('균형')
  })
})

describe('deleteDailyRecord', () => {
  it('DELETE /api/daily/records/{id} 호출', async () => {
    const api = mockApi(undefined)
    await deleteDailyRecord(api, 42)
    expect(api.delete).toHaveBeenCalledWith('/api/daily/records/42')
  })
})
