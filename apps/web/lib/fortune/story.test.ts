import { describe, it, expect } from 'vitest'
import {
  calcSegmentFills,
  slideDirection,
  countUpValue,
  categoryColor,
  hexToRgba,
} from './story'

describe('calcSegmentFills', () => {
  it('카드 개수만큼 세그먼트를 반환한다', () => {
    expect(calcSegmentFills(5, 2)).toHaveLength(5)
  })

  it('현재 인덱스까지(포함) 꽉 차고 이후는 비어 있다', () => {
    expect(calcSegmentFills(4, 1)).toEqual([1, 1, 0, 0])
  })

  it('첫 카드는 첫 세그먼트만 채운다', () => {
    expect(calcSegmentFills(3, 0)).toEqual([1, 0, 0])
  })

  it('마지막 카드는 전부 채운다', () => {
    expect(calcSegmentFills(3, 2)).toEqual([1, 1, 1])
  })

  it('범위를 벗어난 인덱스는 클램프된다', () => {
    expect(calcSegmentFills(3, 99)).toEqual([1, 1, 1])
    expect(calcSegmentFills(3, -5)).toEqual([1, 0, 0])
  })

  it('total 0이면 빈 배열', () => {
    expect(calcSegmentFills(0, 0)).toEqual([])
  })
})

describe('slideDirection', () => {
  it('인덱스 증가는 next', () => {
    expect(slideDirection(0, 1)).toBe('next')
  })
  it('인덱스 감소는 prev', () => {
    expect(slideDirection(2, 1)).toBe('prev')
  })
  it('동일 인덱스는 none', () => {
    expect(slideDirection(1, 1)).toBe('none')
  })
})

describe('countUpValue', () => {
  it('progress 0이면 0', () => {
    expect(countUpValue(80, 0)).toBe(0)
  })
  it('progress 1이면 타깃', () => {
    expect(countUpValue(80, 1)).toBe(80)
  })
  it('중간 진행도는 0과 타깃 사이', () => {
    const v = countUpValue(100, 0.5)
    expect(v).toBeGreaterThan(0)
    expect(v).toBeLessThan(100)
  })
  it('progress를 0..1로 클램프한다', () => {
    expect(countUpValue(50, 2)).toBe(50)
    expect(countUpValue(50, -1)).toBe(0)
  })
})

describe('categoryColor', () => {
  it('알려진 카테고리는 hex를 반환한다', () => {
    expect(categoryColor('money')).toMatch(/^#[0-9a-fA-F]{6}$/)
  })
  it('undefined는 null', () => {
    expect(categoryColor(undefined)).toBeNull()
  })
  it('미지정 카테고리는 null', () => {
    expect(categoryColor('unknown')).toBeNull()
  })
})

describe('hexToRgba', () => {
  it('hex를 rgba로 변환한다', () => {
    expect(hexToRgba('#FF6B00', 0.5)).toBe('rgba(255,107,0,0.5)')
  })
  it('# 없는 입력도 처리한다', () => {
    expect(hexToRgba('00A86B', 1)).toBe('rgba(0,168,107,1)')
  })
  it('잘못된 입력은 폴백', () => {
    expect(hexToRgba('xyz', 0.3)).toBe('rgba(0,0,0,0.3)')
  })
})
