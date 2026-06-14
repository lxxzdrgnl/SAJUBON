/**
 * PersonSlot — 두 사람 중 한 명의 입력 위젯.
 * 저장된 프로필 선택 OR 직접 입력(BirthInputForm) 중 하나를 제공.
 */

import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ProfileResponse } from '@sajuguri/api-client'
import type { BirthInput } from '@sajuguri/api-client'
import { BirthInputForm, type ManseBirthInput } from '@/components/manse/BirthInputForm'
import { BrutalCard } from '@/components/ui/BrutalCard'

type SlotMode = 'profile' | 'manual'

interface PersonSlotProps {
  label: string            // '사람 A' | '사람 B'
  profiles: ProfileResponse[] | undefined
  onChange: (input: BirthInput | null) => void
}

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
      <View style={{ flex: 1, gap: 1 }}>
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
        <Text style={{ fontSize: 12, color: '#FF6B00', fontWeight: '900' }}>✓</Text>
      )}
    </Pressable>
  )
}

export function PersonSlot({ label, profiles, onChange }: PersonSlotProps) {
  const hasProfiles = profiles && profiles.length > 0
  const [mode, setMode] = useState<SlotMode>(hasProfiles ? 'profile' : 'manual')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // 프로필 목록이 로드되면 첫 번째(또는 대표) 자동 선택
  useEffect(() => {
    if (hasProfiles && mode === 'profile' && selectedId === null) {
      const rep = profiles.find((p) => p.is_representative) ?? profiles[0]
      setSelectedId(rep.id)
      onChange(profileToBirthInput(rep))
    }
  }, [hasProfiles, profiles, mode, selectedId, onChange])

  // 프로필 없으면 수동 모드로 강제
  useEffect(() => {
    if (profiles && profiles.length === 0) {
      setMode('manual')
    }
  }, [profiles])

  function handleSelectProfile(profile: ProfileResponse) {
    setSelectedId(profile.id)
    onChange(profileToBirthInput(profile))
  }

  function handleManualSubmit(input: ManseBirthInput) {
    onChange(manseToBirthInput(input))
  }

  function switchMode(next: SlotMode) {
    setMode(next)
    // 모드 전환 시 값 리셋
    onChange(null)
    if (next === 'profile') setSelectedId(null)
  }

  return (
    <BrutalCard intensity="soft">
      {/* 슬롯 레이블 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View
          style={{
            backgroundColor: '#FF6B00',
            borderRadius: 6,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF' }}>{label}</Text>
        </View>

        {/* 모드 토글 (프로필이 있을 때만) */}
        {hasProfiles && (
          <View
            style={{
              flexDirection: 'row',
              borderWidth: 2,
              borderColor: '#1A1A1A',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {(['profile', 'manual'] as SlotMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: mode === m ? '#1A1A1A' : '#FAFAF7',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: mode === m ? '#FFFFFF' : '#1A1A1A',
                  }}
                >
                  {m === 'profile' ? '내 프로필' : '직접 입력'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* 프로필 선택 목록 */}
      {mode === 'profile' && hasProfiles && (
        <View style={{ gap: 8 }}>
          {profiles!.map((p) => (
            <ProfileChip
              key={p.id}
              profile={p}
              selected={selectedId === p.id}
              onPress={() => handleSelectProfile(p)}
            />
          ))}
        </View>
      )}

      {/* 수동 입력 */}
      {mode === 'manual' && (
        <BirthInputForm
          onSubmit={handleManualSubmit}
          submitLabel="이 사람으로 설정"
          busy={false}
        />
      )}
    </BrutalCard>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

function profileToBirthInput(p: ProfileResponse): BirthInput {
  return {
    name: p.name,
    birth_date: p.birth_date,
    birth_time: p.birth_time,
    gender: p.gender as 'male' | 'female',
    calendar: (p.calendar as 'solar' | 'lunar') ?? 'solar',
    is_leap_month: p.is_leap_month,
    birth_longitude: p.longitude ?? null,
    birth_utc_offset: null,
  }
}

function manseToBirthInput(input: ManseBirthInput): BirthInput {
  return {
    name: input.name || null,
    birth_date: input.birth_date,
    birth_time: input.birth_time,
    gender: input.gender,
    calendar: input.calendar,
    is_leap_month: input.is_leap_month,
    birth_longitude: input.birth_longitude ?? null,
    birth_utc_offset: input.birth_utc_offset ?? null,
  }
}
