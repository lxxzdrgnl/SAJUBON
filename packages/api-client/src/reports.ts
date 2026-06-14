import type { ApiClient } from './client'
import type { SajuCalcRequest } from './types'
import type { JobCreated } from './jobs'

// ── 공통 API 계약 타입 (plan §트랙B — 변경 금지) ──────────────────────────────

export interface ReportTab {
  category: string          // 짧은 태그 — "성격" | "재물" | ... | 요청 주제명
  headline: string          // 결론형 문장
  content: string           // 3~4문단 (비유→근거→조언, \n\n 구분)
  requested: boolean        // 사용자가 추가 요청한 주제 탭이면 true
}

export interface YearFlowMonth {
  month: number
  keyword: string
  memo: string
}

export interface YearFlow {
  year: number
  first_half: string        // 상반기 요약 2~3문장
  second_half: string
  months: YearFlowMonth[]   // 12개
}

export interface DaeUnAnalysis {
  current: { ganji: string; period: string; text: string }   // period 예: "현재 ~2026"
  next:    { ganji: string; period: string; text: string }
  caution: string           // 주의점 1문단
}

export interface ReportSummary {
  id: number
  first_headline: string
  profile_name: string      // birth_input.name
  request_topics: string | null
  created_at: string
}

export interface ReportDetail extends ReportSummary {
  birth_input: SajuCalcRequest      // mask 시 birth_date/birth_time null
  language: string
  tabs: ReportTab[]                 // 10개 + 요청 주제 수만큼
  year_flow: YearFlow
  dae_un_analysis: DaeUnAnalysis
  charts?: Record<string, unknown>  // 원국 차트 payload (palja·wuxing_balance·strength·ten_gods), 계산 실패 시 부재
}

export interface CreateReportBody {
  birth_input: SajuCalcRequest
  request_topics?: string
  profile_id?: number
  language?: string  // 생성 언어 ('ko' | 'en'), 기본 'ko'
}

export interface ShareReportResponse {
  share_token: string
  share_url: string
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/** POST /api/reports — 리포트 생성 job 등록 (로그인 필수). 202 { job_id } */
export function createReportJob(
  api: ApiClient,
  body: CreateReportBody,
): Promise<JobCreated> {
  return api.post<JobCreated>('/api/reports', body)
}

/** GET /api/reports — 내 리포트 목록 (로그인). */
export function listReports(api: ApiClient): Promise<ReportSummary[]> {
  return api.get<ReportSummary[]>('/api/reports')
}

/** GET /api/reports/{id} — 단건 조회 (소유자만). */
export function getReport(api: ApiClient, id: number): Promise<ReportDetail> {
  return api.get<ReportDetail>(`/api/reports/${id}`)
}

/** DELETE /api/reports/{id} — 리포트 삭제 (소유자). 204 No Content */
export function deleteReport(api: ApiClient, id: number): Promise<void> {
  return api.delete(`/api/reports/${id}`)
}

/** POST /api/reports/{id}/share — 공유 토큰 발급 (소유자). */
export function shareReport(
  api: ApiClient,
  id: number,
  maskBirth: boolean,
): Promise<ShareReportResponse> {
  return api.post<ShareReportResponse>(`/api/reports/${id}/share`, { mask_birth: maskBirth })
}

/** GET /api/share/reports/{token} — 비로그인 공개 열람. */
export function getSharedReport(
  api: ApiClient,
  token: string,
): Promise<ReportDetail> {
  return api.get<ReportDetail>(`/api/share/reports/${token}`)
}
