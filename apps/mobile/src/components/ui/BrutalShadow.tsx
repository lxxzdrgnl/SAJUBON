import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { brutalShadow } from '@/theme'

// 브루탈 하드오프셋 그림자 프리미티브.
// RN엔 blur 0짜리 오프셋 그림자가 없어(iOS shadow는 항상 블러, Android는 elevation),
// 자식과 같은 크기의 잉크 사각형을 우하단으로 offset만큼 밀어 뒤에 깐다.
//
// 중요: RN에서 absolute 형제(그림자)가 일반 형제(자식)의 "배경"을 덮어버리는 페인트 순서
// 이슈가 있어, 그림자에 zIndex:0, 자식 래퍼에 zIndex:1을 줘서 자식을 확실히 위로 올린다.
// (이게 없으면 inline backgroundColor 자식이 검게 보임 — 카드 배경이 그림자에 가려짐.)
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
          zIndex: 0,
        }}
      />
      <View style={{ zIndex: 1 }}>{children}</View>
    </View>
  )
}
