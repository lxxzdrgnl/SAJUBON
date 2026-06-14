import { useState } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen } from '@/components/ui/Screen'
import { BirthInputForm, type ManseBirthInput } from '@/components/manse/BirthInputForm'

export default function ManseScreen() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (input: ManseBirthInput) => {
    setBusy(true)
    try {
      router.push({ pathname: '/manse/result', params: { data: JSON.stringify(input) } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#1A1A1A' }}>만세력</Text>
        <Text style={{ fontSize: 13, color: '#8A8270', marginTop: 4 }}>생년월일을 입력하면 사주 원국을 계산합니다</Text>
      </View>
      <BirthInputForm onSubmit={handleSubmit} busy={busy} submitLabel="만세력 보기" />
    </Screen>
  )
}
