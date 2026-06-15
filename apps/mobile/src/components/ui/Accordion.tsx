import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { BrutalShadow } from './BrutalShadow'
import { colors, radii } from '@/theme'

// 접이식 카드 — 웹 ui/Accordion 대응. 닫힘=잉크 보더(그림자 없음), 펼침=오렌지 보더+오렌지 브루탈 섀도.
// 점선 구분선, SVG 셰브론 회전. 이모지 금지.
export function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  const card = (
    <View
      className={`overflow-hidden rounded-2xl border-2 bg-surface ${open ? 'border-orange' : 'border-ink'}`}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between px-4 py-3"
      >
        {typeof title === 'string' ? (
          <Text className="text-[13px] font-extrabold text-text-sub">{title}</Text>
        ) : (
          title
        )}
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Path d="M4 6l4 4 4-4" stroke={colors.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      {open && (
        <View className="border-t border-dashed border-ink px-4 py-3">{children}</View>
      )}
    </View>
  )

  return open ? (
    <BrutalShadow radius={radii.card} color={colors.orange}>
      {card}
    </BrutalShadow>
  ) : (
    card
  )
}
