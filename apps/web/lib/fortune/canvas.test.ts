import { describe, it, expect } from 'vitest'
import { calcScoreBars, calcSummaryCardLayout } from './canvas'

const scores = { exam: 65, money: 72, love: 80, career: 70, health: 60, social: 75 }

describe('calcScoreBars', () => {
  it('6개 카테고리에 대해 바 6개를 반환한다', () => {
    const bars = calcScoreBars(scores, 100)
    expect(bars).toHaveLength(6)
  })

  it('Y 좌표가 startY부터 순차적으로 증가한다', () => {
    const bars = calcScoreBars(scores, 200)
    const gap = bars[1].y - bars[0].y
    expect(gap).toBeGreaterThan(0)
    expect(bars[0].y).toBe(200)
    for (let i = 1; i < bars.length; i++) {
      expect(bars[i].y - bars[i - 1].y).toBe(gap)
    }
  })

  it('점수가 0~100 범위에 있다', () => {
    const bars = calcScoreBars(scores, 0)
    for (const bar of bars) {
      expect(bar.score).toBeGreaterThanOrEqual(0)
      expect(bar.score).toBeLessThanOrEqual(100)
    }
  })

  it('없는 카테고리는 제외한다', () => {
    const partial = { exam: 70, money: 80 }
    const bars = calcScoreBars(partial, 0)
    expect(bars).toHaveLength(2)
  })
})

describe('calcSummaryCardLayout', () => {
  it('1080×1920 캔버스 크기를 반환한다', () => {
    const layout = calcSummaryCardLayout(scores)
    expect(layout.width).toBe(1080)
    expect(layout.height).toBe(1920)
  })

  it('scoreBars가 6개다', () => {
    const layout = calcSummaryCardLayout(scores)
    expect(layout.scoreBars).toHaveLength(6)
  })

  it('dateY < titleY < keywordY < barsStartY', () => {
    const layout = calcSummaryCardLayout(scores)
    expect(layout.dateY).toBeLessThan(layout.titleY)
    expect(layout.titleY).toBeLessThan(layout.keywordY)
    expect(layout.keywordY).toBeLessThan(layout.barsStartY)
  })
})
