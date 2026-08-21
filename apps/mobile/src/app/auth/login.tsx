import { useState } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { useAuth } from '@/lib/auth/AuthContext'

export default function LoginScreen() {
  const { login } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onLogin = async () => {
    setBusy(true)
    setError(null)
    try {
      const ok = await login()
      if (ok) {
        if (router.canGoBack()) router.back()
        else router.replace('/')
      } else {
        setError('로그인이 취소되었거나 실패했어요.')
      }
    } catch {
      setError('로그인 중 문제가 발생했어요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen scroll={false}>
      <View className="flex-1 items-center justify-center gap-6">
        <MascotTinted size={88} />
        <View className="items-center gap-1">
          <Text className="text-2xl font-black text-ink">사주구리</Text>
          <Text className="text-sm text-text-sub">로그인하고 내 사주를 저장하세요</Text>
        </View>
        <View className="w-full max-w-[320px]">
          <Button label={busy ? '로그인 중…' : 'Google로 계속하기'} onPress={onLogin} disabled={busy} />
        </View>
        {error ? <Text className="text-xs font-semibold text-orange">{error}</Text> : null}
      </View>
    </Screen>
  )
}
