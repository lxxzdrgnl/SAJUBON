import { describe, it, expect } from 'vitest'
import { LEVELS_8, STRENGTH_DIST, levelIndex, levelPercentile, clampScore } from './strength'

describe('strength — 8단계 레벨 헬퍼', () => {
  it('LEVELS_8은 약→강 순 8개', () => {
    expect(LEVELS_8).toHaveLength(8)
    expect(LEVELS_8[0]).toBe('극약')
    expect(LEVELS_8[7]).toBe('극왕')
  })

  it('분포는 8개 항목', () => {
    expect(STRENGTH_DIST).toHaveLength(8)
  })

  it('levelIndex — 알려진 레벨', () => {
    expect(levelIndex('극약')).toBe(0)
    expect(levelIndex('신강')).toBe(5)
    expect(levelIndex('극왕')).toBe(7)
  })

  it('levelIndex — 미지정은 중앙 4', () => {
    expect(levelIndex('??')).toBe(4)
  })

  it('levelPercentile — 신강(25.0)은 가장 큰 비율', () => {
    const total = STRENGTH_DIST.reduce((a, b) => a + b, 0)
    expect(levelPercentile('신강')).toBe(((25.0 / total) * 100).toFixed(1))
  })

  it('clampScore — 0~100 범위', () => {
    expect(clampScore(-10)).toBe(0)
    expect(clampScore(150)).toBe(100)
    expect(clampScore(55)).toBe(55)
  })
})
