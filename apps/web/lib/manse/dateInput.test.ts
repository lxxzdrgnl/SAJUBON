import { describe, expect, it } from 'vitest'
import {
  processSegInput,
  YEAR_SEG,
  MONTH_SEG,
  DAY_SEG,
  HOUR_SEG,
  MINUTE_SEG,
  shouldBackspaceToPrev,
  buildBirthDate,
  buildBirthTime,
  validateDate,
  validateTime,
} from './dateInput'

describe('processSegInput', () => {
  it('숫자가 아닌 문자를 제거하고 maxLen으로 자른다', () => {
    expect(processSegInput('1a9b9c9d9', YEAR_SEG).value).toBe('1999')
  })

  it('연도: 4자리 채우면 전진', () => {
    expect(processSegInput('2024', YEAR_SEG)).toEqual({ value: '2024', advance: true })
    expect(processSegInput('20', YEAR_SEG)).toEqual({ value: '20', advance: false })
  })

  it('월: maxVal 13 → 12로 클램핑', () => {
    expect(processSegInput('13', MONTH_SEG).value).toBe('12')
  })

  it('월: minVal 00 → 01로 클램핑', () => {
    expect(processSegInput('00', MONTH_SEG).value).toBe('01')
  })

  it('월: eagerThreshold 1 → "2" 한 자리에서 "02"로 패딩 후 전진', () => {
    expect(processSegInput('2', MONTH_SEG)).toEqual({ value: '02', advance: true })
  })

  it('월: "1" 한 자리는 전진 안 함 (10·11·12 가능성)', () => {
    expect(processSegInput('1', MONTH_SEG)).toEqual({ value: '1', advance: false })
  })

  it('일: padThreshold 3 → "4" 한 자리에서 "04" 패딩, 전진 없음', () => {
    expect(processSegInput('4', DAY_SEG)).toEqual({ value: '04', advance: false })
  })

  it('일: "3" 한 자리는 패딩 안 함 (30·31 가능성)', () => {
    expect(processSegInput('3', DAY_SEG)).toEqual({ value: '3', advance: false })
  })

  it('일: maxVal 32 → 31로 클램핑', () => {
    expect(processSegInput('32', DAY_SEG).value).toBe('31')
  })

  it('시: eagerThreshold 2 → "3" 한 자리에서 "03" 패딩 후 전진', () => {
    expect(processSegInput('3', HOUR_SEG)).toEqual({ value: '03', advance: true })
  })

  it('시: maxVal 24 → 23으로 클램핑', () => {
    expect(processSegInput('24', HOUR_SEG).value).toBe('23')
  })

  it('분: maxVal 60 → 59로 클램핑, nextFocus 없음', () => {
    expect(processSegInput('60', MINUTE_SEG)).toEqual({ value: '59', advance: true })
  })
})

describe('shouldBackspaceToPrev', () => {
  it('빈 칸에서 Backspace면 true', () => {
    expect(shouldBackspaceToPrev('Backspace', '')).toBe(true)
  })
  it('값이 있으면 false', () => {
    expect(shouldBackspaceToPrev('Backspace', '1')).toBe(false)
  })
  it('다른 키면 false', () => {
    expect(shouldBackspaceToPrev('a', '')).toBe(false)
  })
})

describe('buildBirthDate', () => {
  it('연 4자리 + 월·일 있으면 패딩하여 조립', () => {
    expect(buildBirthDate('2024', '3', '5')).toBe('2024-03-05')
  })
  it('연도 미완성이면 빈 문자열', () => {
    expect(buildBirthDate('202', '3', '5')).toBe('')
  })
  it('월·일 비면 빈 문자열', () => {
    expect(buildBirthDate('2024', '', '5')).toBe('')
  })
})

describe('buildBirthTime', () => {
  it('시·분 있으면 패딩하여 조립', () => {
    expect(buildBirthTime('9', '5')).toBe('09:05')
  })
  it('둘 다 비면 null', () => {
    expect(buildBirthTime('', '')).toBeNull()
  })
  it('하나만 있으면 null', () => {
    expect(buildBirthTime('9', '')).toBeNull()
  })
})

describe('validateDate', () => {
  it('미완성 입력은 에러 아님', () => {
    expect(validateDate('', '', '').code).toBeNull()
    expect(validateDate('202', '3', '5').code).toBeNull()
  })
  it('연도 범위 밖', () => {
    expect(validateDate('1899', '1', '1').code).toBe('yearRange')
    expect(validateDate('2101', '1', '1').code).toBe('yearRange')
  })
  it('2월 30일 → dayOverflow (28일까지)', () => {
    const r = validateDate('2023', '2', '30')
    expect(r.code).toBe('dayOverflow')
    expect(r.maxDay).toBe(28)
  })
  it('윤년 2월 29일은 OK', () => {
    expect(validateDate('2024', '2', '29').code).toBeNull()
  })
  it('윤년 아닌 2월 29일 → dayOverflow', () => {
    const r = validateDate('2023', '2', '29')
    expect(r.code).toBe('dayOverflow')
    expect(r.maxDay).toBe(28)
  })
  it('4월 31일 → dayOverflow (30일까지)', () => {
    const r = validateDate('2024', '4', '31')
    expect(r.code).toBe('dayOverflow')
    expect(r.maxDay).toBe(30)
  })
  it('정상 날짜는 null', () => {
    expect(validateDate('1990', '12', '25').code).toBeNull()
  })
})

describe('validateTime', () => {
  it('시간 모름이면 항상 null', () => {
    expect(validateTime('9', '', true)).toBeNull()
  })
  it('시만 있으면 minuteMissing', () => {
    expect(validateTime('9', '', false)).toBe('minuteMissing')
  })
  it('분만 있으면 hourMissing', () => {
    expect(validateTime('', '30', false)).toBe('hourMissing')
  })
  it('둘 다 있으면 null', () => {
    expect(validateTime('9', '30', false)).toBeNull()
  })
  it('둘 다 없으면 null', () => {
    expect(validateTime('', '', false)).toBeNull()
  })
})
