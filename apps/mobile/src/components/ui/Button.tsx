import { Pressable, Text, type GestureResponderEvent } from 'react-native'
import { BrutalShadow } from './BrutalShadow'
import { radii } from '@/theme'

// 브루탈 버튼 — 웹 버튼 변형 대응. 2px 잉크 보더 + 4px 하드오프셋 그림자, extrabold.
type ButtonVariant = 'primary' | 'strong' | 'secondary' | 'sky' | 'ghost'

const BG: Record<ButtonVariant, string> = {
  primary: 'bg-yellow',
  strong: 'bg-orange',
  secondary: 'bg-teal',
  sky: 'bg-sky-tint',
  ghost: 'bg-transparent',
}
const FG: Record<ButtonVariant, string> = {
  primary: 'text-ink',
  strong: 'text-white',
  secondary: 'text-white',
  sky: 'text-sky',
  ghost: 'text-ink',
}
const BORDER: Record<ButtonVariant, string> = {
  primary: 'border-ink',
  strong: 'border-ink',
  secondary: 'border-ink',
  sky: 'border-sky',
  ghost: 'border-ink',
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string
  onPress?: (e: GestureResponderEvent) => void
  variant?: ButtonVariant
  disabled?: boolean
}) {
  const shadowColor = variant === 'sky' ? '#4DA8E8' : '#1A1A1A'
  return (
    <BrutalShadow radius={radii.button} color={shadowColor} style={{ opacity: disabled ? 0.5 : 1 }}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        className={`items-center justify-center rounded-xl border-2 px-4 py-3 ${BG[variant]} ${BORDER[variant]}`}
        style={({ pressed }) => ({ transform: pressed ? [{ translateX: 1 }, { translateY: 1 }] : [] })}
      >
        <Text className={`text-base font-extrabold ${FG[variant]}`}>{label}</Text>
      </Pressable>
    </BrutalShadow>
  )
}
