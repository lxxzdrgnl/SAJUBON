import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { BrutalShadow } from './ui/BrutalShadow'
import { colors, radii } from '@/theme'

// expo-router Tabs의 tabBar 콜백이 받는 props 중 우리가 쓰는 최소 형태만 로컬 정의.
// (@react-navigation/bottom-tabs는 pnpm isolated에서 직접 해석 안 될 수 있어 의존하지 않는다.)
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] }
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }
    navigate: (name: string) => void
  }
}

// 하단 플로팅 브루탈 탭바 — 웹 TabBar 대응. 활성 탭 = 노란 배경.
const ICONS: Record<string, string> = {
  index: 'M3 11 L12 3 L21 11 M5 9 V21 H19 V9',
  manse: 'M4 5 h16 M4 9 h16 M4 13 h10 M4 17 h10',
  chat: 'M4 6 a3 3 0 0 1 3-3 h10 a3 3 0 0 1 3 3 v7 a3 3 0 0 1-3 3 H10 l-4.5 4 v-4 H7 a3 3 0 0 1-3-3 Z',
  my: 'M12 12 a4 4 0 1 0 0-8 a4 4 0 0 0 0 8 Z M4 21 c0-4 4-6 8-6 s8 2 8 6',
}
// ko.json `tab` — 정확히 매칭: 홈/만세력/상담/마이
const LABELS: Record<string, string> = {
  index: '홈',
  manse: '만세력',
  chat: '상담',
  my: '마이',
}

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets()
  return (
    <View
      style={{ position: 'absolute', left: 14, right: 14, bottom: 14 + insets.bottom }}
      pointerEvents="box-none"
    >
      <BrutalShadow radius={radii.card}>
        <View className="flex-row rounded-2xl border-2 border-ink bg-surface">
          {state.routes.map((route, i) => {
            const focused = state.index === i
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
            }
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                className={`flex-1 items-center gap-0.5 rounded-2xl py-2 ${focused ? 'bg-yellow' : ''}`}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d={ICONS[route.name] ?? ICONS.index}
                    stroke={focused ? colors.ink : colors.textSub}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text
                  className={`text-[11px] font-extrabold ${focused ? 'text-ink' : 'text-text-sub'}`}
                >
                  {LABELS[route.name] ?? route.name}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </BrutalShadow>
    </View>
  )
}
