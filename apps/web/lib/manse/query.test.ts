import { describe, it, expect } from 'vitest'
import type { ProfileResponse } from '@sajuguri/api-client'
import { toResultQuery, profileToQueryInput } from './query'

describe('toResultQuery', () => {
  it('null/undefined/빈 문자열 키를 제외하고 직렬화', () => {
    const q = toResultQuery({
      name: '홍길동',
      birth_date: '1990-05-01',
      birth_time: null,
      gender: 'male',
      calendar: 'solar',
      is_leap_month: false,
      birth_longitude: undefined,
      city: '',
    })
    const params = new URLSearchParams(q)
    expect(params.get('name')).toBe('홍길동')
    expect(params.get('birth_date')).toBe('1990-05-01')
    expect(params.get('gender')).toBe('male')
    expect(params.has('birth_time')).toBe(false)
    expect(params.has('birth_longitude')).toBe(false)
    expect(params.has('city')).toBe(false)
  })

  it('boolean·number는 문자열로 직렬화', () => {
    const q = toResultQuery({
      birth_date: '2000-01-01',
      gender: 'female',
      is_leap_month: true,
      birth_longitude: 127.5,
    })
    const params = new URLSearchParams(q)
    expect(params.get('is_leap_month')).toBe('true')
    expect(params.get('birth_longitude')).toBe('127.5')
  })
})

describe('profileToQueryInput', () => {
  it('longitude를 birth_longitude로 매핑', () => {
    const profile: ProfileResponse = {
      id: 1,
      name: '김철수',
      birth_date: '1985-03-15',
      birth_time: '14:30',
      calendar: 'lunar',
      gender: 'male',
      is_leap_month: true,
      city: '서울',
      longitude: 126.97,
      is_representative: true,
      day_stem: '갑',
      day_branch: '자',
      day_stem_element: 'wood',
    }
    const input = profileToQueryInput(profile)
    expect(input.birth_longitude).toBe(126.97)
    expect(input.calendar).toBe('lunar')
    expect(input.is_leap_month).toBe(true)
    expect(input.city).toBe('서울')

    const params = new URLSearchParams(toResultQuery(input))
    expect(params.get('birth_longitude')).toBe('126.97')
    expect(params.has('longitude')).toBe(false)
  })

  it('birth_time 초 단위(23:00:00)를 HH:MM으로 정규화', () => {
    const profile: ProfileResponse = {
      id: 2, name: '이용재', birth_date: '2001-08-17', birth_time: '23:00:00',
      calendar: 'solar', gender: 'male', is_leap_month: false, city: null,
      longitude: null, is_representative: false,
      day_stem: '임', day_branch: '자', day_stem_element: 'water',
    }
    expect(profileToQueryInput(profile).birth_time).toBe('23:00')
  })

  it('longitude null이면 쿼리에서 제외', () => {
    const profile: ProfileResponse = {
      id: 2,
      name: '이영희',
      birth_date: '1992-07-20',
      birth_time: null,
      calendar: 'solar',
      gender: 'female',
      is_leap_month: false,
      city: null,
      longitude: null,
      is_representative: false,
      day_stem: null,
      day_branch: null,
      day_stem_element: null,
    }
    const params = new URLSearchParams(toResultQuery(profileToQueryInput(profile)))
    expect(params.has('birth_longitude')).toBe(false)
    expect(params.has('birth_time')).toBe(false)
    expect(params.has('city')).toBe(false)
  })
})
