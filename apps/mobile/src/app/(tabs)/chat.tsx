/**
 * AI 상담 탭 — 채팅 세션 목록 + 새 상담 만들기.
 * - 비로그인 시 로그인 유도 (login gate)
 * - listSessions → 세션 카드 목록
 * - 편집 모드: 편집/완료 토글 → 삭제 버튼 노출
 * - 삭제: 인앱 커스텀 모달 (OS Alert 사용 안 함)
 * - 새 상담: MansePickerSheet → createSession → /chat/[id] 로 navigate
 */
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { listSessions, createSession, deleteSession } from '@sajuguri/api-client'
import type { ChatSession, ChatSessionCreate } from '@sajuguri/api-client'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles } from '@/lib/queries'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { MansePickerSheet } from '@/components/manse/MansePickerSheet'
import type { MansePick } from '@/components/manse/MansePickerSheet'

// ── 문자열 상수 (ko.json chat 네임스페이스와 동일) ────────────────────────────
const S = {
  title: 'AI 사주 상담',
  loginRequired: '로그인이 필요해요',
  loginDesc: 'AI 상담은 로그인한 사용자만 이용할 수 있어요.',
  loginWithGoogle: '구글로 로그인',
  newSession: '새 상담',
  empty: '아직 상담 내역이 없어요',
  emptyHint: '첫 상담을 시작해보세요',
  sessionFallback: '사주 상담',
  editToggle: '편집',
  editDone: '완료',
  deleteConfirm: '이 상담을 삭제할까요?',
  deleteConfirmYes: '삭제',
  deleteConfirmCancel: '취소',
  pickSheetTitle: '어떤 만세력으로 상담할까요?',
} as const

// ── 세션 해시 컬러 (웹 ChatListClient와 동일 로직) ───────────────────────────
const SESSION_COLORS = ['#FF6B00', '#FFE566', '#7ECBF5', '#00C2B8']

function sessionColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return SESSION_COLORS[hash % SESSION_COLORS.length]
}

// ── 날짜 포맷: 월/일만 (예: "6월 3일") ──────────────────────────────────────
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

// ── 채팅 버블 SVG 아이콘 ─────────────────────────────────────────────────────
function ChatBubbleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 6 a3 3 0 0 1 3-3 h10 a3 3 0 0 1 3 3 v7 a3 3 0 0 1-3 3 H10 l-4.5 4 v-4 H7 a3 3 0 0 1-3-3 Z" />
    </Svg>
  )
}

// ── 휴지통 SVG 아이콘 ────────────────────────────────────────────────────────
function TrashIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6h18" />
      <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
      <Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </Svg>
  )
}

// ── 인앱 삭제 확인 모달 (OS Alert 대신) ─────────────────────────────────────
interface DeleteModalProps {
  sessionTitle: string
  onConfirm: () => void
  onClose: () => void
}

function DeleteModal({ sessionTitle, onConfirm, onClose }: DeleteModalProps) {
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* 반투명 오버레이 — 탭하면 닫힘 */}
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
        onPress={onClose}
      >
        {/* 바텀시트 카드 */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 480,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 2,
            borderColor: '#1A1A1A',
            backgroundColor: '#FFFBF2',
            padding: 24,
            shadowColor: '#1A1A1A',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 8,
          }}
        >
          {/* 헤더 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>
              {S.deleteConfirm}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: '#E0D9CE',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
                <Path d="M4 4l8 8M12 4l-8 8" stroke="#8A8270" strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>

          {/* 세션 제목 */}
          <Text
            numberOfLines={1}
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: '#1A1A1A',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: '#E0D9CE',
              backgroundColor: '#FFFBF2',
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 24,
            }}
          >
            {sessionTitle}
          </Text>

          {/* 취소 / 삭제 버튼 */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: '#1A1A1A',
                backgroundColor: '#FFFBF2',
                paddingVertical: 12,
                alignItems: 'center',
                shadowColor: '#1A1A1A',
                shadowOffset: { width: 2, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 3,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>
                {S.deleteConfirmCancel}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                flex: 1,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: '#1A1A1A',
                backgroundColor: '#1A1A1A',
                paddingVertical: 12,
                alignItems: 'center',
                shadowColor: '#1A1A1A',
                shadowOffset: { width: 2, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 3,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFBF2' }}>
                {S.deleteConfirmYes}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── 세션 카드 ────────────────────────────────────────────────────────────────
interface SessionCardProps {
  session: ChatSession
  editMode: boolean
  onPress: () => void
  onDelete: () => void
}

function SessionCard({ session, editMode, onPress, onDelete }: SessionCardProps) {
  const color = sessionColor(session.id)
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: '#1A1A1A',
          backgroundColor: '#FFFBF2',
          padding: 14,
          shadowColor: '#1A1A1A',
          shadowOffset: { width: 3, height: 3 },
          shadowOpacity: pressed ? 0 : 1,
          shadowRadius: 0,
          elevation: pressed ? 0 : 4,
          transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : [],
        })}
      >
        {/* 해시 컬러 + 채팅 버블 아이콘 */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#1A1A1A',
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ChatBubbleIcon />
        </View>

        {/* 세션 제목 */}
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}
        >
          {session.title || S.sessionFallback}
        </Text>

        {/* 날짜 (월/일만) */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A8270', flexShrink: 0, marginLeft: 8 }}>
          {formatDate(session.last_message_at)}
        </Text>
      </Pressable>

      {/* 편집 모드일 때만 삭제 버튼 */}
      {editMode && (
        <Pressable
          onPress={onDelete}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#1A1A1A',
            backgroundColor: '#FFFBF2',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#1A1A1A',
            shadowOffset: { width: 2, height: 2 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 3,
            opacity: pressed ? 0.6 : 1,
            flexShrink: 0,
          })}
        >
          <TrashIcon />
        </Pressable>
      )}
    </View>
  )
}

// ── 메인 스크린 ──────────────────────────────────────────────────────────────
export default function ChatTabScreen() {
  const router = useRouter()
  const { api, status, login } = useAuth()
  const { data: profiles = [] } = useProfiles()

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deletingSession, setDeletingSession] = useState<ChatSession | null>(null)

  // 세션 목록 로드
  const loadSessions = useCallback(async () => {
    if (status !== 'authed') return
    try {
      const data = await listSessions(api)
      setSessions(data)
    } catch {
      // silent
    }
  }, [api, status])

  useEffect(() => {
    if (status === 'authed') {
      setLoading(true)
      loadSessions().finally(() => setLoading(false))
    }
  }, [status, loadSessions])

  // 당겨서 새로고침
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadSessions()
    setRefreshing(false)
  }, [loadSessions])

  // MansePickerSheet에서 만세력 선택 → 세션 생성
  const handlePick = useCallback(async (pick: MansePick) => {
    if (creating) return
    setCreating(true)
    try {
      let body: ChatSessionCreate
      if (pick.profile_id) {
        body = { profile_id: pick.profile_id, language: 'ko' }
      } else {
        body = {
          birth_date: pick.birth_date,
          birth_time: pick.birth_time ?? undefined,
          gender: pick.gender,
          calendar: pick.calendar,
          is_leap_month: pick.is_leap_month,
          language: 'ko',
        }
      }
      const session = await createSession(api, body)
      router.push(`/chat/${session.id}`)
    } catch {
      // 실패 시 조용히 (사용자는 시트를 닫으면 목록으로 돌아감)
    } finally {
      setCreating(false)
    }
  }, [api, creating, router])

  // 세션 삭제 확정
  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingSession) return
    const id = deletingSession.id
    setDeletingSession(null)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    try {
      await deleteSession(api, id)
    } catch {
      // 실패 시 롤백
      loadSessions()
    }
  }, [api, deletingSession, loadSessions])

  // ── 인증 로딩 ───────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      </Screen>
    )
  }

  // ── 비로그인 게이트 ─────────────────────────────────────────────────────────
  if (status !== 'authed') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            {S.loginRequired}
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 22 }}>
            {S.loginDesc}
          </Text>
          <Button label={S.loginWithGoogle} onPress={() => login()} variant="primary" />
        </View>
      </Screen>
    )
  }

  // ── 로그인 상태 ─────────────────────────────────────────────────────────────
  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: '#FFFBF2' }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1A1A1A" />
        }
      >
        {/* 헤더 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#1A1A1A' }}>
            {S.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* 편집/완료 버튼 — 세션이 있을 때만 표시 */}
            {sessions.length > 0 && (
              <Pressable
                onPress={() => setEditMode((v) => !v)}
                style={({ pressed }) => ({
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: '#1A1A1A',
                  backgroundColor: '#FFFBF2',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  shadowColor: '#1A1A1A',
                  shadowOffset: { width: 2, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                  elevation: 3,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A' }}>
                  {editMode ? S.editDone : S.editToggle}
                </Text>
              </Pressable>
            )}
            {/* 새 상담 버튼 */}
            <Pressable
              onPress={() => setSheetOpen(true)}
              disabled={creating}
              style={({ pressed }) => ({
                borderRadius: 12,
                borderWidth: 2,
                borderColor: '#00C2B8',
                backgroundColor: '#FFFBF2',
                paddingHorizontal: 16,
                paddingVertical: 6,
                shadowColor: '#1A1A1A',
                shadowOffset: { width: 2, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 3,
                opacity: pressed || creating ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#00C2B8' }}>
                {creating ? '생성 중…' : S.newSession}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 세션 목록 */}
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#1A1A1A" />
          </View>
        ) : sessions.length === 0 ? (
          /* 빈 상태 */
          <View
            style={{
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#1A1A1A',
              backgroundColor: '#FFFBF2',
              padding: 40,
              alignItems: 'center',
              gap: 8,
              shadowColor: '#1A1A1A',
              shadowOffset: { width: 4, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 5,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>
              {S.empty}
            </Text>
            <Text style={{ fontSize: 13, color: '#8A8270' }}>
              {S.emptyHint}
            </Text>
            <Pressable
              onPress={() => setSheetOpen(true)}
              style={({ pressed }) => ({
                marginTop: 8,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: '#00C2B8',
                backgroundColor: '#FFFBF2',
                paddingHorizontal: 24,
                paddingVertical: 10,
                shadowColor: '#1A1A1A',
                shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#00C2B8' }}>
                {S.newSession}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                editMode={editMode}
                onPress={() => router.push(`/chat/${session.id}`)}
                onDelete={() => setDeletingSession(session)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* 만세력 선택 시트 */}
      <MansePickerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles}
        title={S.pickSheetTitle}
        onPick={handlePick}
      />

      {/* 삭제 확인 모달 */}
      {deletingSession && (
        <DeleteModal
          sessionTitle={deletingSession.title || S.sessionFallback}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingSession(null)}
        />
      )}
    </>
  )
}
