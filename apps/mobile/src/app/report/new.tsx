import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as Localization from 'expo-localization'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles } from '@/lib/queries'
import { useJob } from '@/lib/jobs'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { GeneratingIndicator, REPORT_LOADING_PHRASES } from '@/components/report/GeneratingIndicator'
import { MansePickerSheet, type MansePick } from '@/components/manse/MansePickerSheet'
import { createReportJob, type CreateReportBody } from '@sajuguri/api-client'

const LOCALE = Localization.getLocales()[0]?.languageCode === 'ko' ? 'ko' : 'en'

export default function ReportNewScreen() {
  const router = useRouter()
  const { api, status, login } = useAuth()
  const { data: profiles } = useProfiles()
  // 홈 모달에서 넘어온 만세력 data — 있으면 그걸로 시작 (피커 스킵)
  const params = useLocalSearchParams<{ data?: string }>()
  const dataParam = Array.isArray(params.data) ? params.data[0] : params.data

  const [sheetOpen, setSheetOpen] = useState(false)
  const [pickedBirth, setPickedBirth] = useState<MansePick | null>(() => {
    if (!dataParam) return null
    try {
      return JSON.parse(dataParam) as MansePick
    } catch {
      return null
    }
  })
  const [requestTopics, setRequestTopics] = useState('')
  const [jobId, setJobId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { status: jobStatus, result_id, error: jobError, isTimeout } = useJob(jobId)
  const navigatedRef = useRef(false)

  useEffect(() => {
    if (jobStatus === 'done' && result_id && !navigatedRef.current) {
      navigatedRef.current = true
      router.replace(`/report/${result_id}` as never)
    }
  }, [jobStatus, result_id, router])

  // Auto-open picker on first load when authed and no birth picked yet
  useEffect(() => {
    if (status === 'authed' && profiles !== undefined && !pickedBirth) {
      setSheetOpen(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, profiles])

  // ── 로딩 ────────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color: '#8A8270', fontWeight: '600' }}>확인 중...</Text>
        </View>
      </Screen>
    )
  }

  // ── 비로그인 ─────────────────────────────────────────────────────────────────
  if (status !== 'authed') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            로그인이 필요해요
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            리포트는 로그인한 사용자만 생성하고 저장할 수 있어요.
          </Text>
          <Button label="구글로 로그인" onPress={() => login()} variant="primary" />
        </View>
      </Screen>
    )
  }

  // ── 생성 중 ──────────────────────────────────────────────────────────────────
  if (jobId !== null && jobStatus !== 'failed' && !isTimeout) {
    return (
      <Screen scroll={false}>
        <GeneratingIndicator
          phrases={REPORT_LOADING_PHRASES}
          note="AI가 사주를 분석 중이에요. 보통 30~60초 정도 걸려요."
        />
      </Screen>
    )
  }

  // ── 오류/타임아웃 ─────────────────────────────────────────────────────────────
  if (jobId !== null && (jobStatus === 'failed' || isTimeout)) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            리포트 생성에 실패했어요. 잠시 후 다시 시도해 주세요.
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            {jobError ?? '알 수 없는 오류가 발생했어요.'}
          </Text>
          <Button
            label="다시 시도"
            onPress={() => { setJobId(null); navigatedRef.current = false }}
            variant="primary"
          />
        </View>
      </Screen>
    )
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!pickedBirth) { setSheetOpen(true); return }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body: CreateReportBody = {
        ...(pickedBirth.profile_id ? { profile_id: pickedBirth.profile_id } : {}),
        birth_input: {
          name: pickedBirth.name || undefined,
          birth_date: pickedBirth.birth_date,
          birth_time: pickedBirth.birth_time,
          gender: pickedBirth.gender,
          calendar: pickedBirth.calendar,
          is_leap_month: pickedBirth.is_leap_month,
          birth_longitude: pickedBirth.birth_longitude,
        },
        ...(requestTopics.trim() ? { request_topics: requestTopics.trim() } : {}),
        language: LOCALE,
      }
      const { job_id } = await createReportJob(api, body)
      navigatedRef.current = false
      setJobId(job_id)
    } catch (e: unknown) {
      const httpStatus = (e as { status?: number })?.status
      if (httpStatus === 401) setSubmitError('로그인이 필요해요.')
      else if (httpStatus === 429) setSubmitError('오늘 생성 가능한 리포트 수를 초과했어요. 내일 다시 시도해 주세요.')
      else setSubmitError('리포트 생성에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 폼 화면 ───────────────────────────────────────────────────────────────────
  return (
    <Screen>
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
      >
        <Text style={{ fontSize: 22, color: '#1A1A1A', marginRight: 4 }}>←</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>돌아가기</Text>
      </Pressable>

      <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 }}>
        AI 리포트 생성
      </Text>
      <Text style={{ fontSize: 13, color: '#8A8270', marginBottom: 24, fontWeight: '600', lineHeight: 20 }}>
        사주를 분석해 10가지 주제로 헤드라인 리포트를 만들어 드려요. 추가로 궁금한 주제를 입력하면 함께 포함해드려요.
      </Text>

      {/* 선택된 만세력 또는 선택 버튼 */}
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={{
          borderWidth: 2,
          borderColor: pickedBirth ? '#FF6B00' : '#1A1A1A',
          borderRadius: 14,
          padding: 14,
          backgroundColor: pickedBirth ? '#FFF4E3' : '#FAFAF7',
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {pickedBirth ? (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1A1A1A' }}>
              {pickedBirth.name || '이름 없음'}
            </Text>
            <Text style={{ fontSize: 12, color: '#8A8270', fontWeight: '600' }}>
              {pickedBirth.birth_date}{pickedBirth.birth_time ? ` ${pickedBirth.birth_time}` : ' 시간 미상'} · {pickedBirth.gender === 'male' ? '남성' : '여성'}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>
            만세력 선택하기
          </Text>
        )}
        <Text style={{ fontSize: 14, color: '#8A8270' }}>{pickedBirth ? '다시 선택' : '+'}</Text>
      </Pressable>

      {/* 추가 요청 주제 */}
      <BrutalCard intensity="soft" style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 }}>
          추가로 보고 싶은 것 (선택)
        </Text>
        <TextInput
          value={requestTopics}
          onChangeText={setRequestTopics}
          placeholder="이직 시기, 부모님 건강, 올해 재물운"
          placeholderTextColor="#C0B8A8"
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
            minHeight: 48,
          }}
          maxLength={100}
        />
        <Text style={{ fontSize: 11, color: '#C0B8A8', marginTop: 4 }}>
          쉼표로 구분해 여러 주제를 입력할 수 있어요
        </Text>
      </BrutalCard>

      {submitError && (
        <Text style={{ fontSize: 12, color: '#FF6B00', fontWeight: '700', marginBottom: 12 }}>
          {submitError}
        </Text>
      )}

      <Button
        label={submitting ? '리포트 생성 중...' : '리포트 생성'}
        onPress={handleSubmit}
        variant="strong"
        disabled={submitting || !pickedBirth}
      />

      <MansePickerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles ?? []}
        title="누구의 사주로 볼까요?"
        onPick={(pick) => {
          setPickedBirth(pick)
          setSheetOpen(false)
        }}
      />
    </Screen>
  )
}
