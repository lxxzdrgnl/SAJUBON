/**
 * fetch ReadableStream 기반 SSE 파서 — EventSource 미사용 (RN 호환, G1).
 * AsyncIterable<T>로 이벤트를 순차 방출한다.
 *
 * 사용:
 *   const stream = parseSSEStream<ChatStreamEvent>(response)
 *   for await (const event of stream) { ... }
 */

/** SSE raw data: 라인을 연결한 문자열 → T 파싱 결과 or null (파싱 실패 시 스킵) */
export type SSEParser<T> = (data: string) => T | null

/** ChatStreamEvent — 공통 SSE/API 계약 (Phase 4 plan §공통 계약) */
export type ChatStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_result'; tool: string; payload: Record<string, unknown> }
  | { type: 'request_partner' }
  | { type: 'title'; title: string }
  | { type: 'done' }

/** 기본 파서: `data:` 라인을 JSON으로 파싱 → T 또는 null */
function defaultParser<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

/**
 * fetch Response 또는 ReadableStream<Uint8Array>로부터 SSE 이벤트를 파싱한다.
 *
 * SSE 스펙:
 *   - `data: <json>\n\n` 형식
 *   - 빈 줄이 이벤트 경계
 *   - 여러 `data:` 라인은 줄바꿈으로 연결 (배열은 이 구현에서 사용 안 함)
 */
export async function* parseSSEStream<T = ChatStreamEvent>(
  source: Response | ReadableStream<Uint8Array>,
  parser: SSEParser<T> = defaultParser,
): AsyncIterable<T> {
  const body = source instanceof Response ? source.body : source
  if (!body) return

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })

      // 이벤트 경계(\n\n) 기준으로 분할
      let boundary: number
      while ((boundary = buf.indexOf('\n\n')) !== -1) {
        const block = buf.slice(0, boundary)
        buf = buf.slice(boundary + 2)

        // block 내 data: 라인 추출 및 연결
        const dataLines: string[] = []
        for (const line of block.split('\n')) {
          if (line.startsWith('data: ')) {
            dataLines.push(line.slice(6))
          }
        }
        if (dataLines.length === 0) continue

        const data = dataLines.join('\n')
        const event = parser(data)
        if (event !== null) yield event
      }
    }
  } finally {
    reader.releaseLock()
  }
}
