import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './client'
import {
  createCompatibilityJob,
  createCompatibilityJobFromSession,
  listCompatibilityReports,
  getCompatibilityReport,
  shareCompatibilityReport,
  getSharedCompatibilityReport,
} from './compatibility'
import type {
  CompatibilityReportDetail,
  CompatibilityReportSummary,
  CompatibilityShareResponse,
} from './types'

const mockFetch = vi.fn()
beforeEach(() => { vi.stubGlobal('fetch', mockFetch); mockFetch.mockReset() })

function makeApi() {
  return new ApiClient('http://localhost:8000')
}

const mockPersonA = {
  name: '이용재',
  birth_date: '1990-03-15',
  birth_time: '14:30',
  gender: 'male' as const,
  calendar: 'solar' as const,
  is_leap_month: false,
  birth_longitude: null,
  birth_utc_offset: null,
}

const mockPersonB = {
  name: '유다연',
  birth_date: '1992-07-21',
  birth_time: '09:00',
  gender: 'female' as const,
  calendar: 'solar' as const,
  is_leap_month: false,
  birth_longitude: null,
  birth_utc_offset: null,
}

const mockDetail: CompatibilityReportDetail = {
  id: 1,
  person_a: mockPersonA,
  person_b: mockPersonB,
  score: {
    total: 97,
    day_pillar: 90,
    element_harmony: 85,
    branch_relation: 80,
    ten_gods: 85,
  },
  synastry: {
    stem_hap: '수',
    day_ten_god: '정재',
    element_synergy: '상생',
    clash_pairs: [],
    complement_a_to_b: ['금'],
    complement_b_to_a: ['화'],
    yongsin_help: 'mutual',
    interaction_tags: ['정재', '상생', '천간합'],
  },
  tabs: [
    { category: '종합 케미', headline: '속도가 달라도 결국 한 방향', content: '...', requested: false },
  ],
  request_topics: '결혼 시기',
  language: 'ko',
  created_at: '2026-06-13T00:00:00Z',
}

const mockSummary: CompatibilityReportSummary = {
  id: 1,
  person_a_name: '이용재',
  person_b_name: '유다연',
  total_score: 97,
  request_topics: '결혼 시기',
  created_at: '2026-06-13T00:00:00Z',
}

describe('createCompatibilityJob', () => {
  it('POST /api/compatibility with body — 202 { job_id }', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ job_id: 3 }), { status: 202 }))
    const body = {
      person_a: mockPersonA,
      person_b: mockPersonB,
      request_topics: '결혼 시기',
    }
    const r = await createCompatibilityJob(makeApi(), body)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/api/compatibility')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).request_topics).toBe('결혼 시기')
    expect(r.job_id).toBe(3)
  })
})

describe('createCompatibilityJobFromSession', () => {
  it('POST /api/compatibility/from-session/{sessionId} — 202 { job_id }', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ job_id: 8 }), { status: 202 }))
    const r = await createCompatibilityJobFromSession(makeApi(), 'sess-uuid-123')
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/api/compatibility/from-session/sess-uuid-123')
    expect(init.method).toBe('POST')
    expect(r.job_id).toBe(8)
  })
})

describe('listCompatibilityReports', () => {
  it('GET /api/compatibility', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([mockSummary]), { status: 200 }))
    const r = await listCompatibilityReports(makeApi())
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/api/compatibility')
    expect(r).toHaveLength(1)
    expect(r[0].total_score).toBe(97)
  })
})

describe('getCompatibilityReport', () => {
  it('GET /api/compatibility/{id}', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(mockDetail), { status: 200 }))
    const r = await getCompatibilityReport(makeApi(), 1)
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/api/compatibility/1')
    expect(r.language).toBe('ko')
    expect(r.tabs[0].category).toBe('종합 케미')
  })
})

describe('shareCompatibilityReport', () => {
  it('POST /api/compatibility/{id}/share with mask_birth', async () => {
    const shareResp: CompatibilityShareResponse = {
      share_token: 'share-uuid-abc',
      share_url: 'https://sajuguri.kr/compatibility/shared/share-uuid-abc',
    }
    mockFetch.mockResolvedValue(new Response(JSON.stringify(shareResp), { status: 200 }))
    const r = await shareCompatibilityReport(makeApi(), 1, { mask_birth: true })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/api/compatibility/1/share')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).mask_birth).toBe(true)
    expect(r.share_token).toBe('share-uuid-abc')
  })
})

describe('getSharedCompatibilityReport', () => {
  it('GET /api/compatibility/shared/{token}', async () => {
    const maskedDetail = {
      ...mockDetail,
      person_a: { ...mockPersonA, birth_date: null, birth_time: null },
      person_b: { ...mockPersonB, birth_date: null, birth_time: null },
    }
    mockFetch.mockResolvedValue(new Response(JSON.stringify(maskedDetail), { status: 200 }))
    const r = await getSharedCompatibilityReport(makeApi(), 'share-uuid-abc')
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/api/compatibility/shared/share-uuid-abc')
    expect(r.person_a.birth_date).toBeNull()
    expect(r.score.total).toBe(97)
  })
})
