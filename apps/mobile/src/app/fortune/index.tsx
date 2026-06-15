/**
 * /fortune 라우트 — 오늘의 운세 스토리 풀스크린.
 * 대표 프로필이 있으면 바로 스토리 생성, 없으면 MansePickerSheet 표시.
 * 탭 크롬 없음 (standalone 스택 스크린).
 */
import { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { createDailyStory } from '@sajuguri/api-client'
import type { DailyStoryResponse } from '@sajuguri/api-client'
import type { SajuCalcRequest } from '@sajuguri/api-client'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles } from '@/lib/queries'
import type { ProfileResponse } from '@sajuguri/api-client'
import { MansePickerSheet, type MansePick } from '@/components/manse/MansePickerSheet'
import { StoryPager } from '@/components/fortune/StoryPager'

// ── 날짜 유틸 ─────────────────────────────────────────────────────────────────

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── 프로필 → SajuCalcRequest 변환 ────────────────────────────────────────────

function profileToCalcRequest(profile: ProfileResponse): SajuCalcRequest {
  return {
    name: profile.name,
    birth_date: profile.birth_date,
    birth_time: profile.birth_time,
    gender: profile.gender as 'male' | 'female',
    calendar: profile.calendar as 'solar' | 'lunar',
    is_leap_month: profile.is_leap_month,
    birth_longitude: profile.longitude ?? undefined,
    city: profile.city ?? undefined,
  }
}

// ── MansePick → SajuCalcRequest 변환 ─────────────────────────────────────────

function mansePickToCalcRequest(pick: MansePick): SajuCalcRequest {
  return {
    name: pick.name || undefined,
    birth_date: pick.birth_date,
    birth_time: pick.birth_time,
    gender: pick.gender,
    calendar: pick.calendar,
    is_leap_month: pick.is_leap_month,
    birth_longitude: pick.birth_longitude,
  }
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function FortunePage() {
  const router = useRouter()
  const { api, status } = useAuth()
  const insets = useSafeAreaInsets()
  const { data: profiles, isLoading: profilesLoading } = useProfiles()

  const [story, setStory] = useState<DailyStoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 프로필 없을 때 BirthInputForm을 보여줄지 여부
  const [showForm, setShowForm] = useState(false)

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)')
  }, [router])

  // 스토리 생성 공통 함수
  const fetchStory = useCallback(async (calcReq: SajuCalcRequest) => {
    setLoading(true)
    setError(null)
    try {
      const data = await createDailyStory(api, {
        birth_input: calcReq,
        date: todayLocal(),
        language: 'ko',
      })
      setStory(data)
    } catch {
      setError('운세를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [api])

  // 대표 프로필 자동 로드
  useEffect(() => {
    // 아직 프로필 로딩 중이거나 이미 스토리가 있으면 스킵
    if (profilesLoading || story) return

    if (status === 'authed' && profiles) {
      const rep = profiles.find((p) => p.is_representative) ?? profiles[0]
      if (rep) {
        fetchStory(profileToCalcRequest(rep))
      } else {
        // 프로필 없음 → 폼 표시
        setShowForm(true)
      }
    } else if (status === 'guest') {
      // 게스트: 폼 바로 표시
      setShowForm(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, profiles, profilesLoading])

  // MansePickerSheet 픽
  const handlePick = useCallback(async (pick: MansePick) => {
    await fetchStory(mansePickToCalcRequest(pick))
  }, [fetchStory])

  // ── 스토리 완성 → StoryPager ──────────────────────────────────────────────
  if (story) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <StoryPager story={story} onClose={handleClose} />
      </View>
    )
  }

  // ── 로딩 상태 ─────────────────────────────────────────────────────────────
  if (loading || (status === 'loading') || (status === 'authed' && profilesLoading)) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#FFFBF2',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          paddingTop: insets.top,
        }}
      >
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#8A8270' }}>
          운세를 분석하고 있어요
        </Text>
      </View>
    )
  }

  // ── 에러 상태 ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#FFFBF2',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: insets.top,
          gap: 20,
        }}
      >
        <Text style={{ fontSize: 15, color: '#8A8270', textAlign: 'center', lineHeight: 22 }}>
          {error}
        </Text>
        <Pressable
          onPress={handleClose}
          style={{
            borderWidth: 2,
            borderColor: '#1A1A1A',
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#1A1A1A' }}>홈으로</Text>
        </Pressable>
      </View>
    )
  }

  // ── 시트 모드 (프로필 없는 경우) ─────────────────────────────────────────────
  // showForm일 때는 크림 배경 위에 MansePickerSheet 오버레이.
  // sheet를 닫으면 뒤로 돌아간다 (onClose = handleClose).
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFFBF2',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: insets.top,
      }}
    >
      <ActivityIndicator size="large" color="#1A1A1A" />
      <MansePickerSheet
        open={showForm}
        onClose={handleClose}
        profiles={profiles ?? []}
        title="누구의 운세를 볼까요?"
        onPick={handlePick}
      />
    </View>
  )
}
