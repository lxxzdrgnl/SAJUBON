import type { ApiClient } from './client'

export interface JobCreated {
  job_id: number
}

export interface JobStatus {
  status: 'pending' | 'running' | 'done' | 'failed'
  job_type: 'saju_report' | 'compatibility'
  result_id?: number
  error?: string
}

/** GET /api/jobs/{id} — job 상태 폴링 (소유자). */
export function getJob(api: ApiClient, jobId: number): Promise<JobStatus> {
  return api.get<JobStatus>(`/api/jobs/${jobId}`)
}
