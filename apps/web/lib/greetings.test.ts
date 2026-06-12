import { describe, it, expect } from 'vitest'
import { slotForHour, pickGreeting } from './greetings'

describe('시간대별 인사말', () => {
  it('slotForHour 경계', () => {
    expect(slotForHour(0)).toBe('dawn')
    expect(slotForHour(4)).toBe('dawn')
    expect(slotForHour(5)).toBe('morning')
    expect(slotForHour(10)).toBe('morning')
    expect(slotForHour(11)).toBe('afternoon')
    expect(slotForHour(16)).toBe('afternoon')
    expect(slotForHour(17)).toBe('evening')
    expect(slotForHour(21)).toBe('evening')
    expect(slotForHour(22)).toBe('night')
    expect(slotForHour(23)).toBe('night')
  })

  it('이름 치환 + 존댓말 어미', () => {
    const g = pickGreeting('ko', '구리', 9, () => 0)
    expect(g).toBe('구리님, 오늘 기운 보러 갈까요?')
    expect(g).not.toContain('{name}')
  })

  it('rand에 따라 풀 내 다른 문구 선택', () => {
    const a = pickGreeting('ko', '구리', 14, () => 0)
    const b = pickGreeting('ko', '구리', 14, () => 0.99)
    expect(a).not.toBe(b)
  })

  it('en 로케일 동작', () => {
    expect(pickGreeting('en', 'Guri', 9, () => 0)).toContain('Guri')
  })
})
