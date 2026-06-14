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
import { getHistory, attachPartner, detachPartner, sendMessage as apiSendMessage } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import type { ChatMessage } from '@sajuguri/api-client'
import ToolCard from './ToolCard'
import AttachSheet from './AttachSheet'
import InlinePartnerCard from './InlinePartnerCard'
import CompatibilityReportCTA from './CompatibilityReportCTA'
import ChatNavCTA from './ChatNavCTA'
import Markdown from '@/components/ui/Markdown'

// 사주 풀 리포트로 안내할 사주분석 툴 집합
const REPORT_TOOLS = new Set([
  'get_palja',
  'get_wuxing_balance',
  'get_strength',
  'get_ten_gods',
  'get_sin_sal',
  'get_twelve_un_seong',
  'get_hap_chung',
])

// 운세 페이지로 안내할 운세 툴 집합
const FORTUNE_TOOLS = new Set([
  'get_daily_fortune',
  'get_yeon_un',
  'get_il_jin',
  'get_dae_un',
  'get_wol_un',
])

// ── 내부 메시지 타입 (ChatMessage 확장) ─────────────────────────────────────

interface ToolResultBlock {
  kind: 'tool_result'
  tool: string
  payload: Record<string, unknown>
}

interface InlinePartnerBlock {
  kind: 'inline_partner'
}

interface PartnerAttachedBlock {
  kind: 'partner_attached'
  name: string
}

type MessageBlock = string | ToolResultBlock | InlinePartnerBlock | PartnerAttachedBlock

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
  const [partnerChipExpanded, setPartnerChipExpanded] = useState(false)

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
        // 메시지를 순서대로 순회하며 DisplayMessage 목록을 구성한다.
        // tool 항목은 직전 ai 메시지의 blocks에 tool_result 블록으로 병합하고,
        // ai 텍스트는 같은 ai 메시지에 이어 붙인다.
        // 라이브 SSE 렌더 구조(tool_result blocks + text)와 동일한 형태가 된다.
        const converted: DisplayMessage[] = []
        for (const m of hist as ChatMessage[]) {
          if (m.role === 'human') {
            converted.push({ role: 'human', blocks: [m.content] })
          } else if (m.role === 'tool') {
            if (!m.tool || !m.payload) continue
            // 현재 진행 중인 ai 메시지가 없으면 새 ai 메시지 시작
            let last = converted[converted.length - 1]
            if (!last || last.role !== 'ai') {
              converted.push({ role: 'ai', blocks: [] })
              last = converted[converted.length - 1]
            }
            last.blocks = [...last.blocks, { kind: 'tool_result' as const, tool: m.tool, payload: m.payload }]
          } else if (m.role === 'ai') {
            // 현재 진행 중인 ai 메시지가 있으면 텍스트 block 추가, 없으면 새로 시작
            let last = converted[converted.length - 1]
            if (!last || last.role !== 'ai') {
              converted.push({ role: 'ai', blocks: [] })
              last = converted[converted.length - 1]
            }
            if (m.content) {
              last.blocks = [...last.blocks, m.content]
            }
          }
        }
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

  // 상대 만세력 첨부 후 인라인 메시지 추가 (공통 헬퍼)
  const appendPartnerAttachedMessages = useCallback(
    (name: string) => {
      // 인라인 카드 (Task 2) + 제안 메시지 (Task 1)
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai' as const,
          blocks: [{ kind: 'partner_attached' as const, name }],
        },
        {
          role: 'ai' as const,
          blocks: [t('partnerAttachedSuggestion', { name })],
        },
      ])
    },
    [t],
  )

  // 상대 만세력 첨부
  const handleAttachPartner = useCallback(
    async (p: ProfileResponse) => {
      try {
        const res = await attachPartner(api, sessionId, { profile_id: p.id })
        setPartnerName(res.partner_name)
        setAttachOpen(false)
        appendPartnerAttachedMessages(res.partner_name)
      } catch {
        /* silent */
      }
    },
    [sessionId, appendPartnerAttachedMessages],
  )

  // 상대 만세력 직접 입력 첨부 (생년월일 직접 입력)
  const handleAttachPartnerBirth = useCallback(
    async (body: import('@sajuguri/api-client').PartnerAttachRequest) => {
      const res = await attachPartner(api, sessionId, body)
      setPartnerName(res.partner_name)
      appendPartnerAttachedMessages(res.partner_name)
    },
    [sessionId, appendPartnerAttachedMessages],
  )

  // 상대 만세력 제거
  const handleDetachPartner = useCallback(async () => {
    try {
      await detachPartner(api, sessionId)
    } catch {
      /* silent — 로컬 상태는 어차피 지운다 */
    } finally {
      setPartnerName(null)
      setPartnerChipExpanded(false)
    }
  }, [sessionId])

  // textarea 자동 높이
  const autoResize = useCallback(() => {
    if (textRef.current) {
      textRef.current.style.height = 'auto'
      textRef.current.style.height = `${Math.min(textRef.current.scrollHeight, 120)}px`
    }
  }, [])

  // 마지막 check_compatibility tool_result 블록 위치 계산 (CTA 단일 렌더용)
  let lastCheckCompatIdx: { mi: number; bi: number } | null = null
  if (partnerName) {
    for (let mi = 0; mi < messages.length; mi++) {
      const msg = messages[mi]
      for (let bi = 0; bi < msg.blocks.length; bi++) {
        const blk = msg.blocks[bi]
        if (typeof blk !== 'string' && blk.kind === 'tool_result' && blk.tool === 'check_compatibility') {
          lastCheckCompatIdx = { mi, bi }
        }
      }
    }
  }

  // 마지막 사주분석 툴 / 운세 툴 블록 위치 계산 (각 CTA 단일 렌더용).
  // lastCheckCompatIdx와 동일하게 messages를 스캔해 마지막 매칭 블록 위치를 기록한다.
  let lastReportToolIdx: { mi: number; bi: number } | null = null
  let lastFortuneToolIdx: { mi: number; bi: number } | null = null
  for (let mi = 0; mi < messages.length; mi++) {
    const msg = messages[mi]
    for (let bi = 0; bi < msg.blocks.length; bi++) {
      const blk = msg.blocks[bi]
      if (typeof blk === 'string' || blk.kind !== 'tool_result') continue
      if (REPORT_TOOLS.has(blk.tool)) lastReportToolIdx = { mi, bi }
      else if (FORTUNE_TOOLS.has(blk.tool)) lastFortuneToolIdx = { mi, bi }
    }
  }

  // 같은 블록 위치에 두 개의 CTA가 겹치지 않도록 우선순위 적용: compat > report > fortune.
  const sameBlock = (
    a: { mi: number; bi: number } | null,
    b: { mi: number; bi: number } | null,
  ) => !!a && !!b && a.mi === b.mi && a.bi === b.bi
  if (sameBlock(lastReportToolIdx, lastCheckCompatIdx)) lastReportToolIdx = null
  if (sameBlock(lastFortuneToolIdx, lastCheckCompatIdx) || sameBlock(lastFortuneToolIdx, lastReportToolIdx)) {
    lastFortuneToolIdx = null
  }
  // 한 메시지에 사주분석 툴과 운세 툴이 모두 있으면(드묾) 풀 리포트 CTA만 노출한다.
  if (lastReportToolIdx && lastFortuneToolIdx && lastReportToolIdx.mi === lastFortuneToolIdx.mi) {
    lastFortuneToolIdx = null
  }

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
            <button
              type="button"
              onClick={() => setAttachOpen(true)}
              className="inline-flex items-center gap-1 rounded-[10px] border-2 border-teal bg-teal-tint px-2.5 py-1 text-xs font-extrabold text-teal-deep shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-70"
            >
              {t('chip.my')}
            </button>
          )}
          {partnerName && (
            <button
              type="button"
              onClick={() => setPartnerChipExpanded((v) => !v)}
              className="inline-flex items-center gap-1 rounded-[10px] border-2 border-ink bg-yellow-tint px-2.5 py-1 text-xs font-extrabold text-ink shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
              aria-label={t('chip.partnerToggle')}
            >
              {t('chip.partner')}: {partnerName}
              {partnerChipExpanded && (
                <span
                  role="button"
                  aria-label={t('chip.partnerRemove')}
                  onClick={(e) => { e.stopPropagation(); handleDetachPartner() }}
                  className="ml-1 flex h-4 w-4 items-center justify-center rounded-full border border-ink bg-ink text-[9px] font-black text-yellow leading-none"
                >
                  ✕
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 min-w-0 ${m.role === 'human' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* 블록들 */}
            <div className={`flex flex-col gap-2 min-w-0 max-w-[78%] ${m.role === 'human' ? 'items-end' : 'items-start'}`}>
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
                  if (m.role === 'human') {
                    return (
                      <div
                        key={bi}
                        className="rounded-2xl px-4 py-2.5 text-sm font-bold leading-relaxed whitespace-pre-wrap break-words border-2 border-ink bg-yellow text-ink shadow-[2px_2px_0_#1A1A1A]"
                      >
                        {block}
                      </div>
                    )
                  }
                  return (
                    <div
                      key={bi}
                      className="rounded-2xl px-4 py-2.5 text-sm font-medium leading-relaxed break-words border-2 border-teal bg-surface text-ink"
                    >
                      <Markdown>{block}</Markdown>
                    </div>
                  )
                }
                if (block.kind === 'tool_result') {
                  const isLastCompat = lastCheckCompatIdx?.mi === i && lastCheckCompatIdx?.bi === bi
                  const isLastReport = lastReportToolIdx?.mi === i && lastReportToolIdx?.bi === bi
                  const isLastFortune = lastFortuneToolIdx?.mi === i && lastFortuneToolIdx?.bi === bi
                  return (
                    <div key={bi} className="flex flex-col gap-2 w-full min-w-0">
                      <ToolCard tool={block.tool} payload={block.payload} />
                      {isLastCompat && (
                        <CompatibilityReportCTA sessionId={sessionId} />
                      )}
                      {isLastReport && (
                        <ChatNavCTA
                          title={t('reportCta.title')}
                          buttonLabel={t('reportCta.button')}
                          href="/report/new"
                        />
                      )}
                      {isLastFortune && (
                        <ChatNavCTA
                          title={t('fortuneCta.title')}
                          buttonLabel={t('fortuneCta.button')}
                          href="/fortune"
                        />
                      )}
                    </div>
                  )
                }
                if (block.kind === 'inline_partner') {
                  return (
                    <InlinePartnerCard
                      key={bi}
                      onSelect={handleAttachPartner}
                      onSubmitBirth={handleAttachPartnerBirth}
                      profiles={profiles}
                    />
                  )
                }
                if (block.kind === 'partner_attached') {
                  return (
                    <div
                      key={bi}
                      className="flex items-center gap-2 rounded-2xl border-2 border-ink bg-yellow-tint px-3 py-2.5 text-[13px] font-extrabold text-ink shadow-[2px_2px_0_#1A1A1A]"
                    >
                      <span className="text-base">📎</span>
                      <span>{t('partnerAttached', { name: block.name })}</span>
                    </div>
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
      <div className="shrink-0 border-t-2 border-ink pt-3 pb-1">
        <div className="flex items-center gap-2">
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
            className="flex-1 resize-none rounded-2xl border-2 border-ink bg-surface px-3 py-2 text-base text-ink outline-none"
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
        onSubmitPartnerBirth={async (body) => {
          await handleAttachPartnerBirth(body)
          setAttachOpen(false)
        }}
        sessionId={sessionId}
      />
    </div>
  )
}
