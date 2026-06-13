import { describe, it, expect } from 'vitest'
import { buildBirthKey, buildCacheKey, loadCachedStory, saveCachedStory } from './cache'
import type { DailyStoryResponse } from '@sajuguri/api-client'
import { createMemoryStorage } from '@sajuguri/core'

const sample: DailyStoryResponse = {
  date: '2026-06-13',
  day_ganji: { stem: '갑', branch: '자' },
  profile_name: '홍길동',
  cards: [],
  scores: { exam: 65, money: 72, love: 80, career: 70, health: 60, social: 75 },
  keyword: '균형',
  record_id: null,
  rewritten: false,
}

describe('buildBirthKey', () => {
  it('동일 입력은 동일 키를 반환한다', () => {
    const a = buildBirthKey({ birth_date: '1990-01-01', birth_time: '12:00', gender: 'male' })
    const b = buildBirthKey({ birth_date: '1990-01-01', birth_time: '12:00', gender: 'male' })
    expect(a).toBe(b)
  })

  it('다른 성별은 다른 키를 반환한다', () => {
    const m = buildBirthKey({ birth_date: '1990-01-01', birth_time: null, gender: 'male' })
    const f = buildBirthKey({ birth_date: '1990-01-01', birth_time: null, gender: 'female' })
    expect(m).not.toBe(f)
  })
})

describe('buildCacheKey', () => {
  it('prefix + date + birthKey 형태다', () => {
    const key = buildCacheKey('k1', '2026-06-13')
    expect(key).toContain('2026-06-13')
    expect(key).toContain('k1')
  })
})

describe('loadCachedStory / saveCachedStory', () => {
  it('저장 후 불러오면 동일 값을 반환한다', async () => {
    const storage = createMemoryStorage()
    await saveCachedStory(storage, 'key1', '2026-06-13', sample)
    const loaded = await loadCachedStory(storage, 'key1', '2026-06-13')
    expect(loaded).not.toBeNull()
    expect(loaded!.keyword).toBe('균형')
  })

  it('없는 키는 null을 반환한다', async () => {
    const storage = createMemoryStorage()
    const result = await loadCachedStory(storage, 'nonexistent', '2026-06-13')
    expect(result).toBeNull()
  })
})
