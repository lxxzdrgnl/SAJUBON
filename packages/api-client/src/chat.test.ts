import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './client'
import { listSessions, createSession, attachPartner } from './chat'

const mockFetch = vi.fn()
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
})

function makeApi() {
  return new ApiClient('http://localhost:8000')
}

describe('listSessions', () => {
  it('GET /api/chat/sessions 호출', async () => {
    const sessions = [{ id: 'abc', title: '상담', birth_info: {}, created_at: '', last_message_at: '' }]
    mockFetch.mockResolvedValue(new Response(JSON.stringify(sessions), { status: 200 }))
    const result = await listSessions(makeApi())
    expect(result).toHaveLength(1)
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/chat/sessions')
  })
})

describe('createSession', () => {
  it('POST /api/chat/session — profile_id 전달', async () => {
    const session = { id: 'xyz', title: null, birth_info: {}, created_at: '', last_message_at: '' }
    mockFetch.mockResolvedValue(new Response(JSON.stringify(session), { status: 200 }))
    const result = await createSession(makeApi(), { profile_id: 7 })
    expect(result.id).toBe('xyz')
    const [, init] = mockFetch.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ profile_id: 7 })
  })
})

describe('attachPartner', () => {
  it('POST /api/chat/{id}/partner', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ partner_name: '이순신' }), { status: 200 }))
    const result = await attachPartner(makeApi(), 'sess1', { profile_id: 3 })
    expect(result.partner_name).toBe('이순신')
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/chat/sess1/partner')
  })
})
