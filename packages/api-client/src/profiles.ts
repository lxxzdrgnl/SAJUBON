import type { ApiClient } from './client'
import type { ProfileResponse } from './types'

/**
 * POST /api/profiles 요청 — backend schemas/profile.py ProfileCreate와 동기화.
 * SajuCalcRequest와 다르다: 저장은 longitude(진태양시)·is_leap_month를 쓰고
 * birth_utc_offset/birth_longitude는 받지 않는다.
 */
export interface ProfileCreateRequest {
  name: string
  birth_date: string // 'YYYY-MM-DD'
  birth_time?: string | null // 'HH:MM' | null
  calendar?: 'solar' | 'lunar'
  gender: 'male' | 'female'
  is_leap_month?: boolean
  city?: string | null
  longitude?: number | null
}

/** GET /api/profiles — 내 저장 만세력 목록 (대표 우선, 최신순). */
export function listProfiles(api: ApiClient): Promise<ProfileResponse[]> {
  return api.get<ProfileResponse[]>('/api/profiles')
}

/** POST /api/profiles — 만세력 저장. */
export function createProfile(
  api: ApiClient,
  body: ProfileCreateRequest,
): Promise<ProfileResponse> {
  return api.post<ProfileResponse>('/api/profiles', body)
}

/** PATCH /api/profiles/{id}/representative — 대표 만세력 설정. */
export function setRepresentative(api: ApiClient, id: number): Promise<ProfileResponse> {
  return api.patch<ProfileResponse>(`/api/profiles/${id}/representative`)
}

/** DELETE /api/profiles/{id} — 만세력 삭제. */
export function deleteProfile(api: ApiClient, id: number): Promise<void> {
  return api.delete(`/api/profiles/${id}`)
}
