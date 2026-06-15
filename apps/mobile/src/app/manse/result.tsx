import { ActivityIndicator, Alert, Pressable, Share, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { calcSaju, createProfile, type Pillar } from '@sajuguri/api-client'
import { useState, useEffect } from 'react'
import { enrichRecentInputDayStem } from '@sajuguri/core'
import { useAuth } from '@/lib/auth/AuthContext'
import { rnStorage } from '@/lib/storage'
import { Screen } from '@/components/ui/Screen'
import { IljuHero } from '@/components/manse/IljuHero'
import { PillarCard } from '@/components/manse/PillarCard'
import { TagChips } from '@/components/manse/TagChips'
import { HapChungPanel } from '@/components/manse/HapChungPanel'
import { DetailAccordion } from '@/components/manse/DetailAccordion'
import { WuxingFeatureTable } from '@/components/manse/WuxingFeatureTable'
import { WuxingBar } from '@/components/manse/WuxingBar'
import { TenGodsRow } from '@/components/manse/TenGodsRow'
import { StrengthSection } from '@/components/manse/StrengthSection'
import { DaeUnRow } from '@/components/manse/DaeUnRow'
import { YeonWolUn } from '@/components/manse/YeonWolUn'
import { IlJinCalendar } from '@/components/manse/IlJinCalendar'
import type { ManseBirthInput } from '@/components/manse/BirthInputForm'

export default function ManseResultScreen() {
  const router = useRouter()
  const { api, status } = useAuth()
  const queryClient = useQueryClient()
  const rawParams = useLocalSearchParams()
  const dataParam = Array.isArray(rawParams.data) ? rawParams.data[0] : rawParams.data
  const birthInput = JSON.parse(dataParam ?? '{}') as ManseBirthInput
  const [saving, setSaving] = useState(false)

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

  // day_stem 보강 — 최근 본 만세력 너구리 아바타 색 동기화 (web RecentEnricher 대응)
  useEffect(() => {
    if (!data || !birthInput.birth_date || !birthInput.gender) return
    void enrichRecentInputDayStem(
      rnStorage,
      {
        birth_date: birthInput.birth_date,
        birth_time: birthInput.birth_time,
        gender: birthInput.gender,
        calendar: birthInput.calendar ?? 'solar',
      },
      data.day_pillar.stem,
    )
  }, [data, birthInput.birth_date, birthInput.birth_time, birthInput.gender, birthInput.calendar])

  const pillars: { pillar: Pillar | null; label: string; isDay: boolean }[] = [
    { pillar: data?.hour_pillar ?? null, label: '생시', isDay: false },
    { pillar: data?.day_pillar ?? null, label: '생일', isDay: true },
    { pillar: data?.month_pillar ?? null, label: '생월', isDay: false },
    { pillar: data?.year_pillar ?? null, label: '생년', isDay: false },
  ]

  async function handleShare() {
    try {
      await Share.share({
        title: '내 만세력',
        message: `${birthInput.name ? birthInput.name + '의 ' : ''}만세력 — ${birthInput.birth_date}`,
      })
    } catch {}
  }

  async function handleSave() {
    if (!data) return
    setSaving(true)
    try {
      await createProfile(api, {
        name: birthInput.name || '이름 없음',
        birth_date: birthInput.birth_date,
        birth_time: birthInput.birth_time,
        calendar: birthInput.calendar,
        gender: birthInput.gender,
        is_leap_month: birthInput.is_leap_month,
        city: birthInput.city ?? null,
        longitude: birthInput.birth_longitude ?? null,
      })
      await queryClient.invalidateQueries({ queryKey: ['profiles'] })
      Alert.alert('저장 완료', '만세력이 저장됐어요.')
    } catch {
      Alert.alert('저장 실패', '다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

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
            계산에 실패했어요. 입력을 확인해주세요
          </Text>
        </View>
      )}

      {data && (
        <View style={{ gap: 16 }}>
          {/* 메타 정보 */}
          <View style={{ gap: 2 }}>
            {birthInput.name ? (
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#1A1A1A' }}>{birthInput.name}</Text>
            ) : null}
            <Text style={{ fontSize: 13, color: '#8A8270', fontWeight: '600' }}>
              {data.meta.birth_date} {data.meta.birth_time ?? '시간 미상'} · {data.meta.gender === 'male' ? '남성' : '여성'} · {data.meta.calendar === 'solar' ? '양력' : '음력'}
            </Text>
          </View>

          {/* 일주 히어로 */}
          <IljuHero dayPillar={data.day_pillar} label="내 일주" />

          {/* 태그 칩 */}
          <TagChips data={data} />

          {/* 사주팔자 */}
          <View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 }}>사주팔자</Text>
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

          {/* 합충 분석 */}
          <HapChungPanel data={data} />

          {/* 12운성·신살·지장간 상세 */}
          <DetailAccordion data={data} />

          {/* 오행 특성 참고표 */}
          <WuxingFeatureTable data={data} />

          {/* 오행 밸런스 */}
          <WuxingBar data={data} />

          {/* 십성 구조 */}
          <TenGodsRow data={data} />

          {/* 일간 강약 · 용신 */}
          <StrengthSection data={data} />

          {/* 대운 */}
          <DaeUnRow data={data} />

          {/* 연운 · 월운 */}
          <YeonWolUn dayStem={data.day_pillar.stem} />

          {/* 일진 달력 */}
          <IlJinCalendar />

          {/* CTAs */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Pressable
              onPress={() => router.push({ pathname: '/report/new', params: { data: dataParam } })}
              style={{
                flex: 1, borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A',
                backgroundColor: '#FF6B00', paddingVertical: 12, alignItems: 'center',
                shadowColor: '#1A1A1A', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>AI 리포트 생성</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/chat' as any)}
              style={{
                flex: 1, borderRadius: 12, borderWidth: 2, borderColor: '#00C2B8',
                backgroundColor: '#E0FAF8', paddingVertical: 12, alignItems: 'center',
                shadowColor: '#1A1A1A', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#00665F' }}>상담하기</Text>
            </Pressable>
          </View>

          {/* 공유 */}
          <Pressable
            onPress={handleShare}
            style={{
              borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A',
              backgroundColor: '#FAFAF7', paddingVertical: 12, alignItems: 'center',
              shadowColor: '#1A1A1A', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>공유하기</Text>
          </Pressable>

          {/* 저장 (로그인 시) */}
          {status === 'authed' && (
            <Pressable
              onPress={saving ? undefined : handleSave}
              style={{
                borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A',
                backgroundColor: '#FFDE21', paddingVertical: 12, alignItems: 'center',
                shadowColor: '#1A1A1A', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
                opacity: saving ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>{saving ? '저장 중...' : '이 만세력 저장'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </Screen>
  )
}
