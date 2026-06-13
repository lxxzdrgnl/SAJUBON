import { describe, expect, it } from 'vitest'
import {
  calcSolarCorrection,
  formatCorrection,
  SEOUL_CORRECTION,
  getSisi,
  formatMinutes,
  calcCorrectedPreview,
} from './solarCorrection'

describe('calcSolarCorrection', () => {
  it('서울 기준 -32분', () => {
    expect(calcSolarCorrection(126.97, 540)).toBe(SEOUL_CORRECTION)
  })
  it('도쿄(139.69, +540) 약 +19분', () => {
    expect(calcSolarCorrection(139.69, 540)).toBe(Math.round(139.69 * 4) - 540)
  })
})

describe('formatCorrection', () => {
  it('양수에 + 부호', () => {
    expect(formatCorrection(12)).toBe('+12')
  })
  it('음수는 그대로', () => {
    expect(formatCorrection(-32)).toBe('-32')
  })
})

describe('getSisi', () => {
  it('자정 직후는 자시', () => {
    expect(getSisi(0)?.key).toBe('ja')
  })
  it('23:40은 자시', () => {
    expect(getSisi(23 * 60 + 40)?.key).toBe('ja')
  })
  it('12:00은 오시', () => {
    expect(getSisi(12 * 60)?.key).toBe('o')
  })
  it('02:00은 축시', () => {
    expect(getSisi(2 * 60)?.key).toBe('chuk')
  })
  it('음수/초과 분도 wrap 처리', () => {
    expect(getSisi(-20)?.key).toBe('ja')
    expect(getSisi(1440 + 12 * 60)?.key).toBe('o')
  })
})

describe('formatMinutes', () => {
  it('분을 HH:MM', () => {
    expect(formatMinutes(9 * 60 + 5)).toBe('09:05')
  })
  it('자정 wrap', () => {
    expect(formatMinutes(-32)).toBe('23:28')
  })
})

describe('calcCorrectedPreview', () => {
  it('둘 다 비면 null', () => {
    expect(calcCorrectedPreview('', '', -32)).toBeNull()
  })
  it('12:00 + (-32) → 11:28 사시 (09:30~11:30 구간)', () => {
    const p = calcCorrectedPreview('12', '00', -32)
    expect(p?.applied).toBe('11:28')
    expect(p?.sisi?.key).toBe('sa')
    expect(p?.correction).toBe(-32)
  })

  it('12:00 보정 없음 → 12:00 오시', () => {
    expect(calcCorrectedPreview('12', '00', 0)?.sisi?.key).toBe('o')
  })
  it('시만 입력해도 분 0으로 계산', () => {
    const p = calcCorrectedPreview('12', '', -32)
    expect(p?.applied).toBe('11:28')
  })
})
