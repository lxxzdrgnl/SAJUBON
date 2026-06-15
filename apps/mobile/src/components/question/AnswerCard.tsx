import { Pressable, Text, View } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { Markdown } from '@/components/markdown/Markdown'
import { categoryLabel } from './CategorySelector'
import type { ConsultationResponse } from '@sajuguri/api-client'

interface Props {
  result: ConsultationResponse
  sharing?: boolean
  onShare?: () => void
  onAskAgain?: () => void
}

export function AnswerCard({ result, sharing, onShare, onAskAgain }: Props) {
  return (
    <View style={{ gap: 12 }}>
      {/* 헤드라인 + 본문 카드 */}
      <BrutalCard intensity="full">
        {/* ko.json question.resultLabel */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '800',
            color: '#8A8270',
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          AI 상담 결과
        </Text>

        {/* 헤드라인 */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: '900',
            color: '#1A1A1A',
            lineHeight: 26,
            marginBottom: 10,
          }}
        >
          {result.headline}
        </Text>

        {/* 본문 (마크다운) */}
        <Markdown>{result.content}</Markdown>

        {/* 카테고리 배지 */}
        <View style={{ marginTop: 12, flexDirection: 'row' }}>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: '#1A1A1A',
              borderRadius: 999,
              backgroundColor: '#FF6B00',
              paddingHorizontal: 12,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
              {categoryLabel(result.category)}
            </Text>
          </View>
        </View>
      </BrutalCard>

      {/* 액션 버튼들 */}
      <View style={{ gap: 8 }}>
        {onShare && (
          <Pressable
            onPress={sharing ? undefined : onShare}
            style={({ pressed }) => ({
              borderWidth: 2,
              borderColor: '#1A1A1A',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              backgroundColor: '#7BD3C8',
              opacity: sharing ? 0.6 : 1,
              transform: pressed ? [{ translateX: 1 }, { translateY: 1 }] : [],
            })}
          >
            {/* ko.json question.share / question.sharing */}
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
              {sharing ? '링크 만드는 중...' : '공유하기'}
            </Text>
          </Pressable>
        )}
        {onAskAgain && (
          <Pressable
            onPress={onAskAgain}
            style={({ pressed }) => ({
              borderWidth: 2,
              borderColor: '#1A1A1A',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              backgroundColor: '#FFE94D',
              transform: pressed ? [{ translateX: 1 }, { translateY: 1 }] : [],
            })}
          >
            {/* ko.json question.askAgain */}
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>
              다시 물어보기
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
