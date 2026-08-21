import { ActivityIndicator, Alert, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { calcSaju, createProfile, type Pillar } from '@sajuguri/api-client'
import { useState, useEffect } from 'react'
import { enrichRecentInputDayStem } from '@sajuguri/core'
import { useAuth } from '@/lib/auth/AuthContext'
import { rnStorage } from '@/lib/storage'
import { useShare } from '@/lib/useShare'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
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
  const { sharing, share } = useShare()

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
    await share(() =>
      Promise.resolve(
        `${birthInput.name ? birthInput.name + '의 ' : ''}만세력 — ${birthInput.birth_date}`,
      ),
    )
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
                  <View key={label} style={{ flex: 1, borderRadius: 11, borderWidth: 2, borderColor: '#1A1A1A', borderStyle: 'dashed', paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#8A8270', fontWeight: '700' }}>{label}</Text>
                    <Text style={{ fontSize: 20, color: '#8A8270', marginTop: 4 }}>—</Text>
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
                  <View key={`${label}-branch`} style={{ flex: 1, borderRadius: 11, borderWidth: 2, borderColor: '#1A1A1A', borderStyle: 'dashed', paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, color: '#8A8270' }}>—</Text>
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

          {/* CTAs — 웹 result/page.tsx 순서와 동일 */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <Button
                label="AI 리포트 생성"
                variant="strong"
                onPress={() => router.push({ pathname: '/report/new', params: { data: dataParam } })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="상담하기"
                variant="secondary"
                onPress={() => router.push('/chat' as any)}
              />
            </View>
          </View>

          <Button
            label={sharing ? '공유 중...' : '공유하기'}
            variant="ghost"
            onPress={handleShare}
            disabled={sharing}
          />

          {status === 'authed' && (
            <Button
              label={saving ? '저장 중...' : '이 만세력 저장'}
              variant="primary"
              onPress={handleSave}
              disabled={saving}
            />
          )}
        </View>
      )}
    </Screen>
  )
}
