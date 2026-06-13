import { describe, it, expect } from 'vitest'
import { parseSSEStream } from './sse'
import type { ChatStreamEvent } from './sse'

/** Uint8Array 스트림을 만드는 헬퍼 */
function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(ctrl) {
      for (const c of chunks) ctrl.enqueue(enc.encode(c))
      ctrl.close()
    },
  })
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = []
  for await (const item of iter) result.push(item)
  return result
}

describe('parseSSEStream', () => {
  it('단일 청크 — token 이벤트 파싱', async () => {
    const stream = makeStream(['data: {"type":"token","content":"안녕"}\n\n'])
    const events = await collect(parseSSEStream<ChatStreamEvent>(stream))
    expect(events).toEqual([{ type: 'token', content: '안녕' }])
  })

  it('연속 이벤트 — 한 청크에 여러 이벤트', async () => {
    const body =
      'data: {"type":"token","content":"A"}\n\n' +
      'data: {"type":"token","content":"B"}\n\n' +
      'data: {"type":"done"}\n\n'
    const stream = makeStream([body])
    const events = await collect(parseSSEStream<ChatStreamEvent>(stream))
    expect(events).toHaveLength(3)
    expect(events[0]).toEqual({ type: 'token', content: 'A' })
    expect(events[2]).toEqual({ type: 'done' })
  })

  it('분할 청크 — 이벤트 경계가 청크 경계와 불일치', async () => {
    // 첫 청크는 이벤트 경계 전에 끊김
    const part1 = 'data: {"type":"token","content":'
    const part2 = '"분할"}\n\ndata: {"type":"done"}\n\n'
    const stream = makeStream([part1, part2])
    const events = await collect(parseSSEStream<ChatStreamEvent>(stream))
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: 'token', content: '분할' })
  })

  it('tool_result 이벤트', async () => {
    const payload = JSON.stringify({
      type: 'tool_result',
      tool: 'get_dae_un',
      payload: { start_age: 10, ganji_name: '甲子' },
    })
    const stream = makeStream([`data: ${payload}\n\n`])
    const events = await collect(parseSSEStream<ChatStreamEvent>(stream))
    expect(events[0]).toMatchObject({ type: 'tool_result', tool: 'get_dae_un' })
  })

  it('request_partner 이벤트', async () => {
    const stream = makeStream(['data: {"type":"request_partner"}\n\n'])
    const events = await collect(parseSSEStream<ChatStreamEvent>(stream))
    expect(events[0]).toEqual({ type: 'request_partner' })
  })

  it('title 이벤트', async () => {
    const stream = makeStream(['data: {"type":"title","title":"3월 이직 타이밍 상담"}\n\n'])
    const events = await collect(parseSSEStream<ChatStreamEvent>(stream))
    expect(events[0]).toEqual({ type: 'title', title: '3월 이직 타이밍 상담' })
  })

  it('malformed JSON — 스킵 (크래시 없음)', async () => {
    const body =
      'data: NOT_JSON\n\n' +
      'data: {"type":"done"}\n\n'
    const stream = makeStream([body])
    const events = await collect(parseSSEStream<ChatStreamEvent>(stream))
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'done' })
  })

  it('빈 스트림 — 이벤트 없음', async () => {
    const stream = makeStream([])
    const events = await collect(parseSSEStream<ChatStreamEvent>(stream))
    expect(events).toHaveLength(0)
  })

  it('Response 객체 — body 스트림 위임', async () => {
    const body =
      'data: {"type":"token","content":"응답"}\n\n' +
      'data: {"type":"done"}\n\n'
    const enc = new TextEncoder()
    const response = new Response(enc.encode(body))
    const events = await collect(parseSSEStream<ChatStreamEvent>(response))
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: 'token', content: '응답' })
  })
})
