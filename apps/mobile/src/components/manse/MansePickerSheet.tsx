/**
 * MansePickerSheet — 만세력 선택 공용 바텀시트 (RN).
 *
 * 웹 apps/web/components/manse/MansePickerSheet.tsx를 RN Modal로 미러링.
 * 섹션:
 *   1) 저장된 만세력 (저장 프로필 목록)
 *   2) 최근 본 만세력 (loadRecentInputs, 중복 숨김)
 *   3) 만세력 추가하기 → BirthInputForm → pickFromForm
 *
 * 문자열: ko.json `mansePicker` 키에서 정확히 가져옴.
 */
import { useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import type { ProfileResponse, SajuCalcRequest } from '@sajuguri/api-client'
import { calcSaju } from '@sajuguri/api-client'
import type { RecentBirthInput } from '@sajuguri/core'
import { loadRecentInputs, saveRecentInput } from '@sajuguri/core'
import { rnStorage } from '@/lib/storage'
import { useAuth } from '@/lib/auth/AuthContext'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { BirthInputForm, type ManseBirthInput } from '@/components/manse/BirthInputForm'
import { colors, radii } from '@/theme'

/** 통합 픽 결과 — 저장 프로필이면 profile_id가 채워진다 (웹 MansePick 타입과 동일). */
export interface MansePick {
  profile_id?: number
  name: string
  birth_date: string
  birth_time: string | null
  gender: 'male' | 'female'
  calendar: 'solar' | 'lunar'
  is_leap_month: boolean
  birth_longitude?: number
  day_stem?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]
  title: string
  onPick: (pick: MansePick) => void
  includeRecent?: boolean
}

// ── 문자열 상수 (ko.json mansePicker) ────────────────────────────────────────
const STRINGS = {
  savedTitle: '저장된 만세력',
  recentTitle: '최근 본 만세력',
  directInput: '만세력 추가하기',
  backToList: '목록으로',
  confirmInput: '이 사람으로 선택',
  repBadge: '대표',
  unknownName: '이름 없음',
} as const

export function MansePickerSheet({
  open,
  onClose,
  profiles,
  title,
  onPick,
  includeRecent = true,
}: Props) {
  const { api } = useAuth()
  const [recentInputs, setRecentInputs] = useState<RecentBirthInput[]>([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (open) {
      setShowForm(false)
      if (includeRecent) {
        loadRecentInputs(rnStorage).then(setRecentInputs)
      }
    }
  }, [open, includeRecent])

  // 저장 프로필과 중복되는 최근 입력 숨김 (birth_date|birth_time|gender 기준)
  const savedKeys = new Set(
    profiles.map((p) => `${p.birth_date}|${p.birth_time ?? ''}|${p.gender}`)
  )
  const filteredRecent = includeRecent
    ? recentInputs.filter(
        (r) => !savedKeys.has(`${r.birth_date}|${r.birth_time ?? ''}|${r.gender}`)
      )
    : []

  function pickFromProfile(p: ProfileResponse) {
    onPick({
      profile_id: p.id,
      name: p.name,
      birth_date: p.birth_date,
      birth_time: p.birth_time,
      gender: p.gender as 'male' | 'female',
      calendar: p.calendar as 'solar' | 'lunar',
      is_leap_month: p.is_leap_month,
      day_stem: p.day_stem,
      ...(p.longitude != null ? { birth_longitude: p.longitude } : {}),
    })
    onClose()
  }

  function pickFromRecent(r: RecentBirthInput) {
    onPick({
      name: r.name ?? '',
      birth_date: r.birth_date,
      birth_time: r.birth_time ?? null,
      gender: r.gender as 'male' | 'female',
      calendar: (r.calendar ?? 'solar') as 'solar' | 'lunar',
      is_leap_month: r.is_leap_month ?? false,
      day_stem: r.day_stem,
      ...(r.birth_longitude != null ? { birth_longitude: r.birth_longitude } : {}),
    })
    onClose()
  }

  async function pickFromForm(input: ManseBirthInput) {
    // 일간(day_stem) 계산 — 마스코트 틴팅에 사용
    let dayStem: string | null = null
    try {
      const saju = await calcSaju(api, input as unknown as SajuCalcRequest)
      dayStem = saju.day_pillar?.stem ?? null
    } catch {
      // 계산 실패 시 day_stem 없이 진행
    }
    // 직접 입력한 만세력도 "최근 본 만세력"에 저장
    try {
      await saveRecentInput(rnStorage, { ...input, day_stem: dayStem })
    } catch {
      // 저장 실패해도 픽 진행은 막지 않는다
    }
    onPick({
      name: input.name,
      birth_date: input.birth_date,
      birth_time: input.birth_time,
      gender: input.gender,
      calendar: input.calendar,
      is_leap_month: input.is_leap_month,
      day_stem: dayStem,
      ...(input.birth_longitude != null ? { birth_longitude: input.birth_longitude } : {}),
    })
    onClose()
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* 백드롭 */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(26,26,26,0.4)' }}
        onPress={onClose}
      />

      {/* 바텀시트 */}
      <View
        style={{
          borderTopLeftRadius: radii.sheet,
          borderTopRightRadius: radii.sheet,
          borderWidth: 2,
          borderColor: colors.ink,
          backgroundColor: colors.surface,
          shadowColor: colors.ink,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 8,
          maxHeight: '80%',
        }}
      >
        {/* 드래그 핸들 */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.borderSoft,
            }}
          />
        </View>

        <ScrollView
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 시트 제목 */}
          <Text
            style={{
              fontSize: 17,
              fontWeight: '800',
              color: colors.ink,
              marginBottom: 16,
            }}
          >
            {title}
          </Text>

          {showForm ? (
            <>
              {/* ← 목록으로 */}
              <Pressable
                onPress={() => setShowForm(false)}
                style={{ marginBottom: 16 }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: colors.textSub,
                  }}
                >
                  ← {STRINGS.backToList}
                </Text>
              </Pressable>
              <BirthInputForm
                onSubmit={pickFromForm}
                submitLabel={STRINGS.confirmInput}
              />
            </>
          ) : (
            <>
              {/* 저장된 만세력 */}
              {profiles.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: colors.textSub,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    {STRINGS.savedTitle}
                  </Text>
                  <View style={{ gap: 8 }}>
                    {profiles.map((p) => (
                      <BrutalShadow key={p.id} radius={radii.card}>
                        <Pressable
                          onPress={() => pickFromProfile(p)}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            borderRadius: radii.card,
                            borderWidth: 2,
                            borderColor: colors.ink,
                            backgroundColor: colors.surface,
                            padding: 16,
                            opacity: pressed ? 0.8 : 1,
                          })}
                        >
                          {/* 마스코트 아바타 */}
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
                            <MascotTinted stem={p.day_stem ?? null} size={38} />
                          </View>
                          {/* 이름 + 날짜 */}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text
                                numberOfLines={1}
                                style={{ fontSize: 14, fontWeight: '800', color: colors.ink, flexShrink: 1 }}
                              >
                                {p.name || STRINGS.unknownName}
                              </Text>
                              {p.is_representative && (
                                <View
                                  style={{
                                    borderRadius: 999,
                                    borderWidth: 1.5,
                                    borderColor: colors.ink,
                                    backgroundColor: colors.orange,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                                    {STRINGS.repBadge}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
                              {p.birth_date}
                              {p.birth_time ? ` · ${p.birth_time}` : ''}
                            </Text>
                          </View>
                        </Pressable>
                      </BrutalShadow>
                    ))}
                  </View>
                </View>
              )}

              {/* 최근 본 만세력 */}
              {filteredRecent.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: colors.textSub,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    {STRINGS.recentTitle}
                  </Text>
                  <View style={{ gap: 8 }}>
                    {filteredRecent.map((r) => (
                      <BrutalShadow
                        key={`${r.birth_date}|${r.birth_time ?? ''}|${r.gender}`}
                        radius={radii.card}
                      >
                        <Pressable
                          onPress={() => pickFromRecent(r)}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            borderRadius: radii.card,
                            borderWidth: 2,
                            borderColor: colors.ink,
                            backgroundColor: colors.surface,
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
                              overflow: 'hidden',
                            }}
                          >
                            <MascotTinted stem={r.day_stem ?? null} size={38} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              numberOfLines={1}
                              style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}
                            >
                              {r.name || STRINGS.unknownName}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
                              {r.birth_date}
                              {r.birth_time ? ` · ${r.birth_time}` : ''}
                            </Text>
                          </View>
                        </Pressable>
                      </BrutalShadow>
                    ))}
                  </View>
                </View>
              )}

              {/* 만세력 추가하기 (노란 버튼) */}
              <BrutalShadow radius={radii.card}>
                <Pressable
                  onPress={() => setShowForm(true)}
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
                    <Text style={{ fontSize: 18, color: colors.ink }}>+</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
                    {STRINGS.directInput}
                  </Text>
                </Pressable>
              </BrutalShadow>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}
