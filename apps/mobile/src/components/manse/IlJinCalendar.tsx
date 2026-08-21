import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { useAuth } from '@/lib/auth/AuthContext'
import { calendarGrid, dateKey, prevMonth, nextMonth } from '@/lib/manse/ilJin'
import type { IlJinEntry } from '@sajuguri/api-client'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export function IlJinCalendar() {
  const { api } = useAuth()
  const now = new Date()
  const todayStr = dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate())

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [entries, setEntries] = useState<IlJinEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    const params = new URLSearchParams({ year: String(year), month: String(month) })
    api.get<IlJinEntry[]>(`/api/saju/il-jin?${params}`)
      .then((d) => { if (alive) { setEntries(d); setLoading(false) } })
      .catch(() => { if (alive) { setError(true); setLoading(false) } })
    return () => { alive = false }
  }, [year, month, api])

  const grid = calendarGrid(year, month, entries)
  const go = (fn: typeof prevMonth) => { const n = fn(year, month); setYear(n.year); setMonth(n.month) }

  return (
    <BrutalCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>일진 달력</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => go(prevMonth)}
            style={{ borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#FAFAF7', paddingHorizontal: 8, paddingVertical: 4 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '900' }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 13, fontWeight: '800', minWidth: 80, textAlign: 'center' }}>{year} {MONTH_NAMES[month - 1]}</Text>
          <Pressable
            onPress={() => go(nextMonth)}
            style={{ borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#FAFAF7', paddingHorizontal: 8, paddingVertical: 4 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '900' }}>›</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <Text style={{ color: '#8A8270', textAlign: 'center', paddingVertical: 24 }}>일진 데이터를 불러올 수 없어요</Text>
      ) : loading ? (
        <Text style={{ color: '#8A8270', textAlign: 'center', paddingVertical: 24 }}>일진 불러오는 중...</Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((wd, i) => (
              <View key={wd} style={{ flex: 1, alignItems: 'center', paddingBottom: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: i === 0 ? '#FF6B00' : i === 6 ? '#0090A8' : '#8A8270' }}>{wd}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {grid.map((cell, idx) => {
              const isToday = cell.date === todayStr
              const colIdx = idx % 7
              return (
                <View
                  key={idx}
                  style={{
                    width: '14.28%',
                    minHeight: 64,
                    borderRadius: 6,
                    padding: 3,
                    backgroundColor: isToday ? '#FFF9E0' : cell.entry?.solar_term ? '#FBF3D9' : 'transparent',
                    borderWidth: isToday ? 2 : 0,
                    borderColor: '#1A1A1A',
                  }}
                >
                  {cell.day != null && (
                    <>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isToday ? '#1A1A1A' : colIdx === 0 ? '#FF6B00' : colIdx === 6 ? '#0090A8' : '#1A1A1A' }}>{cell.day}</Text>
                      {cell.entry?.solar_term != null && <Text style={{ fontSize: 9, fontWeight: '600', color: '#B07A00' }}>{cell.entry.solar_term}</Text>}
                      {cell.entry != null && <Text style={{ fontSize: 10, fontWeight: '600', color: '#8A8270' }}>{cell.entry.ganji_name}</Text>}
                      {cell.entry != null && (
                        <Text style={{ fontSize: 9, color: cell.entry.is_leap_month ? '#0090A8' : '#8A8270' }}>
                          {cell.entry.is_leap_month ? '(윤)' : ''}{cell.entry.lunar_month}/{cell.entry.lunar_day}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              )
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 2, borderTopColor: '#E0D9CE', paddingTop: 8, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#FFF9E0' }} />
              <Text style={{ fontSize: 11, color: '#8A8270' }}>오늘</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#FBF3D9' }} />
              <Text style={{ fontSize: 11, color: '#8A8270' }}>절기</Text>
            </View>
            <Text style={{ fontSize: 11, color: '#0090A8' }}>(윤) 윤달</Text>
          </View>
        </>
      )}
    </BrutalCard>
  )
}
