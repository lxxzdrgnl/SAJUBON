/**
 * 만세력 탭 — 웹 /manse 랜딩 페이지 대응.
 * - 상단: "새 만세력" 옐로우 브루탈 버튼 → /manse/new
 * - 로그인 시: 저장된 만세력 목록 (SavedManse)
 * - 최근 본 만세력 목록 (RecentManse, AsyncStorage)
 */
import { useCallback, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { setRepresentative, deleteProfile, createProfile, type ProfileResponse } from '@sajuguri/api-client'
import { loadRecentInputs, removeRecentInput, type RecentBirthInput } from '@sajuguri/core'
import { Screen } from '@/components/ui/Screen'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles } from '@/lib/queries'
import { rnStorage } from '@/lib/storage'
import { useQueryClient } from '@tanstack/react-query'
import { radii } from '@/theme'
import type { ManseBirthInput } from '@/components/manse/BirthInputForm'

// ── 아이콘 ────────────────────────────────────────────────────────────────────

function StarIcon() {
  return (
    <Text style={{ fontSize: 11, color: '#1A1A1A', fontWeight: '900', lineHeight: 14 }}>★</Text>
  )
}

function TrashIcon() {
  return (
    <Text style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 16 }}>🗑</Text>
  )
}

// ── 프로필 카드 (저장된 만세력) ──────────────────────────────────────────────

function SavedManseItem({
  profile,
  onTap,
  onSetRep,
  onDelete,
  isLoading,
}: {
  profile: ProfileResponse
  onTap: () => void
  onSetRep: () => void
  onDelete: () => void
  isLoading: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const genderLabel = profile.gender === 'male' ? '남성' : '여성'
  const timeLabel = profile.birth_time ?? '시간 미상'

  if (confirmDelete) {
    return (
      <BrutalShadow radius={radii.card}>
        <View
          className="flex-row items-center justify-between rounded-2xl border-2 border-ink bg-surface px-4 py-3"
          style={{ minHeight: 72 }}
        >
          <Text className="flex-1 text-[13px] font-extrabold text-ink" numberOfLines={1}>
            삭제할까요?
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable
              onPress={() => { setConfirmDelete(false); onDelete() }}
              disabled={isLoading}
              style={{
                borderWidth: 2,
                borderColor: '#1A1A1A',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: '#FF6B00',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>삭제</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmDelete(false)}
              style={{
                borderWidth: 2,
                borderColor: '#1A1A1A',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: '#FAFAF7',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1A1A1A' }}>취소</Text>
            </Pressable>
          </View>
        </View>
      </BrutalShadow>
    )
  }

  return (
    <BrutalShadow radius={radii.card}>
      <Pressable
        onPress={onTap}
        className="flex-row items-center rounded-2xl border-2 border-ink bg-surface p-4"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        {/* 마스코트 아이콘 */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#1A1A1A',
            backgroundColor: '#FAFAF7',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            marginRight: 12,
            flexShrink: 0,
          }}
        >
          <MascotTinted stem={profile.day_stem} size={36} />
        </View>

        {/* 이름 + 날짜 */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              className="text-[15px] font-extrabold text-ink"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {profile.name}
            </Text>
            {profile.is_representative && (
              <View
                style={{
                  borderRadius: 99,
                  borderWidth: 1.5,
                  borderColor: '#1A1A1A',
                  backgroundColor: '#FF6B00',
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>대표</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-text-sub" numberOfLines={1}>
            {profile.birth_date} · {timeLabel} · {genderLabel}
          </Text>
        </View>

        {/* 액션 버튼 */}
        <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
          {!profile.is_representative && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onSetRep() }}
              disabled={isLoading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                borderWidth: 2,
                borderColor: '#1A1A1A',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 5,
                backgroundColor: '#FFDE21',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <StarIcon />
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#1A1A1A' }}>대표</Text>
            </Pressable>
          )}
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); setConfirmDelete(true) }}
            disabled={isLoading}
            style={{
              borderWidth: 2,
              borderColor: '#1A1A1A',
              borderRadius: 8,
              padding: 6,
              backgroundColor: '#FAFAF7',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <TrashIcon />
          </Pressable>
        </View>
      </Pressable>
    </BrutalShadow>
  )
}

// ── 저장된 만세력 섹션 ────────────────────────────────────────────────────────

function SavedManseSection({ profiles }: { profiles: ProfileResponse[] }) {
  const { api } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<number | null>(null)

  if (profiles.length === 0) {
    return (
      <Text className="py-4 text-center text-sm text-text-sub">
        저장된 만세력이 없어요. 분석 후 저장해보세요
      </Text>
    )
  }

  async function handleSetRep(id: number) {
    if (loadingId !== null) return
    setLoadingId(id)
    try {
      await setRepresentative(api, id)
      await queryClient.invalidateQueries({ queryKey: ['profiles'] })
    } catch {
      Alert.alert('오류', '대표 설정에 실패했어요.')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDelete(id: number) {
    if (loadingId !== null) return
    setLoadingId(id)
    try {
      await deleteProfile(api, id)
      await queryClient.invalidateQueries({ queryKey: ['profiles'] })
    } catch {
      Alert.alert('오류', '삭제에 실패했어요.')
    } finally {
      setLoadingId(null)
    }
  }

  function handleTap(profile: ProfileResponse) {
    // ProfileResponse → ManseBirthInput으로 변환해 결과 페이지 push
    const input: ManseBirthInput = {
      name: profile.name,
      birth_date: profile.birth_date,
      birth_time: profile.birth_time,
      gender: profile.gender as 'male' | 'female',
      calendar: (profile.calendar as 'solar' | 'lunar') ?? 'solar',
      is_leap_month: profile.is_leap_month,
      birth_longitude: profile.longitude ?? undefined,
      city: profile.city ?? undefined,
    }
    router.push({ pathname: '/manse/result', params: { data: JSON.stringify(input) } })
  }

  return (
    <View style={{ gap: 10 }}>
      {profiles.map((p) => (
        <SavedManseItem
          key={p.id}
          profile={p}
          onTap={() => handleTap(p)}
          onSetRep={() => handleSetRep(p.id)}
          onDelete={() => handleDelete(p.id)}
          isLoading={loadingId === p.id}
        />
      ))}
    </View>
  )
}

// ── 최근 본 만세력 아이템 ────────────────────────────────────────────────────

type SaveState = 'idle' | 'busy' | 'done' | 'error'

function RecentManseItem({
  item,
  isAuthed,
  onTap,
  onDelete,
  onSave,
}: {
  item: RecentBirthInput
  isAuthed: boolean
  onTap: () => void
  onDelete: () => void
  onSave: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const genderLabel = item.gender === 'male' ? '남성' : '여성'
  const timeLabel = item.birth_time ?? '시간 미상'

  async function handleSave(e: { stopPropagation?: () => void }) {
    e.stopPropagation?.()
    if (saveState === 'busy' || saveState === 'done') return
    setSaveState('busy')
    try {
      await onSave()
      setSaveState('done')
    } catch {
      setSaveState('error')
    }
  }

  const saveLabel =
    saveState === 'done' ? '저장됨' : saveState === 'error' ? '저장 실패' : '저장'

  if (confirmDelete) {
    return (
      <BrutalShadow radius={radii.card}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 2,
            borderColor: '#1A1A1A',
            borderRadius: 16,
            backgroundColor: '#FAFAF7',
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 60,
            gap: 8,
          }}
        >
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: '#1A1A1A' }} numberOfLines={1}>
            최근 목록에서 지울까요?
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable
              onPress={() => { setConfirmDelete(false); onDelete() }}
              style={{
                borderWidth: 2,
                borderColor: '#1A1A1A',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: '#FF6B00',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>삭제</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmDelete(false)}
              style={{
                borderWidth: 2,
                borderColor: '#1A1A1A',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: '#FAFAF7',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1A1A1A' }}>취소</Text>
            </Pressable>
          </View>
        </View>
      </BrutalShadow>
    )
  }

  return (
    <BrutalShadow radius={radii.card}>
      <Pressable
        onPress={onTap}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: '#1A1A1A',
          borderRadius: 16,
          backgroundColor: '#FAFAF7',
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 10,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {/* 마스코트 아이콘 */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: '#1A1A1A',
            backgroundColor: '#FAFAF7',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <MascotTinted stem={item.day_stem} size={34} />
        </View>

        {/* 이름 + 날짜·성별 */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }} numberOfLines={1}>
            {item.name || '이름 없음'}
          </Text>
          <Text style={{ fontSize: 11, color: '#8A8270' }} numberOfLines={1}>
            {item.birth_date} · {timeLabel} · {genderLabel}
          </Text>
        </View>

        {/* 저장 + 삭제 버튼 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* 저장 버튼 */}
          <Pressable
            onPress={handleSave}
            disabled={saveState === 'busy' || saveState === 'done'}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              borderWidth: 2,
              borderColor: '#1A1A1A',
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: '#FFDE21',
              opacity: (saveState === 'busy' || saveState === 'done') ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#1A1A1A' }}>{saveLabel}</Text>
          </Pressable>

          {/* 삭제 버튼 */}
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); setConfirmDelete(true) }}
            style={{
              borderWidth: 2,
              borderColor: '#1A1A1A',
              borderRadius: 8,
              padding: 5,
              backgroundColor: '#FAFAF7',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrashIcon />
          </Pressable>
        </View>
      </Pressable>
    </BrutalShadow>
  )
}

// ── 최근 본 만세력 섹션 ──────────────────────────────────────────────────────

function RecentManseSection({ savedKeys, isAuthed }: { savedKeys: Set<string>; isAuthed: boolean }) {
  const router = useRouter()
  const { api } = useAuth()
  const queryClient = useQueryClient()
  const [items, setItems] = useState<RecentBirthInput[] | null>(null)
  const [loginPrompt, setLoginPrompt] = useState(false)

  const load = useCallback(async () => {
    const loaded = await loadRecentInputs(rnStorage)
    setItems(loaded)
  }, [])

  // 화면에 돌아올 때마다 최근 목록 새로고침 (만세 본 뒤 복귀 시 반영)
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  if (items === null) return null

  // 저장된 만세력과 중복 제거 (웹과 동일 로직)
  const visible = items.filter(
    (i) => !savedKeys.has(`${i.birth_date}|${i.birth_time ?? ''}|${i.gender}`),
  )

  if (visible.length === 0) return null

  async function handleDelete(item: RecentBirthInput) {
    await removeRecentInput(rnStorage, item)
    setItems((prev) => prev?.filter(
      (i) => `${i.birth_date}|${i.birth_time}|${i.gender}|${i.calendar}` !==
              `${item.birth_date}|${item.birth_time}|${item.gender}|${item.calendar}`,
    ) ?? null)
  }

  async function handleSave(item: RecentBirthInput) {
    if (!isAuthed) {
      setLoginPrompt(true)
      return
    }
    await createProfile(api, {
      name: item.name,
      birth_date: item.birth_date,
      birth_time: item.birth_time,
      calendar: item.calendar,
      gender: item.gender,
      is_leap_month: item.is_leap_month,
      city: item.city ?? null,
      longitude: item.birth_longitude ?? null,
    })
    await queryClient.invalidateQueries({ queryKey: ['profiles'] })
  }

  function handleTap(item: RecentBirthInput) {
    const input: ManseBirthInput = {
      name: item.name,
      birth_date: item.birth_date,
      birth_time: item.birth_time,
      gender: item.gender,
      calendar: item.calendar,
      is_leap_month: item.is_leap_month,
      birth_longitude: item.birth_longitude,
      birth_utc_offset: item.birth_utc_offset,
      city: item.city,
    }
    router.push({ pathname: '/manse/result', params: { data: JSON.stringify(input) } })
  }

  return (
    <View style={{ marginTop: 24 }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 }}>
        최근 본 만세력
      </Text>
      <View style={{ gap: 10 }}>
        {visible.map((item) => (
          <RecentManseItem
            key={`${item.birth_date}|${item.birth_time}|${item.gender}|${item.calendar}`}
            item={item}
            isAuthed={isAuthed}
            onTap={() => handleTap(item)}
            onDelete={() => handleDelete(item)}
            onSave={() => handleSave(item)}
          />
        ))}
      </View>

      {/* 비로그인 저장 시 로그인 안내 */}
      {loginPrompt && (
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 50,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(26,26,26,0.4)',
          }}
        >
          <View
            style={{
              backgroundColor: '#FAFAF7',
              borderWidth: 2,
              borderColor: '#1A1A1A',
              borderRadius: 16,
              padding: 20,
              width: '90%',
              maxWidth: 320,
              alignItems: 'center',
              gap: 12,
              shadowColor: '#1A1A1A',
              shadowOffset: { width: 4, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
              로그인이 필요해요
            </Text>
            <Text style={{ fontSize: 13, color: '#8A8270', textAlign: 'center' }}>
              로그인하면 만세력을 저장하고 관리할 수 있어요
            </Text>
            <Pressable
              onPress={() => { setLoginPrompt(false); router.push('/auth/login') }}
              style={{
                width: '100%',
                borderWidth: 2,
                borderColor: '#1A1A1A',
                borderRadius: 12,
                backgroundColor: '#FFDE21',
                paddingVertical: 12,
                alignItems: 'center',
                shadowColor: '#1A1A1A',
                shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 0,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>구글로 로그인</Text>
            </Pressable>
            <Pressable onPress={() => setLoginPrompt(false)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#8A8270' }}>닫기</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

// ── 메인 스크린 ──────────────────────────────────────────────────────────────

export default function ManseScreen() {
  const router = useRouter()
  const { status } = useAuth()
  const { data: profiles } = useProfiles()
  const isAuthed = status === 'authed'

  const savedKeys = new Set(
    (profiles ?? []).map((p) => `${p.birth_date}|${p.birth_time ?? ''}|${p.gender}`),
  )

  return (
    <Screen>
      {/* 헤더 */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#1A1A1A' }}>만세력</Text>
        <View
          style={{
            height: 5,
            width: 44,
            borderRadius: 3,
            backgroundColor: '#FFDE21',
            marginTop: 4,
          }}
        />
      </View>

      {/* 새 만세력 버튼 (웹 스타일: 옐로우 브루탈) */}
      <BrutalShadow radius={radii.card} style={{ marginBottom: 20 }}>
        <Pressable
          onPress={() => router.push('/manse/new')}
          className="items-center justify-center rounded-2xl border-2 border-ink bg-yellow py-3.5"
          style={({ pressed }) => ({ transform: pressed ? [{ translateX: 1 }, { translateY: 1 }] : [] })}
        >
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#1A1A1A' }}>+ 새 만세력 보기</Text>
        </Pressable>
      </BrutalShadow>

      {/* 저장된 만세력 (로그인 시) */}
      {isAuthed && (
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 }}>
            저장된 만세력
          </Text>
          <SavedManseSection profiles={profiles ?? []} />
        </View>
      )}

      {/* 최근 본 만세력 */}
      <RecentManseSection savedKeys={savedKeys} isAuthed={isAuthed} />
    </Screen>
  )
}
