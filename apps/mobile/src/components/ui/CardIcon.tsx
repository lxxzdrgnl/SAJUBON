import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

// 카드 좌측 아이콘 배지 — 웹 CardIcon 대응 (11x11 rounded, 잉크 보더).
export function CardIcon({ d, bg, color }: { d: string; bg: string; color: string }) {
  return (
    <View
      className="h-11 w-11 items-center justify-center rounded-xl border-2 border-ink"
      style={{ backgroundColor: bg }}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d={d} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  )
}

export const ICON_PATHS = {
  doc: 'M5 3 h11 a2 2 0 0 1 2 2 v14 a2 2 0 0 1-2 2 H5 V3 Z M9 8 H15 M9 12 H15 M9 16 H13',
  chat: 'M4 6 a3 3 0 0 1 3-3 h10 a3 3 0 0 1 3 3 v7 a3 3 0 0 1-3 3 H10 l-4.5 4 v-4 H7 a3 3 0 0 1-3-3 Z',
  bolt: 'M13 2 L5 13 H11 L9 22 L19 10 H12 Z',
  heart: 'M12 20 C12 20 4 13.5 4 8.5 A4 4 0 0 1 12 6 A4 4 0 0 1 20 8.5 C20 13.5 12 20 12 20 Z',
  manse: 'M4 5 h16 M4 9 h16 M4 13 h10 M4 17 h10',
  chevron: 'M9 6 l6 6 -6 6',
} as const
