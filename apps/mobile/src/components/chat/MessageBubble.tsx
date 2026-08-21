/**
 * 채팅 말풍선 컴포넌트.
 * - 유저: 노란색 배경 + 잉크 보더, 우측 정렬
 * - AI: 흰색(bg-surface) + 틸 보더, 좌측 정렬 + MascotTinted 아이콘
 * tool_result 블록은 ToolCard로 렌더 (chart 마커 소비 여부 판단).
 *
 * TODO (미구현):
 *   - inline_partner → AttachSheet 연동 (바텀시트 실제 열기)
 *   - [[chart:...]] 마커가 없는 tool_result 블록에 대한 standalone 카드 표시 개선
 */
import { useRef, useEffect } from 'react'
import { View, Text, Animated } from 'react-native'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { Markdown } from '@/components/markdown/Markdown'
import ToolCard from '@/components/chat/ToolCard'
import { splitTextWithChartMarkers, markerToolsInText } from '@/lib/chatMarkers'

// ── 타입 정의 ────────────────────────────────────────────────────────────────
export interface ToolResultBlock {
  kind: 'tool_result'
  tool: string
  payload: Record<string, unknown>
}

export interface InlinePartnerBlock {
  kind: 'inline_partner'
}

export interface PartnerAttachedBlock {
  kind: 'partner_attached'
  name: string
}

export type MessageBlock = string | ToolResultBlock | InlinePartnerBlock | PartnerAttachedBlock

export interface DisplayMessage {
  role: 'human' | 'ai'
  blocks: MessageBlock[]
  streaming?: boolean
}

interface Props {
  message: DisplayMessage
  /** AI 말풍선에 표시할 일간 간지 (MascotTinted용) */
  dayStem?: string | null
}

// ── BlinkingCursor ────────────────────────────────────────────────────────────
function BlinkingCursor() {
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1.0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#00A878',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignSelf: 'flex-start',
      }}
    >
      <Animated.Text
        style={{
          fontSize: 16,
          color: '#00A878',
          fontWeight: '700',
          opacity,
        }}
      >
        ▋
      </Animated.Text>
    </View>
  )
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
export function MessageBubble({ message, dayStem }: Props) {
  const isHuman = message.role === 'human'

  // tool_result 블록을 tool 이름으로 인덱싱
  const toolByName: Record<string, Record<string, unknown>> = {}
  for (const b of message.blocks) {
    if (typeof b !== 'string' && b.kind === 'tool_result') {
      toolByName[b.tool] = b.payload
    }
  }

  // 텍스트 블록에서 [[chart:...]] 마커로 소비된 도구 이름 수집
  const consumedTools = new Set<string>()
  for (const b of message.blocks) {
    if (typeof b === 'string') {
      for (const t of markerToolsInText(b)) consumedTools.add(t)
    }
  }

  return (
    <View
      style={{
        flexDirection: isHuman ? 'row-reverse' : 'row',
        gap: 8,
        alignItems: 'flex-start',
        marginBottom: 12,
      }}
    >
      {/* AI 마스코트 아이콘 */}
      {!isHuman && (
        <View style={{ marginTop: 2, flexShrink: 0 }}>
          <MascotTinted stem={dayStem} size={32} />
        </View>
      )}

      {/* 블록 목록 */}
      <View
        style={{
          flex: 1,
          alignItems: isHuman ? 'flex-end' : 'flex-start',
          gap: 6,
          maxWidth: '80%',
        }}
      >
        {message.blocks.map((block, bi) => {
          // ── 텍스트 블록 ────────────────────────────────────────────────────
          if (typeof block === 'string') {
            // 스트리밍 플레이스홀더 (빈 블록)
            if (!block && message.streaming) {
              return <BlinkingCursor key={bi} />
            }

            if (!block) return null

            // 유저 텍스트
            if (isHuman) {
              return (
                <View
                  key={bi}
                  style={{
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: '#1A1A1A',
                    backgroundColor: '#FFE566',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    shadowColor: '#1A1A1A',
                    shadowOpacity: 1,
                    shadowRadius: 0,
                    shadowOffset: { width: 2, height: 2 },
                    elevation: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#1A1A1A',
                      lineHeight: 21,
                    }}
                  >
                    {block}
                  </Text>
                </View>
              )
            }

            // AI 텍스트 — [[chart:...]] 마커 분리 렌더링
            const segments = splitTextWithChartMarkers(block)
            const isLastBlock = bi === message.blocks.length - 1

            return (
              <View key={bi} style={{ gap: 6, alignSelf: 'stretch' }}>
                {segments.map((seg, si) => {
                  if (seg.kind === 'chart') {
                    const chartPayload = toolByName[seg.tool]
                    if (!chartPayload) return null
                    return <ToolCard key={si} tool={seg.tool} payload={chartPayload} />
                  }

                  // 텍스트 세그먼트
                  const isLastSeg = si === segments.length - 1
                  return (
                    <View
                      key={si}
                      style={{
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: '#00A878',
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Markdown>{seg.text}</Markdown>
                      {message.streaming && isLastBlock && isLastSeg && (
                        <Text style={{ color: '#00A878', fontWeight: '700' }}>▋</Text>
                      )}
                    </View>
                  )
                })}
              </View>
            )
          }

          // ── inline_partner 블록 ──────────────────────────────────────────
          // TODO: AttachSheet 실제 연동 (현재는 안내 카드만 표시)
          if (block.kind === 'inline_partner') {
            return (
              <View
                key={bi}
                style={{
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: '#FF6B00',
                  backgroundColor: '#FFEDE0',
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#CC4400', lineHeight: 20 }}>
                  상대방의 만세력이 필요해요. 첨부해 주세요.
                </Text>
              </View>
            )
          }

          // ── partner_attached 블록 ────────────────────────────────────────
          if (block.kind === 'partner_attached') {
            return (
              <View
                key={bi}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#1A1A1A',
                  backgroundColor: '#FFF9E0',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', lineHeight: 20 }}>
                  📎 {block.name}님의 만세력을 첨부했어요.
                </Text>
              </View>
            )
          }

          // ── tool_result 블록 ─────────────────────────────────────────────
          if (block.kind === 'tool_result') {
            // 텍스트 블록의 [[chart:...]] 마커에서 이미 소비된 도구는 스킵
            if (consumedTools.has(block.tool)) return null

            return <ToolCard key={bi} tool={block.tool} payload={block.payload} />
          }

          return null
        })}
      </View>
    </View>
  )
}
