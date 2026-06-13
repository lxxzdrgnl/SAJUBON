import { describe, it, expect } from 'vitest'
import { maskEmail } from './mask'

describe('maskEmail', () => {
  it('긴 로컬파트는 앞 3글자만 남기고 마스킹', () => {
    expect(maskEmail('coop.plz.plz@gmail.com')).toBe('coo***@gmail.com')
  })

  it('짧은 로컬파트는 첫 글자만 남김', () => {
    expect(maskEmail('ab@x.com')).toBe('a***@x.com')
    expect(maskEmail('abc@x.com')).toBe('a***@x.com')
  })

  it('@ 없으면 원문 반환', () => {
    expect(maskEmail('notanemail')).toBe('notanemail')
  })

  it('빈 로컬파트는 원문 반환', () => {
    expect(maskEmail('@x.com')).toBe('@x.com')
  })
})
