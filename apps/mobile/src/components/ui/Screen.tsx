import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MAX_WIDTH } from '@/theme'

// 화면 래퍼 — 단일 컬럼(최대 640) 중앙 정렬 + 세이프에어리어 상단 + 탭바 여백 하단.
// 웹 layout.tsx의 mx-auto max-w-[640px] px-4 pb-24 대응.
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets()
  const paddingTop = insets.top + 20
  const paddingBottom = insets.bottom + 96

  if (!scroll) {
    return (
      <View className="flex-1 bg-bg-base">
        <View style={{ flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 16, paddingTop }}>
          {children}
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-bg-base"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop, paddingBottom, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  )
}
