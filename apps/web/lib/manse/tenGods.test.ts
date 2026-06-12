import { describe, it, expect } from 'vitest'
import { groupSummary, dominantGroups, donutArcs, TG_ELEMENT } from './tenGods'

describe('groupSummary — 그룹 합산·정렬', () => {
  it('비견+겁재는 비겁으로 합산, 내림차순', () => {
    const r = groupSummary({ 비견: 30, 겁재: 20, 정재: 20, 정관: 30 })
    expect(r[0]).toEqual({ group: '비겁', label: '자아·독립', pct: 50 })
    expect(r.find((g) => g.group === '관성')?.pct).toBe(30)
    expect(r.map((g) => g.group)).not.toContain('인성') // 값 0 제외
  })
})

describe('dominantGroups — 상위 2개', () => {
  it('비율 상위 두 그룹', () => {
    expect(dominantGroups({ 비견: 50, 정재: 30, 정관: 20 })).toEqual(['비겁', '재성'])
  })
})

describe('donutArcs — 세그먼트 생성', () => {
  it('값>0인 십성만 아크 생성, path 포함', () => {
    const arcs = donutArcs({ 비견: 50, 정재: 50, 식신: 0 }, (ss) => TG_ELEMENT[ss] ?? '#000')
    expect(arcs).toHaveLength(2)
    expect(arcs[0].d.startsWith('M')).toBe(true)
    expect(arcs[0].color).toBe('목')
  })
  it('빈 분포는 빈 배열', () => {
    expect(donutArcs({}, () => '#000')).toEqual([])
  })
})
