import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { brutalShadow } from '@/theme'

// 브루탈 하드오프셋 그림자 프리미티브.
// RN엔 blur 0짜리 오프셋 그림자가 없어(iOS shadow는 항상 블러, Android는 elevation),
// 자식과 같은 크기의 잉크 사각형을 우하단으로 offset만큼 밀어 뒤에 깐다.
// 자식은 자기 배경색을 가져야 그림자를 덮는다 (bg-surface 등). 웹의 box-shadow처럼
// 레이아웃에는 영향 없음(absolute) — 인접 간격은 부모 gap으로 준다.
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
    <View style={style}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: offset,
          left: offset,
          right: -offset,
          bottom: -offset,
          backgroundColor: color,
          borderRadius: radius,
        }}
      />
      {children}
    </View>
  )
}
