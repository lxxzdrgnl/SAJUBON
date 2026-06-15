import type { ApiClient } from './client'

/** GET /api/auth/me 응답 — backend/routers/auth.py get_me와 동기화 */
export interface MeResponse {
  id: number
  email: string
  /** 구글 프로필 닉네임 (소셜 로그인 시 저장). 없으면 null. */
  name: string | null
  role: string
  provider: string
}

/** 현재 로그인 유저. 비로그인(401) 등 실패 시 null. */
export async function getMe(api: ApiClient): Promise<MeResponse | null> {
  try {
    return await api.get<MeResponse>('/api/auth/me')
  } catch {
    return null // 401 = 비로그인
  }
}

/** 로그아웃 — 서버 refresh 토큰 폐기 + 쿠키 삭제. 이미 만료여도 무시. */
export async function logout(api: ApiClient): Promise<void> {
  try {
    await api.post('/api/auth/logout')
  } catch {
    /* 이미 만료/비로그인이어도 클라이언트는 진행 */
  }
}
