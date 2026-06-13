import { describe, it, expect } from 'vitest'
import { calcSolarCorrection, formatCorrection, SEOUL_CORRECTION } from './solar'

describe('진태양시 보정', () => {
  it('서울: round(126.97×4) − 540 = −32분', () => {
    expect(calcSolarCorrection(126.97, 540)).toBe(-32)
    expect(SEOUL_CORRECTION).toBe(-32)
  })
  it('formatCorrection — 부호 표기', () => {
    expect(formatCorrection(-32)).toBe('-32분')
    expect(formatCorrection(8)).toBe('+8분')
  })
})
