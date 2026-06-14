import { Text, View } from 'react-native'
import { Screen } from '@/components/ui/Screen'

export default function ManseScreen() {
  return (
    <Screen>
      <View className="mt-4">
        <Text className="text-2xl font-black text-ink">만세력</Text>
        <Text className="mt-2 text-sm text-text-sub">곧 구현됩니다.</Text>
      </View>
    </Screen>
  )
}
