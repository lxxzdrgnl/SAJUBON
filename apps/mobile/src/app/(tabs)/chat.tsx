/**
 * AI 상담 탭 — 채팅 세션 목록 + 새 상담 만들기.
 * - 비로그인 시 로그인 유도 (login gate)
 * - listSessions → 세션 카드 목록
 * - 새 상담: createSession → /chat/[id] 로 navigate
 * - 세션 삭제: Alert confirm → deleteSession
 */
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { listSessions, createSession, deleteSession } from '@sajuguri/api-client'
import type { ChatSession } from '@sajuguri/api-client'
import { useAuth } from '@/lib/auth/AuthContext'
import { Screen } from '@/components/ui/Screen'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { Button } from '@/components/ui/Button'

// 날짜 포맷 헬퍼
function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ChatTabScreen() {
  const router = useRouter()
  const { api, status, login } = useAuth()

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

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

  // 새 상담 세션 생성
  const handleNewChat = useCallback(async () => {
    if (creating) return
    setCreating(true)
    try {
      const session = await createSession(api, { language: 'ko' })
      router.push(`/chat/${session.id}`)
    } catch {
      Alert.alert('오류', '새 상담을 시작하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setCreating(false)
    }
  }, [api, creating, router])

  // 세션 삭제
  const handleDelete = useCallback((session: ChatSession) => {
    const label = session.title ?? '이 상담'
    Alert.alert(
      '상담 삭제',
      `"${label}"을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(api, session.id)
              setSessions((prev) => prev.filter((s) => s.id !== session.id))
            } catch {
              Alert.alert('오류', '삭제에 실패했어요.')
            }
          },
        },
      ],
    )
  }, [api])

  // ── 비로그인 게이트 ────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      </Screen>
    )
  }

  if (status !== 'authed') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            AI 상담
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            사주·운세·궁합을 AI와 대화로 알아보세요.{'\n'}로그인 후 이용 가능합니다.
          </Text>
          <Button label="로그인하기" onPress={() => login()} variant="primary" />
        </View>
      </Screen>
    )
  }

  // ── 로그인 상태 ────────────────────────────────────────────────────────────

  return (
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
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#1A1A1A' }}>AI 상담</Text>
        <Button
          label={creating ? '생성 중…' : '+ 새 상담'}
          onPress={handleNewChat}
          variant="primary"
          disabled={creating}
        />
      </View>

      {/* 세션 목록 */}
      {loading ? (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      ) : sessions.length === 0 ? (
        <BrutalCard intensity="soft">
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 }}>
            아직 상담 기록이 없어요
          </Text>
          <Text style={{ fontSize: 13, color: '#8A8270', lineHeight: 19 }}>
            위의 "새 상담" 버튼으로 첫 대화를 시작해 보세요.
          </Text>
        </BrutalCard>
      ) : (
        <View style={{ gap: 10 }}>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onPress={() => router.push(`/chat/${session.id}`)}
              onDelete={() => handleDelete(session)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

// ── 세션 카드 ──────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onPress,
  onDelete,
}: {
  session: ChatSession
  onPress: () => void
  onDelete: () => void
}) {
  return (
    <BrutalCard intensity="full">
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          {/* 채팅 아이콘 */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#1A1A1A',
              backgroundColor: '#E8F7F2',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: 18 }}>💬</Text>
          </View>

          {/* 세션 정보 */}
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 }}
            >
              {session.title ?? '새 상담'}
            </Text>
            <Text style={{ fontSize: 12, color: '#8A8270', fontWeight: '600' }}>
              {formatDate(session.last_message_at)}
            </Text>
          </View>

          {/* 삭제 버튼 */}
          <Pressable
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.5 : 0.7,
              paddingLeft: 4,
            })}
          >
            <Text style={{ fontSize: 16, color: '#8A8270' }}>✕</Text>
          </Pressable>
        </View>
      </Pressable>
    </BrutalCard>
  )
}
