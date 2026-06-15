import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { brutalShadow } from '@/theme'

// 브루탈 하드오프셋 그림자 프리미티브 (컨텍스트 무관 안전 구조).
//
// 과거 구현: absolute 잉크 사각형을 자식 뒤에 깔았는데, RN(특히 Modal 안)에서 absolute 형제가
// 일반 자식의 배경을 덮어 카드가 검게 보이는 페인트 순서 버그가 있었다.
//
// 현재 구현: 바깥 View를 "잉크색"으로 칠하고, 자식을 marginBottom/Right=offset 만큼 들여
// 우하단에 잉크가 offset만큼 드러나게 한다. 자식은 부모 배경 "위에" 그려지므로(자식은 항상
// 부모 배경보다 위) absolute·zIndex에 의존하지 않아 모든 컨텍스트(Modal/ScrollView 포함)에서 안전.
// 전제: 자식은 자기 배경색·보더·radius를 가진다(브루탈 카드/버튼은 모두 충족).
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
    <View style={[{ backgroundColor: color, borderRadius: radius }, style]}>
      <View style={{ marginRight: offset, marginBottom: offset }}>{children}</View>
    </View>
  )
}
