import { describe, it, expect } from 'vitest'
import {
  toPercent, judge, balanceScore, balanceLabel, balanceSummary,
  applyPalaceWeights, applyPalaceWeightsWithHap, selectWuxingPercent,
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

describe('궁성 가중치·합화 토글 (레거시 보존)', () => {
  const chars = [
    { pillar: 'month', type: 'branch', element: '화' },   // w 2.0
    { pillar: 'day', type: 'stem', element: '수' },       // w 1.5
    { pillar: 'year', type: 'stem', element: '금' },      // w 1.0
  ]
  it('applyPalaceWeights — 월지 2.0·일간 1.5 가중 후 정규화', () => {
    const p = applyPalaceWeights(chars)
    expect(p.화).toBe(44)  // 2/4.5
    expect(p.수).toBe(33)  // 1.5/4.5
    expect(p.금).toBe(22)  // 1/4.5
  })
  it('applyPalaceWeightsWithHap — hap_ratio 만큼 분배', () => {
    const p = applyPalaceWeightsWithHap([
      { pillar: 'year', type: 'stem', hap_type: '천간합', base_element: '목', hap_element: '토', hap_ratio: 0.5 },
      { pillar: 'year', type: 'branch', hap_type: null, base_element: '수', hap_element: null, hap_ratio: 0 },
    ])
    expect(p.목).toBe(25)
    expect(p.토).toBe(25)
    expect(p.수).toBe(50)
  })
  it('selectWuxingPercent — 토글 분기', () => {
    const data = {
      wuxing_count: { 목: 1, 화: 0, 토: 0, 금: 0, 수: 1 },
      wuxing_count_hap: { 목: 0, 화: 0, 토: 2, 금: 0, 수: 0 },
      wuxing_chars: chars,
      wuxing_hap_contributions: [],
    }
    expect(selectWuxingPercent(data, false, false).목).toBe(50)
    expect(selectWuxingPercent(data, true, false).토).toBe(100)
    expect(selectWuxingPercent(data, false, true).화).toBe(44)
  })
})
