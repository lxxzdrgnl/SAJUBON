/**
 * 채팅 세션 API 클라이언트 — Phase 4 공통 SSE/API 계약.
 * SSE 파서는 @sajuguri/core (RN 재사용) — 여기선 fetch 스트림 반환만 담당.
 */
import type { ApiClient } from './client'
import type { ChatSession, ChatSessionCreate } from './types'

// ── 신규 타입 ────────────────────────────────────────────────────────────────

/** 세션 생성 응답 (백엔드 ChatSessionResponse) */
export type ChatSessionResponse = ChatSession

/** 상대방(궁합) 프로필 첨부 요청 */
export interface PartnerAttachRequest {
  profile_id?: number
  birth_date?: string
  birth_time?: string | null
  gender?: string
  calendar?: string
  is_leap_month?: boolean
  name?: string
}

/** 상대방 첨부 응답 */
export interface PartnerAttachResponse {
  partner_name: string
}

/** 메시지 전송 요청 */
export interface SendMessageRequest {
  message: string
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/** GET /api/chat/sessions — 내 채팅 세션 목록 */
export function listSessions(api: ApiClient): Promise<ChatSession[]> {
  return api.get<ChatSession[]>('/api/chat/sessions')
}

/** DELETE /api/chat/{session_id} — 세션 삭제 */
export function deleteSession(api: ApiClient, sessionId: string): Promise<void> {
  return api.delete(`/api/chat/${sessionId}`)
}

/** POST /api/chat/session — 세션 생성 */
export function createSession(
  api: ApiClient,
  body: ChatSessionCreate,
): Promise<ChatSessionResponse> {
  return api.post<ChatSessionResponse>('/api/chat/session', body)
}

/** GET /api/chat/{id}/history — 세션 메시지 히스토리 */
export function getHistory(
  api: ApiClient,
  sessionId: string,
): Promise<{ messages: import('./types').ChatMessage[] }> {
  return api.get(`/api/chat/${sessionId}/history`)
}

// ── 상대방 프로필 ─────────────────────────────────────────────────────────────

/** POST /api/chat/{id}/partner — 궁합 상대 만세력 첨부 */
export function attachPartner(
  api: ApiClient,
  sessionId: string,
  body: PartnerAttachRequest,
): Promise<PartnerAttachResponse> {
  return api.post<PartnerAttachResponse>(`/api/chat/${sessionId}/partner`, body)
}

/** DELETE /api/chat/{id}/partner — 상대 만세력 제거 (204 No Content) */
export async function detachPartner(_api: ApiClient, sessionId: string): Promise<void> {
  // ApiClient에 delete 메서드가 없어 직접 fetch — credentials: 'include' 동일하게 적용
  await fetch(`/api/chat/${sessionId}/partner`, {
    method: 'DELETE',
    credentials: 'include',
  })
}

// ── SSE 스트림 ───────────────────────────────────────────────────────────────

/**
 * POST /api/chat/{id}/message — 메시지 전송 → SSE Response 반환.
 * 파싱은 @sajuguri/core parseSSEStream을 사용한다 (fetch ReadableStream 기반).
 *
 * 클라이언트 컴포넌트에서:
 *   const res = await sendMessage(sessionId, message, token)
 *   for await (const event of parseSSEStream(res)) { ... }
 */
export async function sendMessage(
  sessionId: string,
  message: string,
  baseUrl: string = '',
  token?: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(`${baseUrl}/api/chat/${sessionId}/message`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ message } satisfies SendMessageRequest),
  })
}
