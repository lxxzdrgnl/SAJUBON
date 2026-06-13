import { describe, it, expect } from 'vitest'
import { buildEntries, hasData, activePillars } from './hapChung'
import type { SajuCalcResponse } from '@sajuguri/api-client'

function pillar(stem: string, branch: string) {
  return { stem, branch, stem_hanja: '', branch_hanja: '', stem_element: '목', branch_element: '수', yin_yang: '양', ganji_name: '', stem_ten_god: '', branch_ten_god: '', twelve_wun: '', twelve_sin_sal: '' }
}

const saju = {
  year_pillar: pillar('갑', '자'),
  month_pillar: pillar('병', '오'),
  day_pillar: pillar('경', '신'),
  hour_pillar: null,
  branch_relations: {
    chung: [{ pair: ['자', '오'] }],
    yuk_hap: [{ pair: ['자', '축'], element: '토', is_effective: false }],
    sam_hyeong: ['자형'],
  },
  gong_mang: { vacant_branches: ['술', '해'], affected_pillars: ['day'] },
} as unknown as SajuCalcResponse

describe('activePillars — null 제외', () => {
  it('시주 null이면 제외', () => {
    expect(activePillars(saju)).toEqual(['year', 'month', 'day'])
  })
})

describe('hasData', () => {
  it('궁성은 항상 true, 데이터 있는 탭 true, 없는 탭 false', () => {
    expect(hasData(saju, 'gung_seong')).toBe(true)
    expect(hasData(saju, 'chung')).toBe(true)
    expect(hasData(saju, 'pa')).toBe(false)
    expect(hasData(saju, 'gong_mang')).toBe(true)
  })
})

describe('buildEntries', () => {
  it('지지충 — 자오충 엔트리, 해당 기둥 하이라이트', () => {
    const e = buildEntries(saju, 'chung')
    expect(e).toHaveLength(1)
    expect(e[0].text).toContain('자충오')
    expect(e[0].branches).toEqual(['year', 'month']) // 자=연지, 오=월지
  })
  it('육합 broken 플래그 (is_effective=false)', () => {
    const e = buildEntries(saju, 'yuk_hap')
    expect(e[0].broken).toBe(true)
    expect(e[0].resultEl).toBe('토')
  })
  it('공망 — affected_pillars 기반', () => {
    const e = buildEntries(saju, 'gong_mang')
    expect(e[0].text).toContain('일주 지지 신')
    expect(e[0].branches).toEqual(['day'])
  })
  it('궁성은 빈 엔트리(특수 탭)', () => {
    expect(buildEntries(saju, 'gung_seong')).toEqual([])
  })
})
