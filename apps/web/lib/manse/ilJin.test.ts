import { describe, it, expect } from 'vitest'
import { calendarGrid, dateKey, prevMonth, nextMonth } from './ilJin'
import type { IlJinEntry } from '@sajuguri/api-client'

describe('dateKey', () => {
  it('0 패딩', () => {
    expect(dateKey(2026, 6, 1)).toBe('2026-06-01')
    expect(dateKey(2026, 12, 25)).toBe('2026-12-25')
  })
})

describe('calendarGrid — 2026년 6월', () => {
  // 2026-06-01은 월요일(getDay()=1) → 앞 빈칸 1
  const grid = calendarGrid(2026, 6, [])
  it('7의 배수 셀, 앞 빈칸 = 첫날 요일', () => {
    expect(grid.length % 7).toBe(0)
    expect(grid[0].day).toBeNull() // 일요일 빈칸
    expect(grid[1].day).toBe(1) // 월요일 1일
  })
  it('30일 모두 포함', () => {
    const days = grid.filter((c) => c.day !== null).map((c) => c.day)
    expect(days).toHaveLength(30)
    expect(days[29]).toBe(30)
  })
  it('entry 매핑', () => {
    const e: IlJinEntry = { date: '2026-06-15', stem: '갑', branch: '자', ganji_name: '갑자', lunar_month: 5, lunar_day: 1, is_leap_month: false }
    const g = calendarGrid(2026, 6, [e])
    const cell = g.find((c) => c.date === '2026-06-15')
    expect(cell?.entry?.ganji_name).toBe('갑자')
  })
})

describe('prev/next month — 연도 경계', () => {
  it('1월 이전은 전년 12월', () => {
    expect(prevMonth(2026, 1)).toEqual({ year: 2025, month: 12 })
  })
  it('12월 다음은 내년 1월', () => {
    expect(nextMonth(2026, 12)).toEqual({ year: 2027, month: 1 })
  })
  it('일반 케이스', () => {
    expect(prevMonth(2026, 6)).toEqual({ year: 2026, month: 5 })
    expect(nextMonth(2026, 6)).toEqual({ year: 2026, month: 7 })
  })
})
