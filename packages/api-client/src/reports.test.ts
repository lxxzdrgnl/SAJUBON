import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './client'
import { createReport, listReports, getReport, shareReport, getSharedReport } from './reports'

const mockFetch = vi.fn()
beforeEach(() => { vi.stubGlobal('fetch', mockFetch); mockFetch.mockReset() })

const mockDetail = {
  id: 1,
  first_headline: '30대 중반, 바위 틈에서 물이 솟구치듯 재물이 터질 팔자',
  profile_name: '홍길동',
  request_topics: '이직 시기',
  created_at: '2026-06-13T00:00:00Z',
  birth_input: { birth_date: '1990-03-15', birth_time: '14:30', gender: 'male' as const },
  language: 'ko',
  tabs: [],
  year_flow: { year: 2026, first_half: '상반기 흐름', second_half: '하반기 흐름', months: [] },
  dae_un_analysis: {
    current: { ganji: '갑자', period: '현재 ~2026', text: '현재 대운 해설' },
    next: { ganji: '을축', period: '2027~2036', text: '다음 대운 해설' },
    caution: '주의점 1문단',
  },
}

describe('createReport', () => {
  it('POST /api/reports with body', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(mockDetail), { status: 201 }))
    const api = new ApiClient('http://x')
    const body = {
      birth_input: { birth_date: '1990-03-15', birth_time: null, gender: 'male' as const },
      request_topics: '이직 시기',
    }
    const r = await createReport(api, body)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://x/api/reports')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).request_topics).toBe('이직 시기')
    expect(r.id).toBe(1)
  })
})

describe('listReports', () => {
  it('GET /api/reports', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([mockDetail]), { status: 200 }))
    const api = new ApiClient('http://x')
    const r = await listReports(api)
    expect(mockFetch.mock.calls[0][0]).toBe('http://x/api/reports')
    expect(r[0].profile_name).toBe('홍길동')
  })
})

describe('getReport', () => {
  it('GET /api/reports/{id}', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(mockDetail), { status: 200 }))
    const api = new ApiClient('http://x')
    const r = await getReport(api, 1)
    expect(mockFetch.mock.calls[0][0]).toBe('http://x/api/reports/1')
    expect(r.language).toBe('ko')
  })
})

describe('shareReport', () => {
  it('POST /api/reports/{id}/share with mask_birth', async () => {
    mockFetch.mockResolvedValue(new Response(
      JSON.stringify({ share_token: 'abc-uuid', share_url: 'https://sajuguri.kr/share/report/abc-uuid' }),
      { status: 200 },
    ))
    const api = new ApiClient('http://x')
    const r = await shareReport(api, 1, true)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://x/api/reports/1/share')
    expect(JSON.parse(init.body).mask_birth).toBe(true)
    expect(r.share_token).toBe('abc-uuid')
  })
})

describe('getSharedReport', () => {
  it('GET /api/share/reports/{token}', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(mockDetail), { status: 200 }))
    const api = new ApiClient('http://x')
    const r = await getSharedReport(api, 'abc-uuid')
    expect(mockFetch.mock.calls[0][0]).toBe('http://x/api/share/reports/abc-uuid')
    expect(r.first_headline).toBe('30대 중반, 바위 틈에서 물이 솟구치듯 재물이 터질 팔자')
  })
})
