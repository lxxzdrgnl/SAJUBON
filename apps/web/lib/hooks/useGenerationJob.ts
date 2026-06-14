'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { getJob } from '@sajuguri/api-client'

export interface UseGenerationJob {
  loading: boolean
  error: boolean
  /** job_id를 받아 완료까지 폴링. 완료 시 onDone(jobType, resultId) 호출. */
  start: (jobId: number) => void
}

const POLL_MS = 2500
const MAX_TRIES = 96 // ≈ 4분

export function useGenerationJob(
  onDone: (jobType: string, resultId: number) => void,
): UseGenerationJob {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tries = useRef(0)

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  useEffect(() => clear, [clear])

  const start = useCallback(
    (jobId: number) => {
      setLoading(true)
      setError(false)
      tries.current = 0

      const poll = async () => {
        tries.current += 1
        try {
          const job = await getJob(api, jobId)
          if (job.status === 'done' && job.result_id != null) {
            clear()
            onDone(job.job_type, job.result_id)
            return
          }
          if (job.status === 'failed') {
            clear()
            setLoading(false)
            setError(true)
            return
          }
        } catch {
          // 일시 네트워크 오류는 무시하고 재시도
        }
        if (tries.current >= MAX_TRIES) {
          clear()
          setLoading(false)
          setError(true)
          return
        }
        timer.current = setTimeout(poll, POLL_MS)
      }

      poll()
    },
    [clear, onDone],
  )

  return { loading, error, start }
}
