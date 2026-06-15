import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { BrutalShadow } from './ui/BrutalShadow'
import { colors, radii } from '@/theme'

// expo-router Tabs의 tabBar 콜백이 받는 props 중 우리가 쓰는 최소 형태만 로컬 정의.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] }
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }
    navigate: (name: string) => void
  }
}

// 웹 TabBar와 동일한 아이콘 경로 (apps/web/components/TabBar.tsx)
const ICONS: Record<string, string> = {
  index: 'M3 11 L12 3.5 L21 11 M5.5 9.5 V20 H10 V14.5 H14 V20 H18.5 V9.5',
  manse: 'M4 4 h7 v7 h-7 Z M13 4 h7 v7 h-7 Z M4 13 h7 v7 h-7 Z M13 13 h7 v7 h-7 Z',
  chat: 'M4 6 a3 3 0 0 1 3-3 h10 a3 3 0 0 1 3 3 v7 a3 3 0 0 1-3 3 H10 l-4.5 4 v-4 H7 a3 3 0 0 1-3-3 Z',
  my: 'M12 4 a4 4 0 1 1 0 8 a4 4 0 0 1 0-8 M4 20 a8 8 0 0 1 16 0',
}
// ko.json `tab` — 정확히 매칭: 홈/만세력/상담/마이
const LABELS: Record<string, string> = {
  index: '홈',
  manse: '만세력',
  chat: '상담',
  my: '마이',
}

const MAX_W = 612

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets()
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 14 + insets.bottom,
        alignItems: 'center',
      }}
      pointerEvents="box-none"
    >
      <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: 14 }}>
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
                  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
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
    </View>
  )
}
