import { describe, it, expect } from 'vitest'
import { pillarSlots, sinSalsForPillar, jiJangGanText, type PillarLoc } from './pillars'
import type { SajuCalcResponse, SinSal } from '@sajuguri/api-client'

function makePillar(stem: string) {
  return {
    stem, stem_hanja: stem, branch: '자', branch_hanja: '子',
    stem_element: '목', branch_element: '수', yin_yang: '양',
    ganji_name: stem + '자', stem_ten_god: '비견', branch_ten_god: '정인',
    twelve_wun: '장생', twelve_sin_sal: '',
  }
}

describe('pillarSlots — 시→일→월→연 순서 + null 보존', () => {
  it('시주 미입력이면 hour 슬롯 pillar=null', () => {
    const data = {
      hour_pillar: null,
      day_pillar: makePillar('갑'),
      month_pillar: makePillar('을'),
      year_pillar: makePillar('병'),
    } as unknown as SajuCalcResponse
    const slots = pillarSlots(data)
    expect(slots.map((s) => s.loc)).toEqual(['hour', 'day', 'month', 'year'])
    expect(slots[0].pillar).toBeNull()
    expect(slots[1].pillar?.stem).toBe('갑')
    expect(slots[1].label).toBe('일주')
  })
})

describe('sinSalsForPillar — location 정확/prefix 매칭', () => {
  const sinSals: SinSal[] = [
    { name: '천을귀인', type: 'lucky', priority: 'high', location: ['day'] },
    { name: '역마', type: 'neutral', priority: 'medium', location: ['month_branch'] },
    { name: '도화', type: 'neutral', priority: 'low', location: ['year', 'hour'] },
  ]
  it('day는 정확 매칭', () => {
    expect(sinSalsForPillar(sinSals, 'day').map((s) => s.name)).toEqual(['천을귀인'])
  })
  it('month는 month_branch를 prefix로 잡음', () => {
    expect(sinSalsForPillar(sinSals, 'month').map((s) => s.name)).toEqual(['역마'])
  })
  it('빈 입력 안전', () => {
    expect(sinSalsForPillar([], 'day')).toEqual([])
  })
})

describe('jiJangGanText — 배열 join', () => {
  it('배열을 이어 붙인다', () => {
    const jjg: Record<string, string[]> = { day: ['병', '기', '경'], hour: [] }
    expect(jiJangGanText(jjg, 'day' as PillarLoc)).toBe('병기경')
    expect(jiJangGanText(jjg, 'hour' as PillarLoc)).toBe('')
    expect(jiJangGanText(jjg, 'year' as PillarLoc)).toBe('')
  })
})
