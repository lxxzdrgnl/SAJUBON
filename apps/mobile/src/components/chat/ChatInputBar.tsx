/**
 * 채팅 입력바 — 텍스트 입력 + 전송 버튼.
 * 스트리밍 중에는 disabled 처리.
 */
import { useRef } from 'react'
import { Pressable, TextInput, View, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface Props {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  disabled?: boolean
}

export function ChatInputBar({ value, onChange, onSend, disabled }: Props) {
  const insets = useSafeAreaInsets()
  const inputRef = useRef<TextInput>(null)

  return (
    <View
      style={{
        borderTopWidth: 2,
        borderTopColor: '#1A1A1A',
        backgroundColor: '#FFFBF2',
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 12),
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {/* 텍스트 입력 */}
      <TextInput
        ref={inputRef}
        style={{
          flex: 1,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: '#1A1A1A',
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: 15,
          color: '#1A1A1A',
          maxHeight: 120,
          lineHeight: 21,
        }}
        placeholder="메시지를 입력하세요…"
        placeholderTextColor="#C0B8A8"
        value={value}
        onChangeText={onChange}
        multiline
        editable={!disabled}
        returnKeyType="default"
        blurOnSubmit={false}
      />

      {/* 전송 버튼 */}
      <Pressable
        onPress={disabled || !value.trim() ? undefined : onSend}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 2,
          borderColor: '#1A1A1A',
          backgroundColor: disabled || !value.trim() ? '#C0B8A8' : '#FF6B00',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
          // 브루탈 하드오프셋 그림자
          shadowColor: '#1A1A1A',
          shadowOpacity: disabled || !value.trim() ? 0 : 1,
          shadowRadius: 0,
          shadowOffset: { width: 2, height: 2 },
          elevation: disabled || !value.trim() ? 0 : 2,
        })}
      >
        <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '900', lineHeight: 22 }}>
          ↑
        </Text>
      </Pressable>
    </View>
  )
}
