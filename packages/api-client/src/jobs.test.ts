import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './client'
import { getJob } from './jobs'

const mockFetch = vi.fn()
beforeEach(() => { vi.stubGlobal('fetch', mockFetch); mockFetch.mockReset() })

describe('getJob', () => {
  it('GET /api/jobs/{id} — returns JobStatus', async () => {
    const mockStatus = { status: 'done', job_type: 'saju_report', result_id: 42 }
    mockFetch.mockResolvedValue(new Response(JSON.stringify(mockStatus), { status: 200 }))
    const api = new ApiClient('http://x')
    const r = await getJob(api, 5)
    expect(mockFetch.mock.calls[0][0]).toBe('http://x/api/jobs/5')
    expect(r.status).toBe('done')
    expect(r.result_id).toBe(42)
  })

  it('GET /api/jobs/{id} — pending job (no result_id)', async () => {
    const mockStatus = { status: 'pending', job_type: 'compatibility' }
    mockFetch.mockResolvedValue(new Response(JSON.stringify(mockStatus), { status: 200 }))
    const api = new ApiClient('http://x')
    const r = await getJob(api, 99)
    expect(mockFetch.mock.calls[0][0]).toBe('http://x/api/jobs/99')
    expect(r.status).toBe('pending')
    expect(r.result_id).toBeUndefined()
  })
})
