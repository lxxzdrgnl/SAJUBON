import { useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import {
  createProfile,
  setRepresentative,
  deleteProfile,
  type ProfileCreateRequest,
} from '@sajuguri/api-client'
import { Screen } from '@/components/ui/Screen'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { BirthInputForm, type ManseBirthInput } from '@/components/manse/BirthInputForm'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProfiles } from '@/lib/queries'
import { radii } from '@/theme'

// ManseBirthInput → ProfileCreateRequest 변환
function toProfileCreateRequest(input: ManseBirthInput): ProfileCreateRequest {
  return {
    name: input.name,
    birth_date: input.birth_date,
    birth_time: input.birth_time,
    calendar: input.calendar,
    gender: input.gender,
    is_leap_month: input.is_leap_month,
    city: input.city ?? null,
    // birth_longitude은 ProfileCreateRequest의 longitude 필드로 매핑
    longitude: input.birth_longitude ?? null,
  }
}

export default function ProfilesScreen() {
  const { api } = useAuth()
  const queryClient = useQueryClient()
  const { data: profiles = [], isLoading } = useProfiles()
  const [modalVisible, setModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const insets = useSafeAreaInsets()

  async function handleCreate(input: ManseBirthInput) {
    setSaving(true)
    try {
      await createProfile(api, toProfileCreateRequest(input))
      await queryClient.invalidateQueries({ queryKey: ['profiles'] })
      setModalVisible(false)
    } catch {
      Alert.alert('오류', '만세력 저장에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSetRepresentative(id: number) {
    try {
      await setRepresentative(api, id)
      await queryClient.invalidateQueries({ queryKey: ['profiles'] })
    } catch {
      Alert.alert('오류', '대표 만세력 설정에 실패했어요.')
    }
  }

  function handleDelete(id: number, name: string) {
    Alert.alert(
      '만세력 삭제',
      `"${name}" 만세력을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProfile(api, id)
              await queryClient.invalidateQueries({ queryKey: ['profiles'] })
            } catch {
              Alert.alert('오류', '삭제에 실패했어요.')
            }
          },
        },
      ],
    )
  }

  return (
    <>
      <Screen>
        <Text className="mb-4 mt-2 text-2xl font-black text-ink">내 만세력</Text>

        {isLoading ? (
          <Text className="text-sm text-text-sub">불러오는 중…</Text>
        ) : profiles.length === 0 ? (
          <BrutalCard>
            <Text className="text-sm text-text-sub">저장된 만세력이 없어요.</Text>
            <Text className="mt-1 text-xs text-text-sub">아래 버튼으로 첫 만세력을 추가해 보세요.</Text>
          </BrutalCard>
        ) : (
          <View className="gap-3">
            {profiles.map((profile) => (
              <BrutalCard key={profile.id}>
                <View className="flex-row items-start gap-3">
                  <MascotTinted stem={profile.day_stem} size={48} />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-extrabold text-ink">{profile.name || '이름 없음'}</Text>
                      {profile.is_representative && (
                        <Chip label="대표" variant="yellow" />
                      )}
                    </View>
                    <Text className="mt-0.5 text-xs text-text-sub">
                      {profile.birth_date}
                      {profile.birth_time ? ` ${profile.birth_time}` : ' (시간 모름)'}
                      {' · '}
                      {profile.gender === 'male' ? '남성' : '여성'}
                      {profile.calendar === 'lunar' ? ' (음력)' : ''}
                    </Text>
                    {profile.day_stem && (
                      <Text className="mt-0.5 font-serif text-xs text-text-sub">
                        일간 {profile.day_stem}
                        {profile.day_branch ? profile.day_branch : ''}
                      </Text>
                    )}
                    {profile.city && (
                      <Text className="mt-0.5 text-xs text-text-sub">{profile.city}</Text>
                    )}
                  </View>
                </View>

                {/* 액션 버튼 */}
                <View className="mt-3 flex-row gap-2">
                  {!profile.is_representative && (
                    <Pressable
                      onPress={() => handleSetRepresentative(profile.id)}
                      className="flex-1 items-center rounded-lg border-2 border-ink bg-yellow py-2"
                    >
                      <Text className="text-xs font-extrabold text-ink">대표로 설정</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => handleDelete(profile.id, profile.name || '이름 없음')}
                    className="flex-1 items-center rounded-lg border-2 border-ink bg-orange-tint py-2"
                  >
                    <Text className="text-xs font-extrabold text-orange">삭제</Text>
                  </Pressable>
                </View>
              </BrutalCard>
            ))}
          </View>
        )}

        <View className="mt-4">
          <Button label="+ 새 만세력 추가" variant="primary" onPress={() => setModalVisible(true)} />
        </View>
      </Screen>

      {/* 만세력 추가 모달 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#FFFBF2', paddingTop: insets.top || 20 }}>
          {/* 모달 헤더 */}
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-lg font-black text-ink">새 만세력 추가</Text>
            <BrutalShadow radius={radii.button}>
              <Pressable
                onPress={() => setModalVisible(false)}
                className="rounded-xl border-2 border-ink bg-surface px-3 py-2"
              >
                <Text className="text-sm font-extrabold text-ink">닫기</Text>
              </Pressable>
            </BrutalShadow>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
            showsVerticalScrollIndicator={false}
          >
            <BirthInputForm
              onSubmit={handleCreate}
              submitLabel="만세력 저장"
              busy={saving}
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  )
}
