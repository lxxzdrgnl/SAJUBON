import type { ApiClient } from './client'
import type { SajuCalcRequest, SajuCalcResponse } from './types'

// ── 만세력 결과 공유 API (백엔드 backend/schemas/share.py 와 일치) ────────────────

/** POST /api/share 요청 — calc_snapshot 필수, profile_id(로그인) 또는 birth_input 중 하나. */
export interface ShareCreateBody {
  calc_snapshot: SajuCalcResponse
  profile_id?: number
  birth_input?: SajuCalcRequest
}

/** POST /api/share 응답. */
export interface ShareResponse {
  share_token: string
  share_url: string
  created_at: string
}

/** GET /api/share/{token} 응답 — 비로그인 공개 조회, 재계산 없음. */
export interface SharedResultResponse {
  share_token: string
  profile_id: number | null
  birth_input: SajuCalcRequest | null
  calc_snapshot: SajuCalcResponse
  created_at: string
}

/** POST /api/share — 만세력 결과 공유 링크 생성 (인증 선택). 201 ShareResponse */
export function createShare(api: ApiClient, body: ShareCreateBody): Promise<ShareResponse> {
  return api.post<ShareResponse>('/api/share', body)
}

/** GET /api/share/{token} — 공유된 만세력 결과 공개 조회 (인증 불필요). */
export function getSharedResult(api: ApiClient, token: string): Promise<SharedResultResponse> {
  return api.get<SharedResultResponse>(`/api/share/${token}`)
}
