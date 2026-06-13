'use client'

/**
 * 채팅 화면 클라이언트 컴포넌트 (B3/B4/B5 통합).
 * - 메시지 말풍선: 유저(옐로+잉크 보더, 우측) / AI(화이트+틸 보더+마스코트, 좌측)
 * - 하단 입력바: + 버튼 · 텍스트 입력 · 전송
 * - SSE: parseSSEStream 소비 → token 누적, tool_result 인라인 카드, request_partner 인라인, title 헤더 갱신
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { parseSSEStream } from '@sajuguri/core'
import type { ChatStreamEvent } from '@sajuguri/core'
import type { ProfileResponse } from '@sajuguri/api-client'
import { getHistory, attachPartner, sendMessage as apiSendMessage } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import type { ChatMessage } from '@sajuguri/api-client'
import ToolCard from './ToolCard'
import AttachSheet from './AttachSheet'
import InlinePartnerCard from './InlinePartnerCard'

// ── 내부 메시지 타입 (ChatMessage 확장) ─────────────────────────────────────

interface ToolResultBlock {
  kind: 'tool_result'
  tool: string
  payload: Record<string, unknown>
}

interface InlinePartnerBlock {
  kind: 'inline_partner'
}

type MessageBlock = string | ToolResultBlock | InlinePartnerBlock

interface DisplayMessage {
  role: 'human' | 'ai'
  /** 텍스트는 string, tool_result/request_partner는 블록 */
  blocks: MessageBlock[]
  /** 스트리밍 중인지 */
  streaming?: boolean
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

interface Props {
  sessionId: string
  initialTitle: string | null
  profiles: ProfileResponse[]
  partnerName?: string | null
}

export default function ChatView({ sessionId, initialTitle, profiles, partnerName: initialPartnerName }: Props) {
  const t = useTranslations('chat')
  const router = useRouter()

  const [title, setTitle] = useState(initialTitle)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [partnerName, setPartnerName] = useState(initialPartnerName ?? null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLTextAreaElement | null>(null)

  // 스크롤 하단
  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [])

  // 히스토리 로드
  useEffect(() => {
    getHistory(api, sessionId)
      .then(({ messages: hist }) => {
        const converted: DisplayMessage[] = hist.map((m: ChatMessage) => ({
          role: m.role,
          blocks: [m.content],
        }))
        setMessages(converted)
        setHistoryLoaded(true)
      })
      .catch(() => {
        setHistoryLoaded(true)
      })
  }, [sessionId])

  useEffect(() => {
    if (historyLoaded) scrollBottom()
  }, [historyLoaded, scrollBottom])

  // SSE 전송
  const send = useCallback(async () => {
    const msg = input.trim()
    if (!msg || streaming) return
    setInput('')
    setErrorMsg(null)

    // 유저 말풍선 추가
    setMessages((prev) => [...prev, { role: 'human', blocks: [msg] }])
    // AI 빈 말풍선 (스트리밍 자리)
    setMessages((prev) => [...prev, { role: 'ai', blocks: [''], streaming: true }])
    setStreaming(true)
    scrollBottom()

    try {
      const res = await apiSendMessage(sessionId, msg)
      if (!res.ok) throw new Error('send_failed')

      for await (const event of parseSSEStream<ChatStreamEvent>(res)) {
        if (event.type === 'token') {
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last?.role === 'ai') {
              const blocks = [...last.blocks]
              const lastBlock = blocks[blocks.length - 1]
              if (typeof lastBlock === 'string') {
                blocks[blocks.length - 1] = lastBlock + event.content
              } else {
                blocks.push(event.content)
              }
              next[next.length - 1] = { ...last, blocks }
            }
            return next
          })
          scrollBottom()
        } else if (event.type === 'tool_result') {
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last?.role === 'ai') {
              const blocks = [...last.blocks, { kind: 'tool_result' as const, tool: event.tool, payload: event.payload }]
              next[next.length - 1] = { ...last, blocks }
            }
            return next
          })
          scrollBottom()
        } else if (event.type === 'request_partner') {
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last?.role === 'ai') {
              const blocks = [...last.blocks, { kind: 'inline_partner' as const }]
              next[next.length - 1] = { ...last, blocks }
            }
            return next
          })
          scrollBottom()
        } else if (event.type === 'title') {
          setTitle(event.title)
        }
        // done 이벤트: 루프가 끝나면 자연스럽게 처리됨
      }
    } catch {
      setErrorMsg(t('error.send'))
      // 마지막 AI 말풍선이 비어있으면 제거
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'ai' && last.blocks.length === 1 && last.blocks[0] === '') {
          return next.slice(0, -1)
        }
        return next
      })
    } finally {
      setStreaming(false)
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'ai') {
          next[next.length - 1] = { ...last, streaming: false }
        }
        return next
      })
      scrollBottom()
    }
  }, [input, streaming, sessionId, t, scrollBottom])

  // Enter 전송 (Shift+Enter는 줄바꿈)
  const handleKeydown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        send()
      }
    },
    [send],
  )

  // 상대 만세력 첨부
  const handleAttachPartner = useCallback(
    async (p: ProfileResponse) => {
      try {
        const res = await attachPartner(api, sessionId, { profile_id: p.id })
        setPartnerName(res.partner_name)
        setAttachOpen(false)
      } catch {
        /* silent */
      }
    },
    [sessionId],
  )

  // textarea 자동 높이
  const autoResize = useCallback(() => {
    if (textRef.current) {
      textRef.current.style.height = 'auto'
      textRef.current.style.height = `${Math.min(textRef.current.scrollHeight, 120)}px`
    }
  }, [])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 116px)' }}>
      {/* 헤더 */}
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-border-soft pb-3">
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-70"
          onClick={() => router.push('/chat')}
          aria-label="back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="truncate text-[16px] font-extrabold text-ink">
          {title || t('sessionFallback')}
        </h1>
      </div>

      {/* 첨부 칩 줄 */}
      {(profiles.length > 0 || partnerName) && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border-soft py-2">
          {profiles.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-[10px] border-2 border-teal bg-teal-tint px-2.5 py-1 text-xs font-extrabold text-teal-deep shadow-[2px_2px_0_#1A1A1A]">
              {t('chip.my')}
            </span>
          )}
          {partnerName && (
            <span className="inline-flex items-center gap-1 rounded-[10px] border-2 border-ink bg-yellow-tint px-2.5 py-1 text-xs font-extrabold text-ink shadow-[2px_2px_0_#1A1A1A]">
              {t('chip.partner')}: {partnerName}
            </span>
          )}
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.role === 'human' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* AI 아바타 */}
            {m.role === 'ai' && (
              <div className="shrink-0 mt-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mascot.svg" alt="" width={28} height={28} className="rounded-full border border-border-soft" />
              </div>
            )}

            {/* 블록들 */}
            <div className={`flex flex-col gap-2 max-w-[78%] ${m.role === 'human' ? 'items-end' : 'items-start'}`}>
              {m.blocks.map((block, bi) => {
                if (typeof block === 'string') {
                  if (!block && m.streaming) {
                    return (
                      <div
                        key={bi}
                        className="rounded-2xl border-2 border-teal bg-surface px-4 py-2.5 text-sm leading-relaxed text-ink"
                      >
                        <span className="inline-block animate-pulse">▋</span>
                      </div>
                    )
                  }
                  if (!block) return null
                  return (
                    <div
                      key={bi}
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === 'human'
                          ? 'border-2 border-ink bg-yellow text-ink shadow-[2px_2px_0_#1A1A1A]'
                          : 'border-2 border-teal bg-surface text-ink'
                      }`}
                    >
                      {block}
                    </div>
                  )
                }
                if (block.kind === 'tool_result') {
                  return <ToolCard key={bi} tool={block.tool} payload={block.payload} />
                }
                if (block.kind === 'inline_partner') {
                  return (
                    <InlinePartnerCard
                      key={bi}
                      onSelect={handleAttachPartner}
                      profiles={profiles}
                    />
                  )
                }
                return null
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 오류 메시지 */}
      {errorMsg && (
        <div className="shrink-0 px-4 py-1.5 text-xs font-semibold text-orange-500">
          {errorMsg}
        </div>
      )}

      {/* 입력바 */}
      <div className="shrink-0 border-t-2 border-border-soft pt-3 pb-1">
        <div className="flex items-end gap-2">
          {/* + 첨부 버튼 */}
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface text-lg font-extrabold shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-70"
            onClick={() => setAttachOpen(true)}
            aria-label={t('attach.title')}
          >
            +
          </button>

          {/* 텍스트 입력 */}
          <textarea
            ref={textRef}
            className="flex-1 resize-none rounded-2xl border-2 border-border-soft bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ink"
            rows={1}
            placeholder={t('input.placeholder')}
            value={input}
            disabled={streaming}
            onChange={(e) => { setInput(e.target.value); autoResize() }}
            onKeyDown={handleKeydown}
          />

          {/* 전송 버튼 */}
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-orange text-surface shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80 disabled:opacity-40"
            disabled={streaming || !input.trim()}
            onClick={send}
            aria-label={t('input.send')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 첨부 시트 */}
      <AttachSheet
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        profiles={profiles}
        onAttachPartner={handleAttachPartner}
        sessionId={sessionId}
      />
    </div>
  )
}
