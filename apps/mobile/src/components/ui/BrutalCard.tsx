import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { BrutalShadow } from './BrutalShadow'
import { radii } from '@/theme'

// 브루탈 카드 — 웹 BrutalCard 대응.
// full: 2px 잉크 보더 + 4px 하드오프셋 그림자 / soft: 보더만(그림자 없음). 회색 보더 금지.
export function BrutalCard({
  children,
  intensity = 'full',
  className = '',
  style,
}: {
  children: ReactNode
  intensity?: 'full' | 'soft'
  className?: string
  style?: StyleProp<ViewStyle>
}) {
  const card = (
    <View
      className={`rounded-2xl border-2 border-ink bg-surface p-4 ${className}`}
      style={style}
    >
      {children}
    </View>
  )
  if (intensity === 'soft') return card
  return <BrutalShadow radius={radii.card}>{card}</BrutalShadow>
}
