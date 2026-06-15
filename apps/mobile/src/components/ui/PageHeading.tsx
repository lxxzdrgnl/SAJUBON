import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { colors } from '@/theme'

// 페이지 헤더 — 웹 ui/PageHeading 대응. 큼직한 제목 + 브랜드 액센트 바.
export function PageHeading({
  title,
  accent = 'orange',
  children,
}: {
  title: string
  accent?: 'orange' | 'teal' | 'yellow'
  children?: ReactNode
}) {
  const barColor = accent === 'teal' ? colors.teal : accent === 'yellow' ? colors.yellow : colors.orange
  return (
    <View>
      <Text className="text-[22px] font-black leading-tight text-ink">{title}</Text>
      <View className="mt-2 h-1.5 w-12 rounded-full" style={{ backgroundColor: barColor }} />
      {children}
    </View>
  )
}
