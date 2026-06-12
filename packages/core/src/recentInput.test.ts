import { describe, it, expect } from 'vitest'
import { createMemoryStorage } from './storage'
import { loadRecentInputs, saveRecentInput, type RecentBirthInput } from './recentInput'

const input: RecentBirthInput = {
  name: '나', birth_date: '1995-03-02', birth_time: '04:30',
  gender: 'male', calendar: 'solar', is_leap_month: false,
}

describe('최근 입력 보관 (localStorage 어댑터 경유)', () => {
  it('저장 후 로드 — 최신순, 동일 입력은 중복 제거', async () => {
    const s = createMemoryStorage()
    await saveRecentInput(s, input)
    await saveRecentInput(s, { ...input, name: '여자친구', birth_date: '1998-07-14' })
    await saveRecentInput(s, input)            // 중복 → 맨 앞으로 이동만
    const list = await loadRecentInputs(s)
    expect(list).toHaveLength(2)
    expect(list[0].name).toBe('나')
  })
  it('빈 저장소 → []', async () => {
    expect(await loadRecentInputs(createMemoryStorage())).toEqual([])
  })
  it('최대 5개 유지', async () => {
    const s = createMemoryStorage()
    for (let i = 0; i < 7; i++)
      await saveRecentInput(s, { ...input, name: `p${i}`, birth_date: `199${i}-01-01` })
    expect(await loadRecentInputs(s)).toHaveLength(5)
  })
})
