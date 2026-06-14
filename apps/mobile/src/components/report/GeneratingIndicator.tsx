import { ActivityIndicator, Text, View } from 'react-native'

const MESSAGES = [
  '사주를 분석하는 중이에요...',
  '운명의 흐름을 읽고 있어요...',
  '천간과 지지를 해석하는 중...',
  '리포트를 작성하고 있어요...',
]

/**
 * 사주 리포트 생성 중 로딩 인디케이터.
 * 한국어 안내 문구 + 스피너 표시.
 */
export function GeneratingIndicator({ message }: { message?: string }) {
  const displayMessage = message ?? MESSAGES[0]

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        gap: 20,
      }}
    >
      {/* 스피너 */}
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          borderWidth: 2,
          borderColor: '#1A1A1A',
          backgroundColor: '#FFF4E3',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>

      {/* 메인 메시지 */}
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '800',
            color: '#1A1A1A',
            textAlign: 'center',
          }}
        >
          {displayMessage}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: '#8A8270',
            textAlign: 'center',
          }}
        >
          AI가 당신의 사주를 꼼꼼히 분석하고 있어요
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: '#C0B8A8',
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          최대 1~2분 소요될 수 있어요
        </Text>
      </View>
    </View>
  )
}
