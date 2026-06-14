import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { Screen } from '@/components/ui/Screen'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { CardIcon, ICON_PATHS } from '@/components/ui/CardIcon'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { colors, radii } from '@/theme'

function Chevron() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d={ICON_PATHS.chevron} stroke={colors.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
    </Svg>
  )
}

function FeatureCard({
  d,
  bg,
  iconColor,
  title,
  desc,
  badge,
  onPress,
}: {
  d: string
  bg: string
  iconColor: string
  title: string
  desc: string
  badge?: string
  onPress?: () => void
}) {
  return (
    <Pressable onPress={onPress}>
      <BrutalCard>
        <View className="flex-row items-center gap-3">
          <CardIcon d={d} bg={bg} color={iconColor} />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1">
              <Text className="text-sm font-extrabold text-ink">{title}</Text>
              {badge ? (
                <View className="rounded-full border-2 border-ink bg-orange px-2">
                  <Text className="text-[10px] font-extrabold text-white">{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-0.5 text-xs text-text-sub">{desc}</Text>
          </View>
          <Chevron />
        </View>
      </BrutalCard>
    </Pressable>
  )
}

export default function Home() {
  const router = useRouter()
  return (
    <Screen>
      {/* 헤더 */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <MascotTinted size={26} />
          <Text className="text-xl font-black text-ink">
            사주<Text className="bg-yellow">구리</Text>
          </Text>
        </View>
      </View>

      {/* 운세 배너 */}
      <BrutalShadow radius={radii.card}>
        <View
          className="flex-row items-center gap-3 rounded-2xl border-2 border-ink p-4"
          style={{ backgroundColor: colors.yellow }}
        >
          <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface">
            <MascotTinted size={40} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-black text-ink">오늘의 운세</Text>
            <Text className="text-xs font-semibold text-ink">매일 달라지는 나의 하루 흐름</Text>
          </View>
          <Chevron />
        </View>
      </BrutalShadow>

      <Text className="mb-3 mt-5 text-[15px] font-extrabold text-ink">무엇을 볼까요?</Text>
      <View className="gap-3">
        <FeatureCard
          d={ICON_PATHS.manse}
          bg="#7BD3C8"
          iconColor={colors.ink}
          title="만세력 보기"
          desc="사주 원국과 대운·세운을 한눈에"
          onPress={() => router.push('/manse')}
        />
        <FeatureCard
          d={ICON_PATHS.doc}
          bg={colors.yellow}
          iconColor={colors.ink}
          title="사주 풀리포트"
          badge="AI"
          desc="내 사주를 깊이 있게 풀어주는 리포트"
        />
        <FeatureCard
          d={ICON_PATHS.chat}
          bg={colors.teal}
          iconColor="#FFFFFF"
          title="AI 상담"
          desc="궁금한 걸 자유롭게 물어보세요"
          onPress={() => router.push('/chat')}
        />
        <FeatureCard
          d={ICON_PATHS.bolt}
          bg={colors.amber}
          iconColor="#FFFFFF"
          title="한 번 물어보기"
          desc="질문 하나, 사주 기반 답변 하나"
        />
        <FeatureCard
          d={ICON_PATHS.heart}
          bg={colors.sky}
          iconColor="#FFFFFF"
          title="궁합 리포트"
          desc="두 사람의 케미를 사주로 분석"
        />
      </View>
    </Screen>
  )
}
