import { describe, it, expect } from 'vitest'
import { ohaengColor, ohaengTintColor } from './ohaeng'

describe('오행 색 매핑 (엔진 한글 오행명 → 토큰)', () => {
  it('5원소 + 미지정 폴백', () => {
    expect(ohaengColor('목')).toBe('#00A86B')
    expect(ohaengColor('수')).toBe('#0090A8')
    expect(ohaengColor('???')).toBe('#1A1A1A')      // 폴백 = 잉크
    expect(ohaengTintColor('화')).toBe('#FFF1E8')
    expect(ohaengTintColor('???')).toBe('#FFFFFF')  // 폴백 = surface
  })
})
