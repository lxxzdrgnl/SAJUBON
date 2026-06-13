import type { ApiClient } from './client'
import type {
  QuestionRequest,
  ConsultationResponse,
  ConsultationHistoryItem,
  ConsultationDetail,
  ToolChartItem,
} from './types'

export type {
  QuestionRequest,
  ConsultationResponse,
  ConsultationHistoryItem,
  ConsultationDetail,
  ToolChartItem,
}

export interface ShareConsultationResponse {
  share_token: string
  share_url: string
}

/**
 * POST /api/question — 한줄 상담 (게스트 허용).
 * 질문(10~200자) + birth 정보 → headline + content 반환.
 */
export function askQuestion(
  api: ApiClient,
  body: QuestionRequest,
): Promise<ConsultationResponse> {
  return api.post<ConsultationResponse>('/api/question', body)
}

/** GET /api/question/history — 내 상담 기록 (로그인). */
export function listConsultations(api: ApiClient): Promise<ConsultationHistoryItem[]> {
  return api.get<ConsultationHistoryItem[]>('/api/question/history')
}

/**
 * POST /api/question/{id}/share — 공유 토큰 발급 (소유자, 게스트 상담은 누구나).
 * 백엔드는 share_token만 반환 → share_url은 클라이언트에서 조립한다.
 */
export async function shareConsultation(
  api: ApiClient,
  id: number,
): Promise<ShareConsultationResponse> {
  const { share_token } = await api.post<{ share_token: string }>(`/api/question/${id}/share`)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return { share_token, share_url: `${origin}/share/question/${share_token}` }
}

/** GET /api/question/share/{token} — 비로그인 공개 열람. */
export function getSharedConsultation(
  api: ApiClient,
  token: string,
): Promise<ConsultationDetail> {
  return api.get<ConsultationDetail>(`/api/question/share/${token}`)
}

/** DELETE /api/question/{id} — 상담 기록 삭제 (소유자). 204 No Content */
export function deleteConsultation(api: ApiClient, id: number): Promise<void> {
  return api.delete(`/api/question/${id}`)
}
