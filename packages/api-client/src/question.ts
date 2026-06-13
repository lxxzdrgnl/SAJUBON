import type { ApiClient } from './client'
import type { SajuCalcRequest, QuestionRequest, ConsultationResponse } from './types'

export type { QuestionRequest, ConsultationResponse }

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
