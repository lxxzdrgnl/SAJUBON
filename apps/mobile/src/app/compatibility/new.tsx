/**
 * /compatibility/new — 궁합 리포트 생성 폼.
 * 두 사람 슬롯(MansePickerSheet) → job 제출 → 폴링 → 완료 시 [id]로 이동.
 */

import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as Localization from 'expo-localization'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles } from '@/lib/queries'
import { useJob } from '@/lib/jobs'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { GeneratingIndicator, COMPAT_LOADING_PHRASES } from '@/components/report/GeneratingIndicator'
import { PersonSlot } from '@/components/compat/PersonSlot'
import { createCompatibilityJob } from '@sajuguri/api-client'
import type { BirthInput } from '@sajuguri/api-client'

const LOCALE = Localization.getLocales()[0]?.languageCode === 'ko' ? 'ko' : 'en'

export default function CompatibilityNewScreen() {
  const router = useRouter()
  const { api, status, login } = useAuth()
  const { data: profiles } = useProfiles()

  const [personA, setPersonA] = useState<BirthInput | null>(null)
  const [personB, setPersonB] = useState<BirthInput | null>(null)
  const [topics, setTopics] = useState('')
  const [jobId, setJobId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // job 폴링
  const { status: jobStatus, result_id, error: jobError, isTimeout } = useJob(jobId)

  // done → 궁합 리포트 페이지로 이동
  const navigatedRef = useRef(false)
  useEffect(() => {
    if (jobStatus === 'done' && result_id && !navigatedRef.current) {
      navigatedRef.current = true
      router.replace(`/compatibility/${result_id}` as never)
    }
  }, [jobStatus, result_id, router])

  // ── 로딩 중 ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color: '#8A8270', fontWeight: '600' }}>확인 중...</Text>
        </View>
      </Screen>
    )
  }

  // ── 비로그인 게이트 ────────────────────────────────────────────────────────
  if (status !== 'authed') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            로그인이 필요해요
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            궁합 리포트는 저장·공유를 위해 로그인 후 이용할 수 있어요.
          </Text>
          <Button label="구글로 시작하기" onPress={() => login()} variant="primary" />
        </View>
      </Screen>
    )
  }

  // ── 생성 중 화면 ───────────────────────────────────────────────────────────
  if (jobId !== null && jobStatus !== 'failed' && !isTimeout) {
    return (
      <Screen scroll={false}>
        <GeneratingIndicator
          phrases={COMPAT_LOADING_PHRASES}
          note="AI가 두 사주를 분석 중이에요. 보통 30~60초 정도 걸려요."
        />
      </Screen>
    )
  }

  // ── 오류/타임아웃 화면 ────────────────────────────────────────────────────
  if (jobId !== null && (jobStatus === 'failed' || isTimeout)) {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 8 }}
        >
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            리포트 생성에 실패했어요. 다시 시도해 주세요.
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            {jobError ?? '알 수 없는 오류가 발생했어요.'}
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

  // ── 제출 핸들러 ────────────────────────────────────────────────────────────
  const canSubmit = personA !== null && personB !== null

  const handleSubmit = async () => {
    if (!personA || !personB) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { job_id } = await createCompatibilityJob(api, {
        person_a: personA,
        person_b: personB,
        ...(topics.trim() ? { request_topics: topics.trim() } : {}),
        language: LOCALE,
      })
      navigatedRef.current = false
      setJobId(job_id)
    } catch (e: unknown) {
      const httpStatus = (e as { status?: number })?.status
      if (httpStatus === 401) setSubmitError('로그인이 필요해요. 다시 로그인해 주세요.')
      else if (httpStatus === 429) setSubmitError('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.')
      else setSubmitError('리포트 생성에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 입력 폼 ────────────────────────────────────────────────────────────────
  return (
    <Screen>
      {/* 뒤로가기 */}
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
      >
        <Text style={{ fontSize: 22, color: '#1A1A1A', marginRight: 4 }}>←</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>돌아가기</Text>
      </Pressable>

      <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 }}>
        궁합 리포트
      </Text>
      <Text style={{ fontSize: 13, color: '#8A8270', marginBottom: 24, fontWeight: '600', lineHeight: 20 }}>
        두 사람의 사주로 연애·관계 케미를 결론형 리포트로 분석해 드려요.
      </Text>

      {/* 두 슬롯 나란히 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <View style={{ flex: 1 }}>
          <PersonSlot
            label="나 (첫 번째 사람)"
            profiles={profiles}
            onChange={setPersonA}
            sheetTitle="첫 번째 사람 선택"
          />
        </View>
        <Text style={{ fontSize: 36, color: '#FF6B00', fontWeight: '900', alignSelf: 'center' }}>♥</Text>
        <View style={{ flex: 1 }}>
          <PersonSlot
            label="상대방 (두 번째 사람)"
            profiles={profiles}
            onChange={setPersonB}
            sheetTitle="두 번째 사람 선택"
          />
        </View>
      </View>

      {/* 추가 주제 */}
      <BrutalCard intensity="soft" style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 }}>
          더 알고 싶은 주제 (선택)
        </Text>
        <TextInput
          value={topics}
          onChangeText={setTopics}
          placeholder="예: 결혼 시기, 다툼이 잦은 이유"
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
          }}
          maxLength={100}
        />
        <Text style={{ fontSize: 12, color: '#C0B8A8', marginTop: 4 }}>
          쉼표로 여러 주제를 적으면 각각 별도 탭으로 분석해요.
        </Text>
      </BrutalCard>

      {/* 오류 메시지 */}
      {submitError && (
        <Text style={{ fontSize: 12, color: '#FF6B00', fontWeight: '700', marginBottom: 12 }}>
          {submitError}
        </Text>
      )}

      {/* 제출 버튼 */}
      <Button
        label={submitting ? '궁합 분석 중...' : '궁합 보기'}
        onPress={handleSubmit}
        variant="strong"
        disabled={submitting || !canSubmit}
      />
    </Screen>
  )
}
