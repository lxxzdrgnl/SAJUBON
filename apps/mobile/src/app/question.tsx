/**
 * /question — 한줄 상담.
 *
 * 웹 apps/web/app/[locale]/question/page.tsx 흐름을 미러링:
 *   진입 시 MansePickerSheet 자동 오픈 → 선택 후 질문 입력 → 제출 → 결과 카드.
 *   "다시 선택" 버튼으로 시트 재오픈.
 *
 * 문자열: 모두 ko.json `question` / `mansePicker` 키에서 가져옴.
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
  type QuestionRequest,
} from '@sajuguri/api-client'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles, useConsultations } from '@/lib/queries'
import { Screen } from '@/components/ui/Screen'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { MansePickerSheet, type MansePick } from '@/components/manse/MansePickerSheet'
import { AnswerCard } from '@/components/question/AnswerCard'
import { HistoryItem } from '@/components/question/HistoryItem'
import { useQueryClient } from '@tanstack/react-query'
import { colors, radii } from '@/theme'

// ── 문자열 상수 (ko.json `question`) ─────────────────────────────────────────
const S = {
  title: '한줄 상담',
  desc: '사주 정보와 고민을 입력하면 AI가 단답형으로 답해드려요.',
  questionLabel: '고민을 입력해 주세요',
  questionPlaceholder: '올해 이직 운이 있을까요? (10자 이상)',
  submit: '물어보기',
  submitting: '분석 중...',
  resultLabel: 'AI 상담 결과',
  askAgain: '다시 물어보기',
  changeBirth: '다시 선택',
  selectBirth: '만세력 선택하기',
  birthLabel: '사주 선택',
  errorNoBirth: '사주 정보를 먼저 선택해 주세요.',
  errorQuestionShort: '고민은 10자 이상 입력해 주세요.',
  errorFallback: '상담 요청에 실패했어요. 잠시 후 다시 시도해 주세요.',
  pickSheetTitle: '누구의 사주로 물어볼까요?',
  share: '공유하기',
  sharing: '공유 중...',
  recentHistory: '최근 상담 기록',
  deleteError: '삭제하는 중 오류가 발생했어요.',
} as const

// ── MansePick → QuestionRequest ───────────────────────────────────────────────
function pickToRequest(pick: MansePick, question: string): QuestionRequest {
  return {
    birth_date: pick.birth_date,
    birth_time: pick.birth_time,
    gender: pick.gender,
    calendar: pick.calendar,
    is_leap_month: pick.is_leap_month,
    ...(pick.birth_longitude != null ? { birth_longitude: pick.birth_longitude } : {}),
    name: pick.name || undefined,
    question,
    language: 'ko',
  }
}

// ── 선택된 만세력 카드 ────────────────────────────────────────────────────────
function SelectedManseCard({
  pick,
  onReselect,
}: {
  pick: MansePick
  onReselect: () => void
}) {
  return (
    <BrutalShadow radius={radii.card}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: radii.card,
          borderWidth: 2,
          borderColor: colors.ink,
          backgroundColor: colors.surface,
          padding: 16,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: colors.ink,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <MascotTinted stem={pick.day_stem ?? null} size={38} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}
          >
            {pick.name || '이름 없음'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
            {pick.birth_date}
          </Text>
        </View>
        <Pressable
          onPress={onReselect}
          style={{
            borderWidth: 1.5,
            borderColor: colors.borderSoft,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textSub }}>
            {S.changeBirth}
          </Text>
        </Pressable>
      </View>
    </BrutalShadow>
  )
}

// ── 메인 스크린 ───────────────────────────────────────────────────────────────
export default function QuestionScreen() {
  const router = useRouter()
  const { api, status } = useAuth()
  const queryClient = useQueryClient()

  const { data: profiles } = useProfiles()
  const { data: consultations } = useConsultations()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedPick, setSelectedPick] = useState<MansePick | null>(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ConsultationResponse | null>(null)
  const [sharing, setSharing] = useState(false)

  const isAuthed = status === 'authed'

  // 진입 시 만세력 미선택이면 시트 자동 오픈 (웹과 동일)
  useEffect(() => {
    if (!selectedPick) {
      setSheetOpen(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePick(pick: MansePick) {
    setSelectedPick(pick)
    setSheetOpen(false)
  }

  // 질문 제출
  const handleSubmit = useCallback(async () => {
    if (!selectedPick) {
      setError(S.errorNoBirth)
      setSheetOpen(true)
      return
    }
    const q = question.trim()
    if (q.length < 10) {
      setError(S.errorQuestionShort)
      return
    }
    setLoading(true)
    setError('')
    try {
      const body = pickToRequest(selectedPick, q)
      const res = await askQuestion(api, body)
      setResult(res)
      if (isAuthed) {
        await queryClient.invalidateQueries({ queryKey: ['consultations'] })
      }
    } catch {
      setError(S.errorFallback)
    } finally {
      setLoading(false)
    }
  }, [selectedPick, question, api, isAuthed, queryClient])

  // 공유
  async function handleShare() {
    if (!result || sharing) return
    setSharing(true)
    try {
      const { share_url } = await shareConsultation(api, result.id)
      await Share.share({ message: share_url, url: share_url })
    } catch {
      // 공유 취소 또는 오류 — 무시
    } finally {
      setSharing(false)
    }
  }

  // 히스토리 삭제
  async function handleDelete(id: number) {
    try {
      await deleteConsultation(api, id)
      await queryClient.invalidateQueries({ queryKey: ['consultations'] })
    } catch {
      Alert.alert('오류', S.deleteError)
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

  // ── 결과 화면 ─────────────────────────────────────────────────────────────
  if (result) {
    return (
      <Screen>
        {/* 헤더 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Pressable onPress={handleAskAgain} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, color: colors.ink, marginRight: 4 }}>←</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{S.title}</Text>
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

  // ── 입력 폼 ───────────────────────────────────────────────────────────────
  return (
    <Screen>
      {/* 헤더 */}
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
      >
        <Text style={{ fontSize: 22, color: colors.ink, marginRight: 4 }}>←</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>돌아가기</Text>
      </Pressable>

      {/* 타이틀 (ko.json question.title) */}
      <Text style={{ fontSize: 22, fontWeight: '900', color: colors.ink, marginBottom: 4 }}>
        {S.title}
      </Text>
      <View style={{ height: 6, width: 48, borderRadius: 3, backgroundColor: colors.teal, marginBottom: 8 }} />
      {/* ko.json question.desc */}
      <Text style={{ fontSize: 13, color: colors.textSub, marginBottom: 24, fontWeight: '600' }}>
        {S.desc}
      </Text>

      {/* MansePickerSheet */}
      <MansePickerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles ?? []}
        title={S.pickSheetTitle}
        onPick={handlePick}
      />

      {/* 사주 선택 영역 (ko.json question.birthLabel) */}
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{ fontSize: 13, fontWeight: '800', color: colors.ink, marginBottom: 8 }}
        >
          {S.birthLabel}
        </Text>
        {selectedPick ? (
          <SelectedManseCard
            pick={selectedPick}
            onReselect={() => setSheetOpen(true)}
          />
        ) : (
          <BrutalShadow radius={radii.card}>
            <Pressable
              onPress={() => setSheetOpen(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderRadius: radii.card,
                borderWidth: 2,
                borderColor: colors.ink,
                backgroundColor: colors.yellow,
                padding: 16,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18, color: colors.ink, fontWeight: '800' }}>+</Text>
              </View>
              {/* ko.json question.selectBirth */}
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
                {S.selectBirth}
              </Text>
            </Pressable>
          </BrutalShadow>
        )}
      </View>

      {/* 질문 입력 — 만세력 선택 후에만 노출 (웹과 동일) */}
      {selectedPick && (
        <View style={{ marginBottom: 20 }}>
          {/* ko.json question.questionLabel */}
          <Text
            style={{ fontSize: 13, fontWeight: '800', color: colors.ink, marginBottom: 8 }}
          >
            {S.questionLabel}
          </Text>
          <BrutalCard intensity="full">
            <TextInput
              value={question}
              onChangeText={setQuestion}
              // ko.json question.questionPlaceholder
              placeholder={S.questionPlaceholder}
              placeholderTextColor={colors.textSub}
              multiline
              numberOfLines={3}
              maxLength={200}
              style={{
                borderWidth: 2,
                borderColor: colors.ink,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                fontWeight: '600',
                color: colors.ink,
                backgroundColor: colors.surface,
                minHeight: 72,
                textAlignVertical: 'top',
              }}
            />
          </BrutalCard>
          <Text
            style={{
              textAlign: 'right',
              fontSize: 11,
              color: colors.textSub,
              marginTop: 4,
              marginBottom: 16,
            }}
          >
            {question.length}/200
          </Text>

          {/* 오류 */}
          {error ? (
            <View
              style={{
                borderWidth: 1.5,
                borderColor: colors.orange,
                borderRadius: 10,
                backgroundColor: colors.orangeTint,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.orange }}>{error}</Text>
            </View>
          ) : null}

          {/* 제출 버튼 (ko.json question.submit / question.submitting) */}
          <BrutalShadow radius={radii.button} style={{ opacity: loading ? 0.6 : 1 }}>
            <Pressable
              onPress={loading ? undefined : handleSubmit}
              style={{
                borderWidth: 2,
                borderColor: colors.ink,
                borderRadius: radii.button,
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: colors.orange,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                {loading ? S.submitting : S.submit}
              </Text>
            </Pressable>
          </BrutalShadow>
        </View>
      )}

      {/* 오류 (만세력 미선택 시) */}
      {!selectedPick && error ? (
        <View
          style={{
            borderWidth: 1.5,
            borderColor: colors.orange,
            borderRadius: 10,
            backgroundColor: colors.orangeTint,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.orange }}>{error}</Text>
        </View>
      ) : null}

      {/* 상담 기록 (로그인 시) */}
      {isAuthed && consultations && consultations.length > 0 && (
        <View style={{ marginTop: 36 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '900',
              color: colors.ink,
              marginBottom: 12,
            }}
          >
            {S.recentHistory}
          </Text>
          <View style={{ gap: 10 }}>
            {consultations.slice(0, 10).map((item: ConsultationHistoryItem) => (
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
