import { useEffect, useRef, useState } from 'react'
import { Animated, Text, View } from 'react-native'
import { MascotTinted } from '@/components/ui/MascotTinted'

// Exported so callers can pass domain-specific phrase arrays
export const REPORT_LOADING_PHRASES = [
  '사주를 읽고 있어요...',
  '천간과 지지를 살피는 중이에요...',
  '대운의 흐름을 분석하고 있어요...',
  '오행의 균형을 파악하는 중이에요...',
  '당신만의 해설을 작성하고 있어요...',
  '거의 다 됐어요, 조금만 기다려 주세요...',
]

export const COMPAT_LOADING_PHRASES = [
  '두 사람의 사주를 읽고 있어요...',
  '천간합화와 오행 흐름을 살피는 중이에요...',
  '지지의 충과 합을 분석하고 있어요...',
  '두 분만을 위한 케미 해설을 작성하고 있어요...',
  '거의 다 됐어요, 조금만 기다려 주세요...',
]

interface GeneratingIndicatorProps {
  phrases?: string[]
  note?: string
}

export function GeneratingIndicator({
  phrases = REPORT_LOADING_PHRASES,
  note = 'AI가 사주를 분석 중이에요. 보통 30~60초 정도 걸려요.',
}: GeneratingIndicatorProps) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % phrases.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [phrases])

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        gap: 20,
      }}
    >
      <BounceView>
        <MascotTinted size={72} />
      </BounceView>

      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '800',
            color: '#1A1A1A',
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          {phrases[idx]}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: '#8A8270',
            textAlign: 'center',
          }}
        >
          {note}
        </Text>
      </View>
    </View>
  )
}

// ── Simple bounce animation ──────────────────────────────────────────────────

function BounceView({ children }: { children: React.ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -12,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [translateY])

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  )
}
