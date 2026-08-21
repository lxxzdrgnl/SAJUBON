import { Alert, Pressable, Text, View } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { categoryLabel } from './CategorySelector'
import type { ConsultationHistoryItem } from '@sajuguri/api-client'

interface Props {
  item: ConsultationHistoryItem
  onDelete?: (id: number) => void
  onShare?: (id: number) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

export function HistoryItem({ item, onDelete, onShare }: Props) {
  function handleDelete() {
    Alert.alert(
      '상담 기록 삭제',
      '이 상담 기록을 삭제할까요? 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onDelete?.(item.id),
        },
      ],
    )
  }

  return (
    <BrutalCard intensity="soft">
      {/* 상단: 프로필명 + 날짜 + 카테고리 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270' }}>
            {item.profile_name}
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: '#E0D9CE',
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 1,
              backgroundColor: '#F5F2EC',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#8A8270' }}>
              {categoryLabel(item.category)}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, color: '#C0B8A8', fontWeight: '600' }}>
          {formatDate(item.created_at)}
        </Text>
      </View>

      {/* 질문 */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: '#8A8270',
          marginBottom: 4,
        }}
        numberOfLines={1}
      >
        Q. {item.question}
      </Text>

      {/* 헤드라인 */}
      <Text
        style={{
          fontSize: 14,
          fontWeight: '800',
          color: '#1A1A1A',
          lineHeight: 20,
        }}
        numberOfLines={2}
      >
        {item.headline}
      </Text>

      {/* 액션 버튼 */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        {onShare && (
          <Pressable
            onPress={() => onShare(item.id)}
            style={{
              borderWidth: 1.5,
              borderColor: '#1A1A1A',
              borderRadius: 7,
              paddingHorizontal: 12,
              paddingVertical: 5,
              backgroundColor: '#FAFAF7',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#1A1A1A' }}>공유</Text>
          </Pressable>
        )}
        {onDelete && (
          <Pressable
            onPress={handleDelete}
            style={{
              borderWidth: 1.5,
              borderColor: '#E0D9CE',
              borderRadius: 7,
              paddingHorizontal: 12,
              paddingVertical: 5,
              backgroundColor: '#FAFAF7',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#C0B8A8' }}>삭제</Text>
          </Pressable>
        )}
      </View>
    </BrutalCard>
  )
}
