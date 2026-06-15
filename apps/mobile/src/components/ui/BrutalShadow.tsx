import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { brutalShadow } from '@/theme'

// 브루탈 하드오프셋 그림자 — 웹의 box-shadow[4px_4px_0]와 동일.
// RN New Arch(SDK54+)는 CSS `boxShadow` 스타일을 지원하므로 absolute/parent-bg 꼼수 없이
// 그대로 하드 그림자를 그린다. Modal/ScrollView 등 모든 컨텍스트에서 안전.
// 자식(카드/버튼)은 자기 배경색·보더·radius를 가진다.
export function BrutalShadow({
  children,
  offset = brutalShadow.offset,
  radius = 16,
  color = brutalShadow.ink,
  style,
}: {
  children: ReactNode
  offset?: number
  radius?: number
  color?: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ boxShadow: `${offset}px ${offset}px 0 ${color}`, borderRadius: radius }, style]}>
      {children}
    </View>
  )
}
