import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles } from '@/lib/queries'
import { useJob } from '@/lib/jobs'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { BirthInputForm, type ManseBirthInput } from '@/components/manse/BirthInputForm'
import { GeneratingIndicator } from '@/components/report/GeneratingIndicator'
import { createReportJob, type CreateReportBody } from '@sajuguri/api-client'
import type { ProfileResponse } from '@sajuguri/api-client'

type InputMode = 'profile' | 'manual'

// ── 프로필 선택 칩 ─────────────────────────────────────────────────────────────

function ProfileChip({
  profile,
  selected,
  onPress,
}: {
  profile: ProfileResponse
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 2,
        borderColor: selected ? '#FF6B00' : '#1A1A1A',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: selected ? '#FFF4E3' : '#FAFAF7',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View style={{ gap: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>
          {profile.name || '이름 없음'}
        </Text>
        <Text style={{ fontSize: 11, color: '#8A8270', fontWeight: '600' }}>
          {profile.birth_date}
          {profile.birth_time ? ` ${profile.birth_time}` : ' 시간 미상'} ·{' '}
          {profile.gender === 'male' ? '남성' : '여성'}
        </Text>
      </View>
      {selected && (
        <Text style={{ fontSize: 12, color: '#FF6B00', fontWeight: '900', marginLeft: 'auto' }}>
          ✓
        </Text>
      )}
    </Pressable>
  )
}

// ── 메인 스크린 ────────────────────────────────────────────────────────────────

export default function ReportNewScreen() {
  const router = useRouter()
  const { api, status, login } = useAuth()
  const { data: profiles } = useProfiles()

  const [inputMode, setInputMode] = useState<InputMode>('profile')
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null)
  const [requestTopics, setRequestTopics] = useState('')
  const [jobId, setJobId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 첫 프로필 자동 선택
  useEffect(() => {
    if (profiles && profiles.length > 0 && selectedProfileId === null) {
      const rep = profiles.find((p) => p.is_representative) ?? profiles[0]
      setSelectedProfileId(rep.id)
    }
  }, [profiles, selectedProfileId])

  // 프로필 없으면 수동 입력 모드로
  useEffect(() => {
    if (profiles && profiles.length === 0) {
      setInputMode('manual')
    }
  }, [profiles])

  // job 폴링
  const { status: jobStatus, result_id, error: jobError, isTimeout } = useJob(jobId)

  // done → 리포트 페이지로 이동
  const navigatedRef = useRef(false)
  useEffect(() => {
    if (jobStatus === 'done' && result_id && !navigatedRef.current) {
      navigatedRef.current = true
      router.replace(`/report/${result_id}` as never)
    }
  }, [jobStatus, result_id, router])

  // ── 비로그인 게이트 ──────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color: '#8A8270', fontWeight: '600' }}>불러오는 중...</Text>
        </View>
      </Screen>
    )
  }

  if (status !== 'authed') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            로그인이 필요합니다
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            사주 리포트는 로그인 후 이용하실 수 있어요.
          </Text>
          <Button label="로그인하기" onPress={() => login()} variant="primary" />
        </View>
      </Screen>
    )
  }

  // ── 생성 중 화면 ─────────────────────────────────────────────────────────────
  if (jobId !== null && jobStatus !== 'failed' && !isTimeout) {
    const loadingMessages: Record<string, string> = {
      pending: '대기 중이에요...',
      running: '사주를 분석하는 중이에요...',
      done: '리포트를 불러오는 중이에요...',
    }
    return (
      <Screen scroll={false}>
        <GeneratingIndicator
          message={jobStatus ? loadingMessages[jobStatus] : '사주를 분석하는 중이에요...'}
        />
      </Screen>
    )
  }

  // ── 오류/타임아웃 화면 ───────────────────────────────────────────────────────
  if (jobId !== null && (jobStatus === 'failed' || isTimeout)) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 40 }}>😔</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            {isTimeout ? '시간이 너무 걸렸어요' : '리포트 생성에 실패했어요'}
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            {isTimeout
              ? '잠시 후 다시 시도해주세요.'
              : jobError ?? '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해주세요.'}
          </Text>
          <Button
            label="다시 시도"
            onPress={() => {
              setJobId(null)
              navigatedRef.current = false
            }}
            variant="primary"
          />
        </View>
      </Screen>
    )
  }

  // ── 입력 폼 ─────────────────────────────────────────────────────────────────

  const handleProfileSubmit = async () => {
    if (!selectedProfileId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body: CreateReportBody = {
        profile_id: selectedProfileId,
        birth_input: profileToBirthInput(
          profiles!.find((p) => p.id === selectedProfileId)!,
        ),
        request_topics: requestTopics.trim() || undefined,
        language: 'ko',
      }
      const { job_id } = await createReportJob(api, body)
      navigatedRef.current = false
      setJobId(job_id)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleManualSubmit = async (input: ManseBirthInput) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body: CreateReportBody = {
        birth_input: {
          name: input.name || undefined,
          birth_date: input.birth_date,
          birth_time: input.birth_time,
          gender: input.gender,
          calendar: input.calendar,
          is_leap_month: input.is_leap_month,
          birth_longitude: input.birth_longitude,
          birth_utc_offset: input.birth_utc_offset,
          city: input.city,
        },
        request_topics: requestTopics.trim() || undefined,
        language: 'ko',
      }
      const { job_id } = await createReportJob(api, body)
      navigatedRef.current = false
      setJobId(job_id)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const hasProfiles = profiles && profiles.length > 0

  return (
    <Screen>
      {/* 헤더 */}
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
      >
        <Text style={{ fontSize: 22, color: '#1A1A1A', marginRight: 4 }}>←</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>돌아가기</Text>
      </Pressable>

      <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 }}>
        사주 리포트 생성
      </Text>
      <Text style={{ fontSize: 13, color: '#8A8270', marginBottom: 24, fontWeight: '600' }}>
        AI가 당신의 사주를 깊이 분석한 리포트를 만들어드려요
      </Text>

      {/* 입력 모드 탭 (프로필이 있을 때만) */}
      {hasProfiles && (
        <View
          style={{
            flexDirection: 'row',
            borderWidth: 2,
            borderColor: '#1A1A1A',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          {(['profile', 'manual'] as InputMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setInputMode(mode)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: inputMode === mode ? '#1A1A1A' : '#FAFAF7',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: inputMode === mode ? '#FFFFFF' : '#1A1A1A',
                }}
              >
                {mode === 'profile' ? '저장된 프로필' : '직접 입력'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* 프로필 선택 */}
      {inputMode === 'profile' && hasProfiles && (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A8270' }}>프로필 선택</Text>
          <View style={{ gap: 8 }}>
            {profiles!.map((p) => (
              <ProfileChip
                key={p.id}
                profile={p}
                selected={selectedProfileId === p.id}
                onPress={() => setSelectedProfileId(p.id)}
              />
            ))}
          </View>

          {/* 추가 요청 주제 */}
          <RequestTopicsInput value={requestTopics} onChange={setRequestTopics} />

          {submitError && (
            <Text style={{ fontSize: 12, color: '#FF6B00', fontWeight: '700' }}>{submitError}</Text>
          )}

          <Button
            label={submitting ? '리포트 생성 중...' : '리포트 생성하기'}
            onPress={handleProfileSubmit}
            variant="strong"
            disabled={submitting || !selectedProfileId}
          />
        </View>
      )}

      {/* 직접 입력 */}
      {inputMode === 'manual' && (
        <View style={{ gap: 12 }}>
          {/* 추가 요청 주제 */}
          <RequestTopicsInput value={requestTopics} onChange={setRequestTopics} />

          {submitError && (
            <Text style={{ fontSize: 12, color: '#FF6B00', fontWeight: '700' }}>{submitError}</Text>
          )}

          <BirthInputForm
            onSubmit={handleManualSubmit}
            submitLabel={submitting ? '리포트 생성 중...' : '리포트 생성하기'}
            busy={submitting}
          />
        </View>
      )}
    </Screen>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

function profileToBirthInput(p: ProfileResponse): CreateReportBody['birth_input'] {
  return {
    name: p.name,
    birth_date: p.birth_date,
    birth_time: p.birth_time,
    gender: p.gender as 'male' | 'female',
    calendar: (p.calendar as 'solar' | 'lunar') ?? 'solar',
    is_leap_month: p.is_leap_month,
    birth_longitude: p.longitude ?? undefined,
    city: p.city ?? undefined,
  }
}

function RequestTopicsInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <BrutalCard intensity="soft">
      <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A8270', marginBottom: 6 }}>
        추가 요청 주제 (선택)
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="예: 2026년 이직 운, 연애·결혼 전망"
        placeholderTextColor="#C0B8A8"
        multiline
        numberOfLines={2}
        style={{
          borderWidth: 2,
          borderColor: '#1A1A1A',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          fontWeight: '600',
          color: '#1A1A1A',
          backgroundColor: '#FAFAF7',
          minHeight: 60,
          textAlignVertical: 'top',
        }}
      />
      <Text style={{ fontSize: 11, color: '#C0B8A8', marginTop: 4 }}>
        원하는 주제를 입력하면 해당 탭이 추가됩니다
      </Text>
    </BrutalCard>
  )
}
