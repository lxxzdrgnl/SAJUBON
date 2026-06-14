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

/** "23:00:00"(초 포함) → "23:00". 엔진은 HH:MM만 받으므로 정규화. */
function normalizeTime(t: string | null | undefined): string | null | undefined {
  if (!t) return t
  const m = t.match(/^(\d{2}:\d{2})/)
  return m ? m[1] : t
}

/**
 * 게스트 최근 입력·저장 프로필 공용 — null/undefined 키를 빼고 쿼리스트링으로 직렬화.
 * birth_time은 항상 HH:MM으로 정규화 (옛 최근 입력의 "23:00:00"이 API에서 422 나는 것 방지).
 */
export function toResultQuery(input: ResultQueryInput | RecentBirthInput): string {
  const normalized = { ...input, birth_time: normalizeTime(input.birth_time) }
  return new URLSearchParams(
    Object.entries(normalized)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString()
}

/** 저장 프로필 → result 쿼리 입력 (longitude → birth_longitude 매핑). */

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

/**
 * 만세력 내비게이션 소스 — 저장 프로필·게스트 최근 입력·채팅 세션 birth_info를 한 함수로 받기 위한 느슨한 타입.
 * profile_id가 있으면 저장 만세력, name이 있으면 이름(pname)으로도 직렬화된다.
 */
export type ManseNavSource =
  | (ResultQueryInput & { profile_id?: number })
  | RecentBirthInput
  | Record<string, unknown>

/** 저장 프로필 → 내비게이션 소스 (profile_id 포함). */
export function profileToManseSource(p: ProfileResponse): ResultQueryInput & { profile_id: number } {
  return { ...profileToQueryInput(p), profile_id: p.id }
}

/** birth 직렬화 대상 키 — 모든 만세력 진입 페이지가 읽는 출생 정보. */
const BIRTH_KEYS = [
  'birth_date',
  'birth_time',
  'gender',
  'calendar',
  'is_leap_month',
  'birth_longitude',
  'birth_utc_offset',
  'city',
] as const

/**
 * 만세력 소스(저장 프로필·게스트 최근·채팅 세션 birth_info) → 통합 내비게이션 쿼리.
 * - birth 필드를 직렬화(birth_time은 HH:MM 정규화), null/undefined/'' 는 제외.
 * - name이 있으면 name과 pname을 둘 다 설정 (일부 페이지는 name, 운세는 pname을 읽음).
 * - profile_id가 있으면 설정 (저장 만세력 → 리포트가 프로필에 연결되도록).
 * - 느슨한 타입을 안전하게 강제 변환 — birth_date/gender 없으면 '' 반환.
 */
export function manseNavQuery(src: ManseNavSource): string {
  const b = (src ?? {}) as Record<string, unknown>
  if (!b.birth_date || !b.gender) return ''

  const params = new URLSearchParams()
  for (const k of BIRTH_KEYS) {
    const v = k === 'birth_time' ? normalizeTime(b[k] as string | null | undefined) : b[k]
    if (v !== null && v !== undefined && v !== '') params.set(k, String(v))
  }

  const name = b.name
  if (name !== null && name !== undefined && name !== '') {
    params.set('name', String(name))
    params.set('pname', String(name))
  }

  const profileId = b.profile_id
  if (profileId !== null && profileId !== undefined && profileId !== '') {
    params.set('profile_id', String(profileId))
  }

  return params.toString()
}
