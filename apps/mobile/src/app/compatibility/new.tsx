/**
 * /compatibility/new — 궁합 리포트 생성 폼.
 * 두 사람 슬롯(프로필 선택 또는 직접 입력) → job 제출 → 폴링 → 완료 시 [id]로 이동.
 */

import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles } from '@/lib/queries'
import { useJob } from '@/lib/jobs'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { GeneratingIndicator } from '@/components/report/GeneratingIndicator'
import { PersonSlot } from '@/components/compat/PersonSlot'
import { createCompatibilityJob } from '@sajuguri/api-client'
import type { BirthInput } from '@sajuguri/api-client'

export default function CompatibilityNewScreen() {
  const router = useRouter()
  const { api, status, login } = useAuth()
  const { data: profiles } = useProfiles()

  const [personA, setPersonA] = useState<BirthInput | null>(null)
  const [personB, setPersonB] = useState<BirthInput | null>(null)
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
          <Text style={{ fontSize: 14, color: '#8A8270', fontWeight: '600' }}>불러오는 중...</Text>
        </View>
      </Screen>
    )
  }

  // ── 비로그인 게이트 ────────────────────────────────────────────────────────
  if (status !== 'authed') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            로그인이 필요합니다
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            궁합 리포트는 로그인 후 이용하실 수 있어요.
          </Text>
          <Button label="로그인하기" onPress={() => login()} variant="primary" />
        </View>
      </Screen>
    )
  }

  // ── 생성 중 화면 ───────────────────────────────────────────────────────────
  if (jobId !== null && jobStatus !== 'failed' && !isTimeout) {
    const loadingMessages: Record<string, string> = {
      pending: '대기 중이에요...',
      running: '궁합을 분석하는 중이에요...',
      done: '리포트를 불러오는 중이에요...',
    }
    return (
      <Screen scroll={false}>
        <GeneratingIndicator
          message={jobStatus ? (loadingMessages[jobStatus] ?? '궁합을 분석하는 중이에요...') : '궁합을 분석하는 중이에요...'}
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
          <Text style={{ fontSize: 40 }}>😔</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            {isTimeout ? '시간이 너무 걸렸어요' : '궁합 리포트 생성에 실패했어요'}
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            {isTimeout
              ? '잠시 후 다시 시도해주세요.'
              : (jobError ?? '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해주세요.')}
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
        language: 'ko',
      })
      navigatedRef.current = false
      setJobId(job_id)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '오류가 발생했어요. 다시 시도해주세요.')
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
        궁합 리포트 생성
      </Text>
      <Text style={{ fontSize: 13, color: '#8A8270', marginBottom: 24, fontWeight: '600' }}>
        두 사람의 사주로 AI가 궁합을 분석해드려요
      </Text>

      {/* 사람 A 슬롯 */}
      <View style={{ marginBottom: 16 }}>
        <PersonSlot
          label="첫 번째 사람"
          profiles={profiles}
          onChange={setPersonA}
        />
      </View>

      {/* 구분선 */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: '#FF6B00',
            backgroundColor: '#FFF4E3',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#FF6B00' }}>♥</Text>
        </View>
      </View>

      {/* 사람 B 슬롯 */}
      <View style={{ marginBottom: 24 }}>
        <PersonSlot
          label="두 번째 사람"
          profiles={profiles}
          onChange={setPersonB}
        />
      </View>

      {/* 오류 메시지 */}
      {submitError && (
        <Text style={{ fontSize: 12, color: '#FF6B00', fontWeight: '700', marginBottom: 12 }}>
          {submitError}
        </Text>
      )}

      {/* 제출 버튼 */}
      <Button
        label={submitting ? '궁합 분석 중...' : '궁합 리포트 생성하기'}
        onPress={handleSubmit}
        variant="strong"
        disabled={submitting || !canSubmit}
      />

      {!canSubmit && (
        <Text style={{ fontSize: 11, color: '#C0B8A8', textAlign: 'center', marginTop: 8 }}>
          두 사람의 정보를 모두 입력하면 분석을 시작해요
        </Text>
      )}
    </Screen>
  )
}
