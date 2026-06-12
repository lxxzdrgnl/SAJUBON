import { describe, it, expect } from 'vitest'
import { colors, ohaeng, ohaengTint, radius, shadow, toCssVariables } from './tokens'

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

  it('toCssVariables — colors를 kebab-case CSS 변수 :root 블록으로 변환', () => {
    const css = toCssVariables()
    expect(css).toMatch(/^:root \{/)
    expect(css).toContain('--bg-base: #FFFBF2;')
    expect(css).toContain('--teal-deep: #00857D;')
    expect(css).toContain('--border-soft: #EBE3D2;')
  })

  it('apps/web globals.css가 토큰 값과 드리프트하지 않는다', async () => {
    const { readFile } = await import('node:fs/promises')
    const css = await readFile(
      new URL('../../../apps/web/app/globals.css', import.meta.url),
      'utf8',
    )
    for (const [name, value] of Object.entries(colors)) {
      const kebab = name.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
      expect(css, `globals.css에 --${kebab} 선언 누락/불일치`).toContain(`--${kebab}: ${value};`)
      expect(css, `globals.css @theme에 --color-${kebab} 매핑 누락`).toContain(`--color-${kebab}: var(--${kebab});`)
    }
  })
})
