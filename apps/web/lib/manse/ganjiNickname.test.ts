import { describe, it, expect } from 'vitest'
import { ganjiNickname, stemToMascotBody } from './ganjiNickname'

describe('ganjiNickname — 천간 색 + 지지 동물', () => {
  it('임자 = 회색 쥐, 배경 #8B8178', () => {
    const r = ganjiNickname('임', '자')
    expect(r.ko).toBe('회색 쥐')
    expect(r.en).toBe('Gray Rat')
    expect(r.bg).toBe('#8B8178')
  })

  it('갑인 = 푸른 호랑이, 배경 #7FC7BE', () => {
    const r = ganjiNickname('갑', '인')
    expect(r.ko).toBe('푸른 호랑이')
    expect(r.en).toBe('Blue Tiger')
    expect(r.bg).toBe('#7FC7BE')
  })

  it('병오 = 붉은 말, 배경 #EA6845', () => {
    const r = ganjiNickname('병', '오')
    expect(r.ko).toBe('붉은 말')
    expect(r.en).toBe('Red Horse')
    expect(r.bg).toBe('#EA6845')
  })

  it('무진 = 황금 용, 배경 #FFD900 (현행 옐로)', () => {
    const r = ganjiNickname('무', '진')
    expect(r.ko).toBe('황금 용')
    expect(r.bg).toBe('#FFD900')
  })

  it('경신 = 은빛 원숭이, 배경 #E8EAED', () => {
    const r = ganjiNickname('경', '신')
    expect(r.ko).toBe('은빛 원숭이')
    expect(r.en).toBe('Silver Monkey')
    expect(r.bg).toBe('#E8EAED')
  })

  it('계해 = 회색 돼지', () => {
    expect(ganjiNickname('계', '해').ko).toBe('회색 돼지')
  })

  it('12지지 동물 전수 — 자축인묘진사오미신유술해', () => {
    const expected: [string, string][] = [
      ['자', '쥐'], ['축', '소'], ['인', '호랑이'], ['묘', '토끼'],
      ['진', '용'], ['사', '뱀'], ['오', '말'], ['미', '양'],
      ['신', '원숭이'], ['유', '닭'], ['술', '개'], ['해', '돼지'],
    ]
    for (const [branch, animal] of expected) {
      expect(ganjiNickname('갑', branch).ko).toBe(`푸른 ${animal}`)
    }
  })

  it('미지의 간지는 빈 닉네임 + 폴백 배경', () => {
    const r = ganjiNickname('?', '?')
    expect(r.ko).toBe('')
    expect(r.en).toBe('')
    expect(r.bg).toBe('#FFD900')
  })
})

describe('stemToMascotBody — 너구리 몸통색 + 회색 보정', () => {
  it('무(황금) = 옐로, 비회색', () => {
    expect(stemToMascotBody('무')).toEqual({ color: '#FFD900', grey: false })
  })
  it('갑(푸른) = 그린', () => {
    expect(stemToMascotBody('갑')).toEqual({ color: '#7FC7BE', grey: false })
  })
  it('임(회색) = 웜그레이 + grey=true', () => {
    expect(stemToMascotBody('임')).toEqual({ color: '#8B8178', grey: true })
  })
  it('계(회색)도 동일 보정', () => {
    expect(stemToMascotBody('계')).toEqual({ color: '#8B8178', grey: true })
  })
  it('일간 미상(null/빈/미지) = 기본 옐로, 비회색', () => {
    expect(stemToMascotBody(null)).toEqual({ color: '#FFD900', grey: false })
    expect(stemToMascotBody(undefined)).toEqual({ color: '#FFD900', grey: false })
    expect(stemToMascotBody('')).toEqual({ color: '#FFD900', grey: false })
    expect(stemToMascotBody('?')).toEqual({ color: '#FFD900', grey: false })
  })
})
