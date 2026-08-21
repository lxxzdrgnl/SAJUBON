/**
 * PersonSlot — 궁합 한 사람 슬롯.
 * 웹 PersonSlotPicker의 SlotCard 동작과 동일:
 *   - 정사각형 카드 버튼 → MansePickerSheet 열림
 *   - 선택 후: 이름 + birth_date 표시 + "다시 선택" 레이블
 *   - 미선택: "+" 아이콘 + "선택 / 입력" 레이블
 */

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ProfileResponse, BirthInput } from '@sajuguri/api-client'
import { MansePickerSheet, type MansePick } from '@/components/manse/MansePickerSheet'
import { MascotTinted } from '@/components/ui/MascotTinted'

interface PersonSlotProps {
  label: string
  profiles: ProfileResponse[] | undefined
  onChange: (input: BirthInput | null) => void
  sheetTitle: string
}

export function PersonSlot({ label, profiles, onChange, sheetTitle }: PersonSlotProps) {
  const [pick, setPick] = useState<MansePick | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  function handlePick(p: MansePick) {
    setPick(p)
    setSheetOpen(false)
    onChange(mansePickToBirthInput(p))
  }

  return (
    <View style={{ gap: 8 }}>
      {/* 슬롯 레이블 */}
      <Text
        style={{
          textAlign: 'center',
          fontSize: 11,
          fontWeight: '900',
          color: '#1A1A1A',
          letterSpacing: 0.5,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>

      {/* 카드 버튼 */}
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={{
          aspectRatio: 1,
          borderWidth: 2,
          borderColor: '#1A1A1A',
          borderRadius: 16,
          backgroundColor: '#FAFAF7',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: 12,
          shadowColor: '#1A1A1A',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
        }}
      >
        {pick ? (
          <>
            <View
              style={{
                width: 52,
                height: 52,
                borderWidth: 2,
                borderColor: '#1A1A1A',
                borderRadius: 14,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FAFAF7',
              }}
            >
              <MascotTinted stem={pick.day_stem ?? null} size={48} />
            </View>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#1A1A1A' }} numberOfLines={1}>
                {pick.name || '이름 없음'}
              </Text>
              <Text style={{ fontSize: 11, color: '#8A8270' }}>{pick.birth_date}</Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#00A878' }}>다시 선택</Text>
          </>
        ) : (
          <>
            <View
              style={{
                width: 52,
                height: 52,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: '#1A1A1A',
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#1A1A1A' }}>+</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A8270' }}>선택 / 입력</Text>
          </>
        )}
      </Pressable>

      <MansePickerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles ?? []}
        title={sheetTitle}
        onPick={handlePick}
      />
    </View>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

function mansePickToBirthInput(p: MansePick): BirthInput {
  return {
    name: p.name || null,
    birth_date: p.birth_date,
    birth_time: p.birth_time,
    gender: p.gender,
    calendar: p.calendar,
    is_leap_month: p.is_leap_month,
    birth_longitude: p.birth_longitude ?? null,
    birth_utc_offset: null,
  }
}
