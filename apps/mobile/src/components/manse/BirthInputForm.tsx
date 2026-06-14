import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { Button } from '@/components/ui/Button'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { useAuth } from '@/lib/auth/AuthContext'
import { searchCities, type CityOption } from '@sajuguri/api-client'

export interface ManseBirthInput {
  name: string
  birth_date: string
  birth_time: string | null
  gender: 'male' | 'female'
  calendar: 'solar' | 'lunar'
  is_leap_month: boolean
  birth_longitude?: number
  birth_utc_offset?: number
  city?: string
}

interface Props {
  onSubmit: (input: ManseBirthInput) => void | Promise<void>
  submitLabel?: string
  busy?: boolean
}

function SegmentInput({
  value,
  onChangeText,
  maxLength,
  placeholder,
  inputRef,
  onFilled,
  style,
}: {
  value: string
  onChangeText: (v: string) => void
  maxLength: number
  placeholder: string
  inputRef?: React.RefObject<TextInput | null>
  onFilled?: () => void
  style?: TextInputProps['style']
}) {
  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={(v) => {
        const digits = v.replace(/\D/g, '').slice(0, maxLength)
        onChangeText(digits)
        if (digits.length === maxLength) onFilled?.()
      }}
      keyboardType="number-pad"
      maxLength={maxLength}
      placeholder={placeholder}
      placeholderTextColor="#C0B8A8"
      style={[
        {
          borderWidth: 2,
          borderColor: '#1A1A1A',
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 10,
          fontSize: 16,
          fontWeight: '700',
          color: '#1A1A1A',
          textAlign: 'center',
          backgroundColor: '#FAFAF7',
        },
        style,
      ]}
    />
  )
}

function PillToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              borderWidth: 2,
              borderColor: '#1A1A1A',
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: 'center',
              backgroundColor: active ? '#1A1A1A' : '#FAFAF7',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#FFFFFF' : '#1A1A1A' }}>
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function BirthInputForm({ onSubmit, submitLabel = '만세력 보기', busy = false }: Props) {
  const { api } = useAuth()

  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState('')
  const [minute, setMinute] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar')
  const [isLeapMonth, setIsLeapMonth] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<CityOption[]>([])
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null)
  const [citySearching, setCitySearching] = useState(false)

  const monthRef = useRef<TextInput>(null)
  const dayRef = useRef<TextInput>(null)
  const hourRef = useRef<TextInput>(null)
  const minuteRef = useRef<TextInput>(null)

  // Debounced city search
  useEffect(() => {
    if (!cityQuery.trim() || selectedCity) {
      setCityResults([])
      return
    }
    const timer = setTimeout(async () => {
      setCitySearching(true)
      try {
        const results = await searchCities(api, cityQuery)
        setCityResults(results)
      } finally {
        setCitySearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [cityQuery, api, selectedCity])

  const handleSubmit = useCallback(async () => {
    if (year.length < 4 || month.length < 1 || day.length < 1) return
    const mm = month.padStart(2, '0')
    const dd = day.padStart(2, '0')
    const birth_date = `${year}-${mm}-${dd}`

    let birth_time: string | null = null
    if (!timeUnknown) {
      if (hour.length < 1 || minute.length < 1) return
      birth_time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
    }

    const input: ManseBirthInput = {
      name,
      birth_date,
      birth_time,
      gender,
      calendar,
      is_leap_month: calendar === 'lunar' ? isLeapMonth : false,
      ...(selectedCity
        ? {
            birth_longitude: selectedCity.longitude,
            birth_utc_offset: selectedCity.isKorea ? undefined : selectedCity.utcOffset,
            city: selectedCity.label,
          }
        : {}),
    }
    await onSubmit(input)
  }, [year, month, day, hour, minute, timeUnknown, name, gender, calendar, isLeapMonth, selectedCity, onSubmit])

  const calendarOptions: { label: string; value: 'solar' | 'lunar' }[] = [
    { label: '양력', value: 'solar' },
    { label: '음력', value: 'lunar' },
  ]

  return (
    <View style={{ gap: 16 }}>
      {/* 이름 */}
      <BrutalCard intensity="soft">
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A8270', marginBottom: 6 }}>이름 (선택)</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="이름을 입력하세요"
          placeholderTextColor="#C0B8A8"
          style={{
            borderWidth: 2,
            borderColor: '#1A1A1A',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 15,
            fontWeight: '600',
            color: '#1A1A1A',
            backgroundColor: '#FAFAF7',
          }}
        />
      </BrutalCard>

      {/* 생년월일 */}
      <BrutalCard intensity="soft">
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A8270', marginBottom: 6 }}>생년월일</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <SegmentInput
            value={year}
            onChangeText={setYear}
            maxLength={4}
            placeholder="년"
            onFilled={() => monthRef.current?.focus()}
            style={{ flex: 2 }}
          />
          <Text style={{ color: '#8A8270', fontWeight: '700' }}>-</Text>
          <SegmentInput
            value={month}
            onChangeText={setMonth}
            maxLength={2}
            placeholder="월"
            inputRef={monthRef}
            onFilled={() => dayRef.current?.focus()}
            style={{ flex: 1 }}
          />
          <Text style={{ color: '#8A8270', fontWeight: '700' }}>-</Text>
          <SegmentInput
            value={day}
            onChangeText={setDay}
            maxLength={2}
            placeholder="일"
            inputRef={dayRef}
            style={{ flex: 1 }}
          />
        </View>
      </BrutalCard>

      {/* 시간 */}
      <BrutalCard intensity="soft">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A8270' }}>출생 시간</Text>
          <Pressable
            onPress={() => setTimeUnknown((v) => !v)}
            style={{
              borderWidth: 2,
              borderColor: '#1A1A1A',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: timeUnknown ? '#1A1A1A' : '#FAFAF7',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: timeUnknown ? '#FFFFFF' : '#1A1A1A' }}>시간 모름</Text>
          </Pressable>
        </View>
        {!timeUnknown && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <SegmentInput
              value={hour}
              onChangeText={setHour}
              maxLength={2}
              placeholder="시"
              inputRef={hourRef}
              onFilled={() => minuteRef.current?.focus()}
              style={{ flex: 1 }}
            />
            <Text style={{ color: '#8A8270', fontWeight: '700' }}>:</Text>
            <SegmentInput
              value={minute}
              onChangeText={setMinute}
              maxLength={2}
              placeholder="분"
              inputRef={minuteRef}
              style={{ flex: 1 }}
            />
          </View>
        )}
        {timeUnknown && (
          <Text style={{ fontSize: 12, color: '#8A8270', fontWeight: '600' }}>시간 미입력 — 시주 제외로 계산됩니다</Text>
        )}
      </BrutalCard>

      {/* 양음력 */}
      <BrutalCard intensity="soft">
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A8270', marginBottom: 8 }}>양력 / 음력</Text>
        <PillToggle options={calendarOptions} value={calendar} onChange={setCalendar} />
        {calendar === 'lunar' && (
          <Pressable
            onPress={() => setIsLeapMonth((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}
          >
            <View style={{ width: 18, height: 18, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 4, backgroundColor: isLeapMonth ? '#1A1A1A' : '#FAFAF7', alignItems: 'center', justifyContent: 'center' }}>
              {isLeapMonth && <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>✓</Text>}
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}>윤달</Text>
          </Pressable>
        )}
      </BrutalCard>

      {/* 성별 */}
      <BrutalCard intensity="soft">
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A8270', marginBottom: 8 }}>성별</Text>
        <PillToggle
          options={[
            { label: '남성', value: 'male' },
            { label: '여성', value: 'female' },
          ]}
          value={gender}
          onChange={setGender}
        />
      </BrutalCard>

      {/* 출생지 */}
      <BrutalCard intensity="soft">
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A8270', marginBottom: 6 }}>출생지 (선택)</Text>
        {selectedCity ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>{selectedCity.label}</Text>
              <Text style={{ fontSize: 11, color: '#8A8270', marginTop: 2 }}>{selectedCity.sublabel}</Text>
            </View>
            <Pressable
              onPress={() => { setSelectedCity(null); setCityQuery('') }}
              style={{ borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1A1A1A' }}>변경</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              value={cityQuery}
              onChangeText={(v) => { setCityQuery(v); setSelectedCity(null) }}
              placeholder="도시명 검색 (예: 서울, Tokyo)"
              placeholderTextColor="#C0B8A8"
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
              }}
            />
            {citySearching && (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <ActivityIndicator size="small" color="#1A1A1A" />
              </View>
            )}
            {cityResults.length > 0 && (
              <View style={{ marginTop: 4, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 8, overflow: 'hidden', maxHeight: 200 }}>
                <FlatList
                  data={cityResults}
                  keyExtractor={(item) => `${item.label}-${item.longitude}`}
                  renderItem={({ item, index }) => (
                    <Pressable
                      onPress={() => {
                        setSelectedCity(item)
                        setCityQuery('')
                        setCityResults([])
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderTopWidth: index > 0 ? 1 : 0,
                        borderTopColor: '#E0D9CE',
                        backgroundColor: '#FAFAF7',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{item.label}</Text>
                      <Text style={{ fontSize: 11, color: '#8A8270' }}>{item.sublabel}</Text>
                    </Pressable>
                  )}
                  scrollEnabled
                  nestedScrollEnabled
                />
              </View>
            )}
          </>
        )}
      </BrutalCard>

      {/* Submit */}
      <Button
        label={busy ? '계산 중...' : submitLabel}
        onPress={handleSubmit}
        variant="primary"
        disabled={busy || year.length < 4 || month.length < 1 || day.length < 1 || (!timeUnknown && (hour.length < 1 || minute.length < 1))}
      />
    </View>
  )
}
