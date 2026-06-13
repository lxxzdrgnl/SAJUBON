import type { ApiClient } from './client'
import type {
  CompatibilityReportRequest,
  CompatibilityReportDetail,
  CompatibilityReportSummary,
  CompatibilityShareRequest,
  CompatibilityShareResponse,
} from './types'

/** POST /api/compatibility — 궁합 리포트 생성+저장 (로그인 필수). 201 CompatibilityReportDetail */
export function createCompatibilityReport(
  api: ApiClient,
  body: CompatibilityReportRequest,
): Promise<CompatibilityReportDetail> {
  return api.post<CompatibilityReportDetail>('/api/compatibility', body)
}

/** POST /api/compatibility/from-session/{sessionId} — 챗 세션 두 사주로 궁합 리포트 생성 (소유자). 201 */
export function createCompatibilityFromSession(
  api: ApiClient,
  sessionId: string,
): Promise<CompatibilityReportDetail> {
  return api.post<CompatibilityReportDetail>(`/api/compatibility/from-session/${sessionId}`)
}

/** GET /api/compatibility — 내 궁합 리포트 목록 (로그인). */
export function listCompatibilityReports(
  api: ApiClient,
): Promise<CompatibilityReportSummary[]> {
  return api.get<CompatibilityReportSummary[]>('/api/compatibility')
}

/** GET /api/compatibility/{id} — 단건 조회 (소유자만). */
export function getCompatibilityReport(
  api: ApiClient,
  id: number,
): Promise<CompatibilityReportDetail> {
  return api.get<CompatibilityReportDetail>(`/api/compatibility/${id}`)
}

/** POST /api/compatibility/{id}/share — 공유 토큰 발급 (소유자). */
export function shareCompatibilityReport(
  api: ApiClient,
  id: number,
  body: CompatibilityShareRequest,
): Promise<CompatibilityShareResponse> {
  return api.post<CompatibilityShareResponse>(`/api/compatibility/${id}/share`, body)
}

/** GET /api/compatibility/shared/{token} — 비로그인 공개 열람. */
export function getSharedCompatibilityReport(
  api: ApiClient,
  token: string,
): Promise<CompatibilityReportDetail> {
  return api.get<CompatibilityReportDetail>(`/api/compatibility/shared/${token}`)
}
