import { Pressable, ScrollView, Text, View } from 'react-native'
import type { QuestionCategory } from '@sajuguri/api-client'

const CATEGORIES: { value: QuestionCategory; label: string }[] = [
  { value: 'general', label: '전체' },
  { value: 'career', label: '직업·진로' },
  { value: 'love', label: '연애·결혼' },
  { value: 'money', label: '재물·금전' },
  { value: 'health', label: '건강' },
]

interface Props {
  value: QuestionCategory | undefined
  onChange: (v: QuestionCategory | undefined) => void
}

export function CategorySelector({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {CATEGORIES.map((cat) => {
        const active = value === cat.value || (cat.value === 'general' && !value)
        return (
          <Pressable
            key={cat.value}
            onPress={() => onChange(cat.value === 'general' ? undefined : cat.value)}
            style={{
              borderWidth: 2,
              borderColor: active ? '#FF6B00' : '#1A1A1A',
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 7,
              backgroundColor: active ? '#FFF4E3' : '#FAFAF7',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: active ? '#FF6B00' : '#1A1A1A',
              }}
            >
              {cat.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

/** 카테고리 한글 레이블 */
export function categoryLabel(cat: string): string {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat
}
