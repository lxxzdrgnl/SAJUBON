import { Text, View } from 'react-native'
import { BrutalShadow } from './BrutalShadow'
import { brutalShadow, radii } from '@/theme'

// 칩(태그/배지) — 웹 Chip 대응. 2px 잉크 보더 + 2px 미니 그림자.
type ChipVariant = 'default' | 'lucky' | 'unlucky' | 'yellow'

const BG: Record<ChipVariant, string> = {
  default: 'bg-surface',
  lucky: 'bg-teal-tint',
  unlucky: 'bg-orange-tint',
  yellow: 'bg-yellow',
}
const FG: Record<ChipVariant, string> = {
  default: 'text-ink',
  lucky: 'text-teal-deep',
  unlucky: 'text-orange',
  yellow: 'text-ink',
}

export function Chip({ label, variant = 'default' }: { label: string; variant?: ChipVariant }) {
  return (
    <BrutalShadow offset={brutalShadow.offsetSm} radius={radii.chip}>
      <View className={`rounded-chip border-2 border-ink px-2.5 py-1 ${BG[variant]}`}>
        <Text className={`text-xs font-extrabold ${FG[variant]}`}>{label}</Text>
      </View>
    </BrutalShadow>
  )
}
