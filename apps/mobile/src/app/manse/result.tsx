import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { calcSaju, type Pillar } from '@sajuguri/api-client'
import { useAuth } from '@/lib/auth/AuthContext'
import { Screen } from '@/components/ui/Screen'
import { Chip } from '@/components/ui/Chip'
import { IljuHero } from '@/components/manse/IljuHero'
import { PillarCard } from '@/components/manse/PillarCard'
import { WuxingBar } from '@/components/manse/WuxingBar'
import { StrengthSection } from '@/components/manse/StrengthSection'
import { TenGodsRow } from '@/components/manse/TenGodsRow'
import { DaeUnRow } from '@/components/manse/DaeUnRow'
import type { ManseBirthInput } from '@/components/manse/BirthInputForm'

export default function ManseResultScreen() {
  const router = useRouter()
  const { api } = useAuth()
  const rawParams = useLocalSearchParams()
  const dataParam = Array.isArray(rawParams.data) ? rawParams.data[0] : rawParams.data
  const birthInput = JSON.parse(dataParam ?? '{}') as ManseBirthInput

  const { data, isLoading, error } = useQuery({
    queryKey: ['saju', dataParam],
    queryFn: () =>
      calcSaju(api, {
        name: birthInput.name || undefined,
        birth_date: birthInput.birth_date,
        birth_time: birthInput.birth_time,
        gender: birthInput.gender,
        calendar: birthInput.calendar,
        is_leap_month: birthInput.is_leap_month,
        birth_longitude: birthInput.birth_longitude,
        birth_utc_offset: birthInput.birth_utc_offset,
        city: birthInput.city,
      }),
    enabled: !!dataParam,
  })

  const pillars: { pillar: Pillar | null; label: string; isDay: boolean }[] = [
    { pillar: data?.hour_pillar ?? null, label: '시주', isDay: false },
    { pillar: data?.day_pillar ?? null, label: '일주', isDay: true },
    { pillar: data?.month_pillar ?? null, label: '월주', isDay: false },
    { pillar: data?.year_pillar ?? null, label: '년주', isDay: false },
  ]

  return (
    <Screen>
      {/* 뒤로 가기 */}
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
      >
        <Text style={{ fontSize: 22, color: '#1A1A1A', marginRight: 4 }}>←</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>만세력 입력</Text>
      </Pressable>

      {isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
          <Text style={{ marginTop: 16, fontSize: 15, fontWeight: '700', color: '#8A8270' }}>
            사주를 계산하는 중...
          </Text>
        </View>
      )}

      {error && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FF6B00' }}>
            오류가 발생했습니다. 다시 시도해주세요.
          </Text>
        </View>
      )}

      {data && (
        <View style={{ gap: 20 }}>
          {/* 메타 정보 */}
          <View style={{ gap: 2 }}>
            {birthInput.name ? (
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#1A1A1A' }}>{birthInput.name}</Text>
            ) : null}
            <Text style={{ fontSize: 13, color: '#8A8270', fontWeight: '600' }}>
              {data.meta.birth_date} {data.meta.birth_time ?? '시간 미상'} · {data.meta.gender === 'male' ? '남성' : '여성'} · {data.meta.calendar === 'solar' ? '양력' : '음력'}
            </Text>
            {birthInput.city ? (
              <Text style={{ fontSize: 12, color: '#8A8270' }}>📍 {birthInput.city}</Text>
            ) : null}
          </View>

          {/* 일주 히어로 */}
          <IljuHero dayPillar={data.day_pillar} />

          {/* 사주 원국 — 시/일/월/년 */}
          <View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 }}>사주 원국</Text>
            {/* 천간 행 */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              {pillars.map(({ pillar, label, isDay }) =>
                pillar ? (
                  <PillarCard key={label} pillar={pillar} kind="stem" label={label} isDay={isDay} />
                ) : (
                  <View key={label} style={{ flex: 1, borderRadius: 11, borderWidth: 2, borderColor: '#E0D9CE', paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', backgroundColor: '#F5F2EC' }}>
                    <Text style={{ fontSize: 10, color: '#C0B8A8', fontWeight: '700' }}>{label}</Text>
                    <Text style={{ fontSize: 20, color: '#C0B8A8', marginTop: 4 }}>—</Text>
                  </View>
                )
              )}
            </View>
            {/* 지지 행 */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {pillars.map(({ pillar, label, isDay }) =>
                pillar ? (
                  <PillarCard key={`${label}-branch`} pillar={pillar} kind="branch" isDay={isDay} />
                ) : (
                  <View key={`${label}-branch`} style={{ flex: 1, borderRadius: 11, borderWidth: 2, borderColor: '#E0D9CE', paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', backgroundColor: '#F5F2EC' }}>
                    <Text style={{ fontSize: 20, color: '#C0B8A8', marginTop: 4 }}>—</Text>
                  </View>
                )
              )}
            </View>
          </View>

          {/* 오행 분포 */}
          <WuxingBar
            wuxingCount={data.wuxing_count}
            dominantElements={data.dominant_elements}
            weakElements={data.weak_elements}
          />

          {/* 일간 강약 / 용신 / 격국 */}
          <StrengthSection
            dayMasterStrength={data.day_master_strength}
            yongSin={data.yong_sin}
            gyeokGuk={data.gyeok_guk}
          />

          {/* 십성 분포 */}
          <TenGodsRow tenGodsDistribution={data.ten_gods_distribution} />

          {/* 대운 */}
          <DaeUnRow
            daeUnList={data.dae_un_list}
            currentDaeUn={data.current_dae_un ?? null}
            daeUnStartAge={data.dae_un_start_age}
          />

          {/* 신살 */}
          {data.sin_sals.length > 0 && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 }}>신살</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {data.sin_sals.map((ss) => (
                  <Chip
                    key={ss.name}
                    label={ss.name}
                    variant={
                      ss.type === 'lucky'
                        ? 'lucky'
                        : ss.type === 'unlucky' || ss.type === 'warning'
                          ? 'unlucky'
                          : 'default'
                    }
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </Screen>
  )
}
