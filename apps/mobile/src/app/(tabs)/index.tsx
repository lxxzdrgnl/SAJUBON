import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { Screen } from '@/components/ui/Screen'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { CardIcon, ICON_PATHS } from '@/components/ui/CardIcon'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { colors, radii } from '@/theme'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles } from '@/lib/queries'
import { pickGreeting } from '@/lib/greetings'

// 일간(오행) 색에 맞춘 운세 배너 — 마스코트 색과 어우러지게 (웹 STEM_BANNER 대응 단색 버전).
const STEM_BANNER: Record<string, string> = {
  갑: '#9FD8D0', 을: '#9FD8D0',
  병: '#F4845F', 정: '#F4845F',
  무: colors.yellow, 기: colors.yellow,
  경: '#E3E7EC', 신: '#E3E7EC',
  임: '#AEB6C4', 계: '#AEB6C4',
}
function bannerColor(stem?: string | null): string {
  return (stem && STEM_BANNER[stem]) || colors.yellow
}

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
  const { user, status } = useAuth()
  const { data: profiles } = useProfiles()
  const gated = (href: '/report/new' | '/compatibility/new') => () =>
    router.push(status === 'authed' ? href : '/auth/login')

  // 대표 만세력 → 없으면 이메일 로컬파트 폴백
  const rep = profiles?.find((p) => p.is_representative) ?? profiles?.[0]
  const name = rep?.name ?? (user?.email ? user.email.split('@')[0] : null)
  const repStem = rep?.day_stem ?? null
  const hourKST = (new Date().getUTCHours() + 9) % 24
  const fortuneSub = name ? pickGreeting(name, hourKST) : '매일 달라지는 나의 하루 흐름'

  return (
    <Screen>
      {/* 헤더 */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <MascotTinted stem={repStem} size={26} />
          <Text className="text-xl font-black text-ink">
            사주<Text className="bg-yellow">구리</Text>
          </Text>
        </View>
      </View>

      {/* 운세 배너 → 오늘의 운세 스토리 */}
      {/* ko.json home.fortuneBanner = "오늘의 운세", home.fortuneSub = "너의 하루는?" */}
      <Pressable onPress={() => router.push('/fortune')}>
        <BrutalShadow radius={radii.card}>
          <View
            className="flex-row items-center gap-3 rounded-2xl border-2 border-ink p-4"
            style={{ backgroundColor: bannerColor(repStem) }}
          >
            <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface">
              <MascotTinted stem={repStem} size={40} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-black text-ink">오늘의 운세</Text>
              <Text className="text-xs font-semibold text-ink">
                {name ? fortuneSub : '너의 하루는?'}
              </Text>
            </View>
            <Chevron />
          </View>
        </BrutalShadow>
      </Pressable>

      {/* ko.json home.sectionTitle = "이런 건 어때?" */}
      <Text className="mb-3 mt-5 text-[15px] font-extrabold text-ink">이런 건 어때?</Text>
      <View className="gap-3">
        {/* ko.json home.cards.manse */}
        <FeatureCard
          d={ICON_PATHS.manse}
          bg="#7BD3C8"
          iconColor={colors.ink}
          title="만세력 보기"
          desc="내 사주 원국을 한눈에"
          onPress={() => router.push('/manse')}
        />
        {/* ko.json home.cards.report */}
        <FeatureCard
          d={ICON_PATHS.doc}
          bg={colors.yellow}
          iconColor={colors.ink}
          title="내 사주 풀리포트"
          badge="10탭"
          desc="결론만 말해주는 AI 해설"
          onPress={gated('/report/new')}
        />
        {/* ko.json home.cards.chat */}
        <FeatureCard
          d={ICON_PATHS.chat}
          bg={colors.teal}
          iconColor="#FFFFFF"
          title="AI 사주 상담"
          desc="묻고 답하며 깊이 보는 내 사주"
          onPress={() => router.push('/chat')}
        />
        {/* ko.json home.cards.question */}
        <FeatureCard
          d={ICON_PATHS.bolt}
          bg={colors.amber}
          iconColor="#FFFFFF"
          title="한줄 상담"
          desc="로그인 없이 한 질문 맛보기"
          onPress={() => router.push('/question')}
        />
        {/* ko.json home.cards.compatibility */}
        <FeatureCard
          d={ICON_PATHS.heart}
          bg={colors.sky}
          iconColor="#FFFFFF"
          title="궁합 리포트"
          desc="두 사람 사주로 보는 케미"
          onPress={gated('/compatibility/new')}
        />
      </View>
    </Screen>
  )
}
