/**
 * /manse/new — 만세력 입력 폼 페이지.
 * 웹 /manse/new 대응: 입력 후 결과 페이지로 push, 동시에 최근 기록에 저장.
 */
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen } from '@/components/ui/Screen'
import { BirthInputForm, type ManseBirthInput } from '@/components/manse/BirthInputForm'
import { saveRecentInput } from '@sajuguri/core'
import { rnStorage } from '@/lib/storage'

export default function ManseNewScreen() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (input: ManseBirthInput) => {
    setBusy(true)
    try {
      // 최근 본 만세력에 저장 (RecentBirthInput과 필드가 호환)
      await saveRecentInput(rnStorage, {
        name: input.name,
        birth_date: input.birth_date,
        birth_time: input.birth_time,
        gender: input.gender,
        calendar: input.calendar,
        is_leap_month: input.is_leap_month,
        birth_longitude: input.birth_longitude,
        birth_utc_offset: input.birth_utc_offset,
        city: input.city,
      })
      router.push({ pathname: '/manse/result', params: { data: JSON.stringify(input) } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      {/* 헤더 */}
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
      >
        <Text style={{ fontSize: 22, color: '#1A1A1A', marginRight: 4 }}>←</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>만세력</Text>
      </Pressable>

      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#8A8270', textAlign: 'center' }}>
          생년월일시를 입력하면 사주 원국을 계산합니다
        </Text>
      </View>

      <BirthInputForm onSubmit={handleSubmit} busy={busy} submitLabel="만세력 보기" />
    </Screen>
  )
}
