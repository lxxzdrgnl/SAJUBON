/**
 * 채팅 말풍선 컴포넌트.
 * - 유저: 노란색 배경 + 잉크 보더, 우측 정렬
 * - AI: 흰색(bg-surface) + 틸 보더, 좌측 정렬 + MascotTinted 아이콘
 * tool_result 블록은 간단한 플레이스홀더로 처리 (MVP).
 * [[chart:...]] 마커는 Markdown 컴포넌트에서 자동 제거됨.
 */
import { View, Text, ActivityIndicator } from 'react-native'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { Markdown } from '@/components/markdown/Markdown'

export interface ToolResultBlock {
  kind: 'tool_result'
  tool: string
  payload: Record<string, unknown>
}

export type MessageBlock = string | ToolResultBlock

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

export function MessageBubble({ message, dayStem }: Props) {
  const isHuman = message.role === 'human'

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
          if (typeof block === 'string') {
            // 스트리밍 플레이스홀더
            if (!block && message.streaming) {
              return (
                <View
                  key={bi}
                  style={{
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: '#00A878',
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <ActivityIndicator size="small" color="#00A878" />
                  <Text style={{ color: '#00A878', fontWeight: '700', fontSize: 13 }}>답변 생성 중…</Text>
                </View>
              )
            }

            if (!block) return null

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
                    // 브루탈 하드오프셋 그림자 (2px, 잉크)
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

            // AI 텍스트 말풍선 — Markdown으로 렌더 (chart 마커 자동 제거)
            return (
              <View
                key={bi}
                style={{
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: '#00A878',
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Markdown>{block}</Markdown>
                {message.streaming && bi === message.blocks.length - 1 && (
                  <Text style={{ color: '#00A878', fontWeight: '700' }}>▋</Text>
                )}
              </View>
            )
          }

          // tool_result 블록 — MVP에서는 간단한 플레이스홀더
          if (block.kind === 'tool_result') {
            return (
              <View
                key={bi}
                style={{
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: '#1A1A1A',
                  backgroundColor: '#F5F2EC',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270', marginBottom: 2 }}>
                  도구 결과
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                  {block.tool}
                </Text>
              </View>
            )
          }

          return null
        })}
      </View>
    </View>
  )
}
