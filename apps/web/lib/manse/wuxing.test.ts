import { describe, it, expect } from 'vitest'
import {
  toPercent, judge, balanceScore, balanceLabel, balanceSummary,
  pentagramVertices, nodeRadius, WUXING_ORDER,
} from './wuxing'

describe('toPercent — 합계 100% 정규화', () => {
  it('균등 분포는 각 20%', () => {
    expect(toPercent({ 목: 1, 화: 1, 토: 1, 금: 1, 수: 1 })).toEqual({ 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 })
  })
  it('빈 입력은 모두 0', () => {
    expect(toPercent({})).toEqual({ 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 })
  })
})

describe('judge — 경계값', () => {
  it('<10 부족, >30 과다, 그 외 적정', () => {
    expect(judge(9)).toBe('부족')
    expect(judge(10)).toBe('적정')
    expect(judge(30)).toBe('적정')
    expect(judge(31)).toBe('과다')
  })
})

describe('balanceScore — 편차 기반', () => {
  it('완벽 균형(각 20%)은 100', () => {
    expect(balanceScore({ 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 })).toBe(100)
  })
  it('한 오행 100% 쏠림은 낮은 점수', () => {
    // dev = 80+20+20+20+20 = 160, 100-80 = 20
    expect(balanceScore({ 목: 100, 화: 0, 토: 0, 금: 0, 수: 0 })).toBe(20)
  })
  it('합계 0이면 0', () => {
    expect(balanceScore({})).toBe(0)
  })
})

describe('balanceLabel — 구간', () => {
  it('80↑ 균형, 60↑ 보통, 그 외 불균형', () => {
    expect(balanceLabel(80).text).toBe('균형')
    expect(balanceLabel(60).text).toBe('보통')
    expect(balanceLabel(59).text).toBe('불균형')
  })
})

describe('balanceSummary — 과다/부족 추출', () => {
  it('과다·부족 오행을 분리', () => {
    expect(balanceSummary({ 목: 40, 화: 5, 토: 20, 금: 20, 수: 15 })).toEqual({ over: ['목'], lack: ['화'] })
  })
})

describe('pentagram geometry', () => {
  it('꼭짓점 5개, 첫 꼭짓점은 상단(목)', () => {
    const v = pentagramVertices()
    expect(v).toHaveLength(5)
    expect(v[0].x).toBeCloseTo(150, 1)
    expect(v[0].y).toBeCloseTo(60, 1) // cy - radius
  })
  it('nodeRadius 14~32 범위 클램프', () => {
    expect(nodeRadius(0)).toBe(14)
    expect(nodeRadius(100)).toBe(32)
    expect(WUXING_ORDER).toHaveLength(5)
  })
})
