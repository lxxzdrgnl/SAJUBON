import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { useAuth } from '@/lib/auth/AuthContext'
import { searchCities, type CityOption } from '@sajuguri/api-client'
import { colors, radii } from '@/theme'

// 생년월일 입력 폼 — 웹 BirthInputForm 디자인에 맞춤(단일 브루탈 카드 + 날짜·시각 한 줄 입력바 +
// 양력/음력/윤달·성별 알약 세그먼트 + 주황 제출). 출력 계약(ManseBirthInput)·props는 불변.
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
  nameOptional?: boolean
}

// 날짜·시각 한 줄 입력바 안의 숫자 칸 (가운데 정렬, tabular)
function SegInput({
  value,
  onChangeText,
  maxLength,
  placeholder,
  inputRef,
  onFilled,
  flex,
}: {
  value: string
  onChangeText: (v: string) => void
  maxLength: number
  placeholder: string
  inputRef?: React.RefObject<TextInput | null>
  onFilled?: () => void
  flex: number
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
      placeholderTextColor={colors.textSub}
      style={{
        flex,
        minWidth: 0,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '700',
        color: colors.ink,
        fontVariant: ['tabular-nums'],
        paddingVertical: 0,
      }}
    />
  )
}

// 알약 세그먼트 (양력/음력/윤달, 성별) — rounded-full border-2, 활성=노랑
function Segment({
  items,
}: {
  items: { label: string; active: boolean; disabled?: boolean; onPress: () => void }[]
}) {
  return (
    <View className="flex-row overflow-hidden rounded-full border-2 border-ink">
      {items.map((it, i) => (
        <Pressable
          key={it.label}
          disabled={it.disabled}
          onPress={it.onPress}
          className={`flex-1 py-2 ${i > 0 ? 'border-l-2 border-ink' : ''} ${it.active ? 'bg-yellow' : ''}`}
          style={{ opacity: it.disabled ? 0.35 : 1 }}
        >
          <Text
            className={`text-center text-sm font-extrabold ${it.active ? 'text-ink' : 'text-text-sub'}`}
          >
            {it.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="mb-1.5 text-xs font-extrabold text-ink">{children}</Text>
}

export function BirthInputForm({ onSubmit, submitLabel = '만세력 보기', busy = false, nameOptional = false }: Props) {
  const { api } = useAuth()

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState('')
  const [minute, setMinute] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar')
  const [isLeap, setIsLeap] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<CityOption[]>([])
  const [city, setCity] = useState<CityOption | null>(null)
  const [citySearching, setCitySearching] = useState(false)

  const monthRef = useRef<TextInput>(null)
  const dayRef = useRef<TextInput>(null)
  const hourRef = useRef<TextInput>(null)
  const minuteRef = useRef<TextInput>(null)

  // 도시 검색 (디바운스 300ms)
  useEffect(() => {
    if (!cityQuery.trim() || city) {
      setCityResults([])
      return
    }
    const timer = setTimeout(async () => {
      setCitySearching(true)
      try {
        setCityResults(await searchCities(api, cityQuery))
      } finally {
        setCitySearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [cityQuery, api, city])

  const dateReady = year.length === 4 && month.length >= 1 && day.length >= 1
  const timeReady = timeUnknown || (hour.length >= 1 && minute.length >= 1)
  const canSubmit = dateReady && timeReady && !busy

  const handleSubmit = useCallback(async () => {
    setSubmitError(null)
    if (!nameOptional && !name.trim()) { setSubmitError('이름을 입력해 주세요.'); return }
    if (!year || !month || !day) { setSubmitError('생년월일을 입력해 주세요.'); return }
    const yNum = parseInt(year, 10); const mNum = parseInt(month, 10); const dNum = parseInt(day, 10)
    if (yNum < 1900 || yNum > 2100) { setSubmitError('연도는 1900년 ~ 2100년 사이여야 합니다.'); return }
    if (mNum < 1 || mNum > 12) { setSubmitError('월은 1 ~ 12 사이여야 합니다.'); return }
    const maxDay = new Date(yNum, mNum, 0).getDate()
    if (dNum > maxDay) { setSubmitError(`${yNum}년 ${mNum}월은 ${maxDay}일까지 있습니다.`); return }
    if (!timeUnknown && hour === '') { setSubmitError('시를 입력해 주세요.'); return }
    if (!timeUnknown && minute === '') { setSubmitError('분을 입력해 주세요.'); return }
    const birth_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const birth_time = timeUnknown ? null : `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
    const input: ManseBirthInput = {
      name,
      birth_date,
      birth_time,
      gender,
      calendar,
      is_leap_month: calendar === 'lunar' ? isLeap : false,
      ...(city
        ? {
            birth_longitude: city.longitude,
            birth_utc_offset: city.isKorea ? undefined : city.utcOffset,
            city: city.label,
          }
        : {}),
    }
    await onSubmit(input)
  }, [dateReady, timeReady, year, month, day, hour, minute, timeUnknown, name, gender, calendar, isLeap, city, onSubmit, nameOptional])

  const sep = <Text className="text-text-sub">/</Text>

  return (
    <BrutalShadow radius={radii.card}>
      <View className="gap-4 rounded-2xl border-2 border-ink bg-surface p-4">
        {/* 이름 */}
        <View>
          <FieldLabel>{nameOptional ? '이름' : '이름 *'}</FieldLabel>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={20}
            placeholder="이름 (선택)"
            placeholderTextColor={colors.textSub}
            className="rounded-xl border-2 border-ink bg-bg-base px-3 text-sm text-ink"
            style={{ paddingVertical: 10 }}
          />
        </View>

        {/* 출생지 */}
        <View>
          <FieldLabel>출생지</FieldLabel>
          {city ? (
            <View className="flex-row items-center justify-between rounded-xl border-2 border-ink bg-bg-base px-3 py-2.5">
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-ink">{city.label}</Text>
                <Text className="text-xs text-text-sub">{city.sublabel}</Text>
              </View>
              <Pressable onPress={() => { setCity(null); setCityQuery('') }} hitSlop={8}>
                <Text className="text-sm text-text-sub">✕</Text>
              </Pressable>
            </View>
          ) : (
            <View className="rounded-xl border-[1.5px] border-border-soft px-3">
              <TextInput
                value={cityQuery}
                onChangeText={setCityQuery}
                placeholder="도시명 검색 (예: 서울, 도쿄, 뉴욕)"
                placeholderTextColor={colors.textSub}
                className="text-sm text-ink"
                style={{ paddingVertical: 10 }}
              />
            </View>
          )}
          {!city && (citySearching || cityResults.length > 0) && (
            <BrutalShadow radius={radii.button} style={{ marginTop: 4 }}>
              <View className="overflow-hidden rounded-xl border-2 border-ink bg-surface">
                {citySearching ? (
                  <View className="px-3 py-2.5">
                    <ActivityIndicator size="small" color={colors.ink} />
                  </View>
                ) : (
                  cityResults.slice(0, 6).map((c, i) => (
                    <Pressable
                      key={`${c.label}-${c.timezone}`}
                      onPress={() => { setCity(c); setCityQuery(''); setCityResults([]) }}
                      className={`flex-row items-center justify-between px-3 py-2.5 ${i > 0 ? 'border-t border-border-soft' : ''}`}
                    >
                      <Text className="text-sm font-bold text-ink">{c.label}</Text>
                      <Text className="text-xs text-text-sub">{c.sublabel}</Text>
                    </Pressable>
                  ))
                )}
              </View>
            </BrutalShadow>
          )}
          {!city && !cityQuery && (
            <Text style={{ fontSize: 11, color: '#8A8270', marginTop: 4 }}>미입력 시 서울 기준 적용</Text>
          )}
          <Text className="mt-1 text-[11px] text-text-sub">
            {city ? city.timezone : '출생지를 넣으면 진태양시로 더 정확해져요'}
          </Text>
        </View>

        {/* 생년월일 · 시각 */}
        <View>
          <View className="mb-1.5 flex-row items-center justify-between">
            <Text className="text-xs font-extrabold text-ink">생년월일 · 시각</Text>
            <Pressable className="flex-row items-center gap-1.5" onPress={() => setTimeUnknown((v) => !v)}>
              <View
                className="h-4 w-4 items-center justify-center rounded border-2 border-ink"
                style={{ backgroundColor: timeUnknown ? colors.ink : colors.bgBase }}
              >
                {timeUnknown && <Text className="text-[10px] font-black text-white">✓</Text>}
              </View>
              <Text className="text-[11px] text-text-sub">시간 모름</Text>
            </Pressable>
          </View>

          {/* 한 줄 입력바 */}
          <View className="flex-row items-center gap-1 rounded-xl border-2 border-ink bg-bg-base px-2 py-2.5">
            <SegInput value={year} onChangeText={setYear} maxLength={4} placeholder="YYYY" onFilled={() => monthRef.current?.focus()} flex={2} />
            {sep}
            <SegInput value={month} onChangeText={setMonth} maxLength={2} placeholder="MM" inputRef={monthRef} onFilled={() => dayRef.current?.focus()} flex={1} />
            {sep}
            <SegInput value={day} onChangeText={setDay} maxLength={2} placeholder="DD" inputRef={dayRef} onFilled={() => hourRef.current?.focus()} flex={1} />
            <Text className="px-0.5 text-border-soft">·</Text>
            {timeUnknown ? (
              <Text className="text-center text-[13px] text-text-sub" style={{ flex: 2 }}>모름</Text>
            ) : (
              <View className="flex-row items-center justify-center gap-1" style={{ flex: 2 }}>
                <SegInput value={hour} onChangeText={setHour} maxLength={2} placeholder="HH" inputRef={hourRef} onFilled={() => minuteRef.current?.focus()} flex={1} />
                <Text className="text-text-sub">:</Text>
                <SegInput value={minute} onChangeText={setMinute} maxLength={2} placeholder="mm" inputRef={minuteRef} flex={1} />
              </View>
            )}
          </View>

          {/* 양력 · 음력 · 윤달 */}
          <View className="mt-2">
            <Segment
              items={[
                { label: '양력', active: calendar === 'solar', onPress: () => { setCalendar('solar'); setIsLeap(false) } },
                { label: '음력', active: calendar === 'lunar' && !isLeap, onPress: () => { setCalendar('lunar'); setIsLeap(false) } },
                { label: '윤달', active: calendar === 'lunar' && isLeap, disabled: calendar !== 'lunar', onPress: () => setIsLeap(true) },
              ]}
            />
          </View>

          {timeUnknown && (
            <Text className="mt-1 text-[11px] text-text-sub">시간을 모르면 시주를 제외하고 계산해요</Text>
          )}
        </View>

        {/* 성별 */}
        <View>
          <FieldLabel>성별</FieldLabel>
          <Segment
            items={[
              { label: '남성', active: gender === 'male', onPress: () => setGender('male') },
              { label: '여성', active: gender === 'female', onPress: () => setGender('female') },
            ]}
          />
        </View>

        {submitError && (
          <Text style={{ color: '#FF6B00', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{submitError}</Text>
        )}

        {/* 제출 — 웹과 동일 주황 */}
        <BrutalShadow radius={radii.button} style={{ opacity: canSubmit ? 1 : 0.4 }}>
          <Pressable
            onPress={canSubmit ? handleSubmit : undefined}
            className="items-center justify-center rounded-xl border-2 border-ink bg-orange py-3"
          >
            <Text className="text-[15px] font-extrabold text-white">{busy ? '계산 중…' : submitLabel}</Text>
          </Pressable>
        </BrutalShadow>
      </View>
    </BrutalShadow>
  )
}
