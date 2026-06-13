import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './client'
import { searchCities } from './cities'

const mockFetch = vi.fn()
beforeEach(() => { vi.stubGlobal('fetch', mockFetch); mockFetch.mockReset() })

describe('searchCities', () => {
  it('백엔드 응답을 CityOption으로 매핑', async () => {
    mockFetch.mockImplementation(() => new Response(JSON.stringify([{
      label: '서울', sublabel: 'Seoul, KR', longitude: 126.97,
      utc_offset: 540, timezone: 'Asia/Seoul', is_korea: true,
    }]), { status: 200 }))
    const api = new ApiClient('http://localhost:8000')
    const r = await searchCities(api, '서울')
    expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:8000/api/cities?q=%EC%84%9C%EC%9A%B8')
    expect(r[0]).toEqual({
      label: '서울', sublabel: 'Seoul, KR', longitude: 126.97,
      utcOffset: 540, timezone: 'Asia/Seoul', isKorea: true,
    })
  })
  it('빈 질의 → 호출 없이 []', async () => {
    const api = new ApiClient('http://x')
    expect(await searchCities(api, '  ')).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })
  it('API 오류 → [] (폼이 죽지 않게)', async () => {
    mockFetch.mockImplementation(() => new Response('{}', { status: 500 }))
    const api = new ApiClient('http://x')
    expect(await searchCities(api, '서울')).toEqual([])
  })
})
