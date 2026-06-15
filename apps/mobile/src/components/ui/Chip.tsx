import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { BrutalShadow } from './BrutalShadow'
import { brutalShadow, radii } from '@/theme'

// 칩(태그/배지) — 웹 Chip 대응. 2px 잉크 보더 + 2px 미니 그림자.
// children (웹 호환) 또는 label (기존 RN 호환) 중 하나 사용.
type ChipVariant = 'default' | 'lucky' | 'unlucky' | 'yellow'

const BG: Record<ChipVariant, string> = {
  default: 'bg-surface',
  lucky: 'bg-teal-tint',
  unlucky: 'bg-orange-tint',
  yellow: 'bg-yellow',
}
// 웹 Chip FG 정확히 매칭 (lucky=#00665F, unlucky=#B34800)
const FG_CLASS: Record<ChipVariant, string> = {
  default: 'text-ink',
  lucky: 'text-teal-deep',
  unlucky: 'text-orange',
  yellow: 'text-ink',
}
// NativeWind arbitrary color는 동적으로 안 쓰이므로 lucky/unlucky만 style 오버라이드
const FG_COLOR: Partial<Record<ChipVariant, string>> = {
  lucky: '#00665F',
  unlucky: '#B34800',
}

export function Chip({
  label,
  children,
  variant = 'default',
}: {
  label?: string
  children?: ReactNode
  variant?: ChipVariant
}) {
  const content = children ?? label ?? ''
  return (
    <BrutalShadow offset={brutalShadow.offsetSm} radius={radii.chip} style={{ marginBottom: 8, marginRight: 6 }}>
      <View className={`rounded-chip border-2 border-ink px-2.5 py-1 ${BG[variant]}`}>
        {typeof content === 'string' ? (
          <Text
            className={`text-xs font-extrabold ${FG_CLASS[variant]}`}
            style={FG_COLOR[variant] ? { color: FG_COLOR[variant] } : undefined}
          >
            {content}
          </Text>
        ) : (
          <View>{content}</View>
        )}
      </View>
    </BrutalShadow>
  )
}
