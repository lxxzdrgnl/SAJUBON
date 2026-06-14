import type { ApiClient } from './client'
import type {
  CompatibilityReportRequest,
  CompatibilityReportDetail,
  CompatibilityReportSummary,
  CompatibilityShareRequest,
  CompatibilityShareResponse,
} from './types'
import type { JobCreated } from './jobs'

/** POST /api/compatibility — 궁합 생성 job 등록. 202 { job_id } */
export function createCompatibilityJob(
  api: ApiClient,
  body: CompatibilityReportRequest,
): Promise<JobCreated> {
  return api.post<JobCreated>('/api/compatibility', body)
}

/** POST /api/compatibility/from-session/{id} — 세션 기반 궁합 생성 job. 202 */
export function createCompatibilityJobFromSession(
  api: ApiClient,
  sessionId: string,
): Promise<JobCreated> {
  return api.post<JobCreated>(`/api/compatibility/from-session/${sessionId}`)
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
