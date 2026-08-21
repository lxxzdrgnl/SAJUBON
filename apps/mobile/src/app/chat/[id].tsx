/**
 * 채팅 대화 화면 — /chat/[id]
 * - getHistory로 기존 메시지 로드
 * - 메시지 목록 렌더 (유저=노란 우측, AI=틸 좌측+마스코트)
 * - 입력바 + 전송 → streamChat으로 SSE 스트리밍
 * - 스트리밍 중 AI 말풍선 실시간 업데이트
 * - 자동 스크롤
 * - 리포트/운세 도구 사용 후 CTA 카드 표시
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getHistory } from '@sajuguri/api-client'
import type { ChatMessage } from '@sajuguri/api-client'
import { useAuth } from '@/lib/auth/AuthContext'
import { streamChat } from '@/lib/chatStream'
import { MessageBubble, type DisplayMessage, type MessageBlock } from '@/components/chat/MessageBubble'
import { ChatInputBar } from '@/components/chat/ChatInputBar'
import { Button } from '@/components/ui/Button'

// ── 도구 집합 ───────────────────────────────────────────────────────────────

const REPORT_TOOLS = new Set([
  'get_palja',
  'get_wuxing_balance',
  'get_strength',
  'get_ten_gods',
  'get_sin_sal',
  'get_twelve_un_seong',
  'get_hap_chung',
])

const FORTUNE_TOOLS = new Set([
  'get_daily_fortune',
  'get_yeon_un',
  'get_il_jin',
  'get_dae_un',
  'get_wol_un',
])

// ── CTA 컴포넌트 ─────────────────────────────────────────────────────────────

function ChatNavCTA({ title, buttonLabel, onPress }: { title: string; buttonLabel: string; onPress: () => void }) {
  return (
    <View style={{ borderRadius: 16, borderWidth: 2, borderColor: '#00A878', backgroundColor: '#E8F7F2', padding: 12, gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', lineHeight: 19 }}>{title}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          borderRadius: 10, borderWidth: 2, borderColor: '#00A878',
          backgroundColor: pressed ? '#00A878' : '#FFFFFF',
          paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start',
        })}
      >
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#00A878' }}>{buttonLabel}</Text>
      </Pressable>
    </View>
  )
}

// ── CTA 인덱스 계산 ──────────────────────────────────────────────────────────

interface CtaIdx {
  mi: number   // messages 배열 인덱스
  bi: number   // blocks 배열 인덱스 (마지막 tool_result 위치)
}

function computeCtaIndexes(messages: DisplayMessage[]): {
  lastReportToolMi: number | null
  lastFortuneToolMi: number | null
} {
  let lastReport: CtaIdx | null = null
  let lastFortune: CtaIdx | null = null

  for (let mi = 0; mi < messages.length; mi++) {
    const msg = messages[mi]
    if (msg.role !== 'ai') continue
    for (let bi = 0; bi < msg.blocks.length; bi++) {
      const block = msg.blocks[bi]
      if (typeof block === 'string') continue
      if (block.kind !== 'tool_result') continue
      if (REPORT_TOOLS.has(block.tool)) {
        lastReport = { mi, bi }
      } else if (FORTUNE_TOOLS.has(block.tool)) {
        lastFortune = { mi, bi }
      }
    }
  }

  if (lastReport === null && lastFortune === null) {
    return { lastReportToolMi: null, lastFortuneToolMi: null }
  }

  // 같은 메시지(또는 같은 블록)이면 fortune 억제, report 우선
  if (lastReport !== null && lastFortune !== null && lastReport.mi === lastFortune.mi) {
    return { lastReportToolMi: lastReport.mi, lastFortuneToolMi: null }
  }

  return {
    lastReportToolMi: lastReport?.mi ?? null,
    lastFortuneToolMi: lastFortune?.mi ?? null,
  }
}

// ── 히스토리 → DisplayMessage 변환 ─────────────────────────────────────────

function convertHistory(hist: ChatMessage[]): DisplayMessage[] {
  const result: DisplayMessage[] = []
  for (const m of hist) {
    if (m.role === 'human') {
      result.push({ role: 'human', blocks: [m.content] })
    } else if (m.role === 'tool') {
      if (!m.tool || !m.payload) continue
      let last = result[result.length - 1]
      if (!last || last.role !== 'ai') {
        result.push({ role: 'ai', blocks: [] })
        last = result[result.length - 1]
      }
      last.blocks = [
        ...last.blocks,
        { kind: 'tool_result' as const, tool: m.tool, payload: m.payload },
      ]
    } else if (m.role === 'ai') {
      let last = result[result.length - 1]
      if (!last || last.role !== 'ai') {
        result.push({ role: 'ai', blocks: [] })
        last = result[result.length - 1]
      }
      if (m.content) {
        last.blocks = [...last.blocks, m.content]
      }
    }
  }
  return result
}

// ── 메인 화면 ──────────────────────────────────────────────────────────────

export default function ChatDetailScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id: sessionId } = useLocalSearchParams<{ id: string }>()
  const { api, status, login } = useAuth()

  const [title, setTitle] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const flatListRef = useRef<FlatList<DisplayMessage>>(null)

  // 스크롤 맨 아래로
  const scrollBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true })
  }, [])

  // 히스토리 로드
  useEffect(() => {
    if (!sessionId || status !== 'authed') return
    getHistory(api, sessionId)
      .then(({ messages: hist }) => {
        setMessages(convertHistory(hist as ChatMessage[]))
        setHistoryLoaded(true)
      })
      .catch(() => {
        setHistoryLoaded(true)
      })
  }, [sessionId, api, status])

  // 히스토리 로드 완료 후 스크롤
  useEffect(() => {
    if (historyLoaded) {
      setTimeout(scrollBottom, 100)
    }
  }, [historyLoaded, scrollBottom])

  // 메시지 전송 + 스트리밍
  const handleSend = useCallback(async () => {
    const msg = input.trim()
    if (!msg || streaming || !sessionId) return
    setInput('')

    // 유저 말풍선 추가
    setMessages((prev) => [...prev, { role: 'human', blocks: [msg] }])
    // AI 빈 말풍선 (스트리밍 자리)
    setMessages((prev) => [...prev, { role: 'ai', blocks: [''], streaming: true }])
    setStreaming(true)
    setTimeout(scrollBottom, 50)

    await streamChat(
      sessionId,
      msg,
      // onEvent
      (event) => {
        if (event.type === 'token') {
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last?.role === 'ai') {
              const blocks: MessageBlock[] = [...last.blocks]
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
          setTimeout(scrollBottom, 10)
        } else if (event.type === 'tool_result') {
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last?.role === 'ai') {
              const blocks: MessageBlock[] = [
                ...last.blocks,
                { kind: 'tool_result' as const, tool: event.tool, payload: event.payload },
              ]
              next[next.length - 1] = { ...last, blocks }
            }
            return next
          })
          setTimeout(scrollBottom, 10)
        } else if (event.type === 'title') {
          setTitle(event.title)
        }
        // request_partner, done — MVP에서는 별도 처리 없음
      },
      // onDone
      () => {
        setStreaming(false)
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'ai') {
            // 빈 블록이면 제거
            const filtered = last.blocks.filter((b) => b !== '')
            next[next.length - 1] = { ...last, blocks: filtered.length ? filtered : last.blocks, streaming: false }
          }
          return next
        })
        setTimeout(scrollBottom, 100)
      },
      // onError
      () => {
        setStreaming(false)
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'ai' && last.blocks.length === 1 && last.blocks[0] === '') {
            return next.slice(0, -1)
          }
          return next
        })
        Alert.alert('전송 실패', '전송에 실패했어요. 다시 시도해 주세요.')
      },
    )
  }, [input, streaming, sessionId, scrollBottom])

  // ── CTA 인덱스 계산 ────────────────────────────────────────────────────────

  const { lastReportToolMi, lastFortuneToolMi } = computeCtaIndexes(messages)

  // ── 비로그인 게이트 ────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFBF2', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    )
  }

  if (status !== 'authed') {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFBF2', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
          로그인이 필요해요
        </Text>
        <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
          AI 상담은 로그인한 사용자만 이용할 수 있어요.
        </Text>
        <Button label="구글로 로그인" onPress={() => login()} variant="primary" />
      </View>
    )
  }

  // ── 메인 렌더 ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFBF2' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* 헤더 */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 10,
          borderBottomWidth: 2,
          borderBottomColor: '#E0D9CE',
          backgroundColor: '#FFFBF2',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#1A1A1A',
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
            shadowColor: '#1A1A1A',
            shadowOpacity: 1,
            shadowRadius: 0,
            shadowOffset: { width: 2, height: 2 },
            elevation: 2,
          })}
        >
          <Text style={{ fontSize: 16, color: '#1A1A1A', fontWeight: '900' }}>←</Text>
        </Pressable>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 16, fontWeight: '800', color: '#1A1A1A' }}
        >
          {title ?? '사주 상담'}
        </Text>
      </View>

      {/* 메시지 목록 */}
      {!historyLoaded ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <View>
              <MessageBubble message={item} />
              {index === lastReportToolMi && !streaming && (
                <View style={{ marginTop: 8, marginLeft: 48 }}>
                  <ChatNavCTA
                    title="더 깊은 사주 분석이 궁금하신가요?"
                    buttonLabel="사주 풀 리포트 보러가기"
                    onPress={() => router.push('/report/new')}
                  />
                </View>
              )}
              {index === lastFortuneToolMi && !streaming && (
                <View style={{ marginTop: 8, marginLeft: 48 }}>
                  <ChatNavCTA
                    title="오늘의 운세가 궁금하신가요?"
                    buttonLabel="운세 보러가기"
                    onPress={() => router.push('/fortune')}
                  />
                </View>
              )}
            </View>
          )}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 8,
          }}
          onContentSizeChange={scrollBottom}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 입력바 */}
      <ChatInputBar
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={streaming}
        placeholder="고민을 자유롭게 적어보세요"
      />
    </KeyboardAvoidingView>
  )
}
