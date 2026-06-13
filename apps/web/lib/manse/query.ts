import type { RecentBirthInput } from '@sajuguri/core'
import type { ProfileResponse } from '@sajuguri/api-client'

/**
 * /manse/result 페이지가 읽는 쿼리 입력 형태.
 * result 페이지는 birth_longitude/birth_utc_offset 키를 읽으므로,
 * 저장 프로필(longitude)을 직렬화할 때 이 이름으로 맞춘다.
 */
export interface ResultQueryInput {
  name?: string | null
  birth_date: string
  birth_time?: string | null
  gender: string
  calendar?: string
  is_leap_month?: boolean
  birth_longitude?: number | null
  birth_utc_offset?: number | null
  city?: string | null
}

/** 게스트 최근 입력·저장 프로필 공용 — null/undefined 키를 빼고 쿼리스트링으로 직렬화. */
export function toResultQuery(input: ResultQueryInput | RecentBirthInput): string {
  return new URLSearchParams(
    Object.entries(input)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString()
}

/** 저장 프로필 → result 쿼리 입력 (longitude → birth_longitude 매핑). */
/** "23:00:00"(초 포함) → "23:00". 엔진은 HH:MM만 받으므로 정규화. */
function normalizeTime(t: string | null): string | null {
  if (!t) return null
  const m = t.match(/^(\d{2}:\d{2})/)
  return m ? m[1] : t
}

export function profileToQueryInput(profile: ProfileResponse): ResultQueryInput {
  return {
    name: profile.name,
    birth_date: profile.birth_date,
    birth_time: normalizeTime(profile.birth_time),
    gender: profile.gender,
    calendar: profile.calendar,
    is_leap_month: profile.is_leap_month,
    birth_longitude: profile.longitude,
    city: profile.city,
  }
}
