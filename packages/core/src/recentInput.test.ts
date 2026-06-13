import { describe, it, expect } from 'vitest'
import { createMemoryStorage } from './storage'
import {
  loadRecentInputs,
  saveRecentInput,
  enrichRecentInputDayStem,
  type RecentBirthInput,
} from './recentInput'

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
  it('일간 보강 — 키 일치 항목에만 day_stem 써넣음', async () => {
    const s = createMemoryStorage()
    await saveRecentInput(s, input)
    await saveRecentInput(s, { ...input, name: '여친', birth_date: '1998-07-14' })
    const changed = await enrichRecentInputDayStem(s, input, '병')
    expect(changed).toBe(true)
    const list = await loadRecentInputs(s)
    expect(list.find((i) => i.birth_date === '1995-03-02')?.day_stem).toBe('병')
    expect(list.find((i) => i.birth_date === '1998-07-14')?.day_stem).toBeUndefined()
  })
  it('일간 보강 — 이미 같은 값이면 쓰지 않음(false)', async () => {
    const s = createMemoryStorage()
    await saveRecentInput(s, { ...input, day_stem: '병' })
    expect(await enrichRecentInputDayStem(s, input, '병')).toBe(false)
  })
  it('일간 보강 — 일치 항목 없으면 false', async () => {
    const s = createMemoryStorage()
    await saveRecentInput(s, input)
    expect(await enrichRecentInputDayStem(s, { ...input, birth_date: '2000-01-01' }, '갑')).toBe(false)
  })
  it('최대 5개 유지', async () => {
    const s = createMemoryStorage()
    for (let i = 0; i < 7; i++)
      await saveRecentInput(s, { ...input, name: `p${i}`, birth_date: `199${i}-01-01` })
    expect(await loadRecentInputs(s)).toHaveLength(5)
  })
})
