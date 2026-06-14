/**
 * /question — 한 번 물어보기 (한줄 상담).
 * - 게스트 허용 (질문 자체는 로그인 불필요)
 * - 사주 주체: 저장된 프로필 칩 선택 OR BirthInputForm 직접 입력
 * - 카테고리 선택 → 질문 TextInput → askQuestion API
 * - 결과: headline (굵음) + content (Markdown) + 공유/다시하기
 * - 로그인 시: 최근 상담 기록 (listConsultations) 하단 표시 + 삭제/공유
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Alert,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  askQuestion,
  deleteConsultation,
  shareConsultation,
  type ConsultationResponse,
  type ConsultationHistoryItem,
  type ProfileResponse,
  type QuestionCategory,
  type QuestionRequest,
} from '@sajuguri/api-client'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles, useConsultations } from '@/lib/queries'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { BirthInputForm, type ManseBirthInput } from '@/components/manse/BirthInputForm'
import { AnswerCard } from '@/components/question/AnswerCard'
import { HistoryItem } from '@/components/question/HistoryItem'
import { CategorySelector } from '@/components/question/CategorySelector'
import { useQueryClient } from '@tanstack/react-query'

// ── 타입 ────────────────────────────────────────────────────────────────────────

type InputMode = 'profile' | 'manual'

/** 사주 주체 (선택된 프로필 or 직접 입력 값) */
interface SajuSubject {
  birth_date: string
  birth_time: string | null
  gender: 'male' | 'female'
  calendar: 'solar' | 'lunar'
  is_leap_month: boolean
  birth_longitude?: number
  birth_utc_offset?: number
  name?: string
  day_stem?: string | null
}

function profileToSubject(p: ProfileResponse): SajuSubject {
  return {
    birth_date: p.birth_date,
    birth_time: p.birth_time,
    gender: p.gender as 'male' | 'female',
    calendar: (p.calendar as 'solar' | 'lunar') ?? 'solar',
    is_leap_month: p.is_leap_month,
    birth_longitude: p.longitude ?? undefined,
    name: p.name,
    day_stem: p.day_stem,
  }
}

function manseToSubject(input: ManseBirthInput): SajuSubject {
  return {
    birth_date: input.birth_date,
    birth_time: input.birth_time,
    gender: input.gender,
    calendar: input.calendar,
    is_leap_month: input.is_leap_month,
    birth_longitude: input.birth_longitude,
    birth_utc_offset: input.birth_utc_offset,
    name: input.name || undefined,
  }
}

function subjectToRequest(subject: SajuSubject, question: string, category?: QuestionCategory): QuestionRequest {
  return {
    birth_date: subject.birth_date,
    birth_time: subject.birth_time,
    gender: subject.gender,
    calendar: subject.calendar,
    is_leap_month: subject.is_leap_month,
    ...(subject.birth_longitude != null ? { birth_longitude: subject.birth_longitude } : {}),
    ...(subject.birth_utc_offset != null ? { birth_utc_offset: subject.birth_utc_offset } : {}),
    ...(subject.name ? { name: subject.name } : {}),
    question,
    category,
    language: 'ko',
  }
}

// ── 프로필 칩 ───────────────────────────────────────────────────────────────────

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
      <MascotTinted stem={profile.day_stem ?? null} size={28} />
      <View style={{ gap: 2 }}>
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

// ── 메인 스크린 ──────────────────────────────────────────────────────────────────

export default function QuestionScreen() {
  const router = useRouter()
  const { api, status } = useAuth()
  const queryClient = useQueryClient()

  const { data: profiles } = useProfiles()
  const { data: consultations, refetch: refetchConsultations } = useConsultations()

  // 입력 모드
  const [inputMode, setInputMode] = useState<InputMode>('profile')
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null)
  const [pendingManualInput, setPendingManualInput] = useState<ManseBirthInput | null>(null)

  // 선택된 사주 주체
  const [subject, setSubject] = useState<SajuSubject | null>(null)

  // 질문 + 카테고리
  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState<QuestionCategory | undefined>(undefined)

  // 상태
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ConsultationResponse | null>(null)
  const [sharing, setSharing] = useState(false)

  // 로그인 여부
  const isAuthed = status === 'authed'

  // 프로필 자동 선택
  useEffect(() => {
    if (profiles && profiles.length > 0 && selectedProfileId === null) {
      const rep = profiles.find((p) => p.is_representative) ?? profiles[0]
      setSelectedProfileId(rep.id)
      setSubject(profileToSubject(rep))
    }
  }, [profiles, selectedProfileId])

  // 프로필 없으면 직접 입력으로
  useEffect(() => {
    if (profiles && profiles.length === 0) {
      setInputMode('manual')
    }
  }, [profiles])

  const hasProfiles = profiles && profiles.length > 0

  // 프로필 선택 → subject 갱신
  function handleSelectProfile(id: number) {
    setSelectedProfileId(id)
    const p = profiles?.find((pr) => pr.id === id)
    if (p) setSubject(profileToSubject(p))
  }

  // 수동 입력 폼 제출 → subject 갱신
  const handleManualInput = useCallback((input: ManseBirthInput) => {
    setPendingManualInput(input)
    setSubject(manseToSubject(input))
  }, [])

  // 질문 제출
  async function handleSubmit() {
    if (!subject) {
      setError('사주 정보를 먼저 선택하거나 입력해주세요.')
      return
    }
    const q = question.trim()
    if (q.length < 10) {
      setError('질문은 10자 이상 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const body = subjectToRequest(subject, q, category)
      const res = await askQuestion(api, body)
      setResult(res)
      // 로그인 상태면 history 캐시 무효화
      if (isAuthed) {
        await queryClient.invalidateQueries({ queryKey: ['consultations'] })
      }
    } catch {
      setError('답변을 받아오는 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 공유
  async function handleShare() {
    if (!result || sharing) return
    setSharing(true)
    try {
      const { share_url } = await shareConsultation(api, result.id)
      await Share.share({ message: share_url, url: share_url })
    } catch {
      // 사용자가 공유 취소하거나 오류
    } finally {
      setSharing(false)
    }
  }

  // 히스토리 삭제
  async function handleDelete(id: number) {
    try {
      await deleteConsultation(api, id)
      await refetchConsultations()
    } catch {
      Alert.alert('오류', '삭제하는 중 오류가 발생했어요.')
    }
  }

  // 히스토리 항목 공유
  async function handleHistoryShare(id: number) {
    try {
      const { share_url } = await shareConsultation(api, id)
      await Share.share({ message: share_url, url: share_url })
    } catch {
      // ignore
    }
  }

  // 다시 물어보기
  function handleAskAgain() {
    setResult(null)
    setQuestion('')
    setError('')
  }

  // ── 결과 화면 ────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <Screen>
        {/* 헤더 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Pressable onPress={handleAskAgain} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, color: '#1A1A1A', marginRight: 4 }}>←</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>한 번 물어보기</Text>
          </Pressable>
        </View>

        <AnswerCard
          result={result}
          sharing={sharing}
          onShare={handleShare}
          onAskAgain={handleAskAgain}
        />
      </Screen>
    )
  }

  // ── 입력 폼 ──────────────────────────────────────────────────────────────────
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

      {/* 타이틀 */}
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 }}>
        한 번 물어보기
      </Text>
      <View style={{ height: 6, width: 48, borderRadius: 3, backgroundColor: '#7BD3C8', marginBottom: 8 }} />
      <Text style={{ fontSize: 13, color: '#8A8270', marginBottom: 24, fontWeight: '600' }}>
        질문 하나, 사주 기반 답변 하나. 로그인 없이도 이용할 수 있어요.
      </Text>

      {/* ① 사주 주체 선택 */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 }}>
        사주 주체
      </Text>

      {/* 입력 모드 탭 */}
      {hasProfiles && (
        <View
          style={{
            flexDirection: 'row',
            borderWidth: 2,
            borderColor: '#1A1A1A',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          {(['profile', 'manual'] as InputMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => {
                setInputMode(mode)
                // 수동→프로필로 전환 시 subject 복원
                if (mode === 'profile' && selectedProfileId) {
                  const p = profiles?.find((pr) => pr.id === selectedProfileId)
                  if (p) setSubject(profileToSubject(p))
                }
                // 프로필→수동 전환 시 이미 입력값 있으면 복원
                if (mode === 'manual' && pendingManualInput) {
                  setSubject(manseToSubject(pendingManualInput))
                }
              }}
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

      {/* 프로필 칩 목록 */}
      {inputMode === 'profile' && hasProfiles && (
        <View style={{ gap: 8, marginBottom: 20 }}>
          {profiles!.map((p) => (
            <ProfileChip
              key={p.id}
              profile={p}
              selected={selectedProfileId === p.id}
              onPress={() => handleSelectProfile(p.id)}
            />
          ))}
        </View>
      )}

      {/* 직접 입력 폼 */}
      {inputMode === 'manual' && (
        <View style={{ marginBottom: 20 }}>
          <BirthInputForm
            onSubmit={handleManualInput}
            submitLabel="이 정보로 설정"
            busy={false}
          />
          {subject && inputMode === 'manual' && (
            <View
              style={{
                marginTop: 10,
                borderWidth: 1.5,
                borderColor: '#7BD3C8',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: '#F0FBF9',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E8B7A' }}>
                ✓ 사주 정보가 설정되었어요 — 아래에서 질문을 이어서 입력하세요.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ② 카테고리 선택 */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 }}>
        카테고리
      </Text>
      <View style={{ marginBottom: 20 }}>
        <CategorySelector value={category} onChange={setCategory} />
      </View>

      {/* ③ 질문 입력 */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 }}>
        질문
      </Text>
      <BrutalCard intensity="soft" style={{ marginBottom: 4 }}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="예: 올해 이직 운이 어떤가요? 지금 연애 시작해도 될까요?"
          placeholderTextColor="#C0B8A8"
          multiline
          numberOfLines={4}
          maxLength={200}
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
            minHeight: 80,
            textAlignVertical: 'top',
          }}
        />
      </BrutalCard>
      <Text
        style={{
          textAlign: 'right',
          fontSize: 11,
          color: '#C0B8A8',
          marginBottom: 16,
        }}
      >
        {question.length}/200 (최소 10자)
      </Text>

      {/* 오류 */}
      {error ? (
        <View
          style={{
            borderWidth: 1.5,
            borderColor: '#FF6B00',
            borderRadius: 10,
            backgroundColor: '#FFF4E3',
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF6B00' }}>{error}</Text>
        </View>
      ) : null}

      {/* 제출 버튼 */}
      <Button
        label={loading ? '답변 생성 중...' : '사주에게 물어보기'}
        onPress={handleSubmit}
        variant="strong"
        disabled={loading || !subject || question.trim().length < 10}
      />

      {/* ④ 상담 기록 (로그인 시) */}
      {isAuthed && consultations && consultations.length > 0 && (
        <View style={{ marginTop: 36 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '900',
              color: '#1A1A1A',
              marginBottom: 12,
            }}
          >
            최근 상담 기록
          </Text>
          <View style={{ gap: 10 }}>
            {consultations.slice(0, 10).map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onShare={handleHistoryShare}
              />
            ))}
          </View>
        </View>
      )}
    </Screen>
  )
}
