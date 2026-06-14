import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { useAuth } from '@/lib/auth/AuthContext'

export default function MyScreen() {
  const { status, user, logout } = useAuth()
  const router = useRouter()

  return (
    <Screen>
      <Text className="mb-4 mt-2 text-2xl font-black text-ink">내 정보</Text>

      {status === 'loading' ? (
        <Text className="text-sm text-text-sub">불러오는 중…</Text>
      ) : status === 'authed' && user ? (
        <View className="gap-4">
          <BrutalCard>
            <Text className="text-xs font-semibold text-text-sub">로그인 계정</Text>
            <Text className="mt-1 text-base font-extrabold text-ink">{user.email}</Text>
          </BrutalCard>
          <Button label="로그아웃" variant="ghost" onPress={logout} />
        </View>
      ) : (
        <View className="gap-4">
          <BrutalCard>
            <Text className="text-sm text-text-sub">
              로그인하면 만세력을 저장하고 리포트·궁합을 만들 수 있어요.
            </Text>
          </BrutalCard>
          <Button label="Google로 로그인" onPress={() => router.push('/auth/login')} />
        </View>
      )}
    </Screen>
  )
}
