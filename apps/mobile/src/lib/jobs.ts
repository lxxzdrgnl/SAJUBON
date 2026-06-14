import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getJob, type JobStatus } from '@sajuguri/api-client'
import { useAuth } from './auth/AuthContext'

// 폴링 간격 (ms)
const POLL_INTERVAL = 2500
// 최대 폴링 횟수 (~4분)
const MAX_POLLS = 96

export interface UseJobResult {
  status: JobStatus['status'] | null
  result_id: number | undefined
  error: string | undefined
  isTimeout: boolean
}

/**
 * useJob(jobId) — job 상태를 2.5초마다 폴링.
 * done/failed 시 자동 중단. ~4분(96 polls) 초과 시 isTimeout = true.
 */
export function useJob(jobId: number | null): UseJobResult {
  const { api } = useAuth()
  const pollCountRef = useRef(0)

  const query = useQuery<JobStatus, Error>({
    queryKey: ['job', jobId],
    queryFn: async () => {
      pollCountRef.current += 1
      return getJob(api, jobId!)
    },
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return POLL_INTERVAL
      if (data.status === 'done' || data.status === 'failed') return false
      if (pollCountRef.current >= MAX_POLLS) return false
      return POLL_INTERVAL
    },
    staleTime: 0,
    gcTime: 0,
  })

  const data = query.data
  const isTerminal = data?.status === 'done' || data?.status === 'failed'
  const isTimeout = !isTerminal && pollCountRef.current >= MAX_POLLS && jobId !== null && !!data

  return {
    status: data?.status ?? null,
    result_id: data?.result_id,
    error: data?.error,
    isTimeout,
  }
}
