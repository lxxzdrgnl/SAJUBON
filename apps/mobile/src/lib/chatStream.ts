/**
 * chatStream — expo/fetch 기반 SSE 스트리밍 헬퍼.
 * RN의 global fetch는 Response.body가 null이므로 expo/fetch를 사용한다.
 * res.body(ReadableStream<Uint8Array>)를 parseSSEStream에 직접 전달 —
 * expo Response는 global Response instanceof 체크를 통과하지 못하므로
 * res 자체를 넘기지 않는다.
 */
import { fetch as expoFetch } from 'expo/fetch'
import { parseSSEStream, type ChatStreamEvent } from '@sajuguri/core'
import { getAccessToken } from '@/lib/auth/tokens'
import { API_BASE } from '@/lib/config'

export type { ChatStreamEvent }

export async function streamChat(
  sessionId: string,
  message: string,
  onEvent: (event: ChatStreamEvent) => void,
  onDone: () => void,
  onError: (err: unknown) => void,
): Promise<void> {
  let token: string | null = null
  try {
    token = await getAccessToken()
  } catch {
    // token 없으면 그냥 null — 서버에서 401 반환 시 onError로 처리
  }

  try {
    const res = await expoFetch(`${API_BASE}/api/chat/${sessionId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    })

    if (!res.ok) {
      onError(new Error(`HTTP ${res.status}`))
      return
    }

    // res.body (ReadableStream<Uint8Array>) 전달 — res 자체는 expo Response라서
    // parseSSEStream 내부의 `source instanceof Response` 체크를 통과 못함.
    for await (const event of parseSSEStream<ChatStreamEvent>(res.body as ReadableStream<Uint8Array>)) {
      onEvent(event)
      if (event.type === 'done') break
    }

    onDone()
  } catch (err) {
    onError(err)
  }
}
