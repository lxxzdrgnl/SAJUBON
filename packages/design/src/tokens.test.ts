import { describe, it, expect } from 'vitest'
import { colors, ohaeng, ohaengTint, radius, shadow } from './tokens'

describe('design tokens', () => {
  it('비비드 캔디 핵심 팔레트 값 (docs/design.md §2.1)', () => {
    expect(colors.bgBase).toBe('#FFFBF2')
    expect(colors.ink).toBe('#1A1A1A')
    expect(colors.yellow).toBe('#FFD900')
    expect(colors.amber).toBe('#FFB200')
    expect(colors.orange).toBe('#FF6B00')
    expect(colors.teal).toBe('#00C2B8')
    expect(colors.tealDeep).toBe('#00857D')
  })

  it('오행 5색은 팔레트 파생값 (docs/design.md §2.2)', () => {
    expect(ohaeng.목).toBe('#00A86B')
    expect(ohaeng.화).toBe('#FF6B00')
    expect(ohaeng.토).toBe('#D9A400')
    expect(ohaeng.금).toBe('#7D7A70')
    expect(ohaeng.수).toBe('#0090A8')
    expect(Object.keys(ohaengTint)).toEqual(Object.keys(ohaeng))
  })

  it('브루탈 섀도와 radius 스케일', () => {
    expect(shadow.brutal).toBe('4px 4px 0 #1A1A1A')
    expect(radius.card).toBe('16px')
  })
})
