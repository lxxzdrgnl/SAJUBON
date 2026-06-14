import type { ApiClient } from './client'
import type { SajuCalcRequest, SajuCalcResponse } from './types'

/** POST /api/saju/calc — 만세력(사주 원국) 계산. */
export function calcSaju(api: ApiClient, body: SajuCalcRequest): Promise<SajuCalcResponse> {
  return api.post<SajuCalcResponse>('/api/saju/calc', body)
}
