import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { GanjiColumn } from './GanjiColumn'
import { useAuth } from '@/lib/auth/AuthContext'
import type { YeonUnEntry, WolUnEntry } from '@sajuguri/api-client'

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function TabBtn({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A',
        paddingHorizontal: 12, paddingVertical: 4,
        backgroundColor: active ? '#FFDE21' : '#FAFAF7',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#1A1A1A' : '#8A8270' }}>{label}</Text>
    </Pressable>
  )
}

export function YeonWolUn({ dayStem }: { dayStem: string }) {
  const { api } = useAuth()
  const [tab, setTab] = useState<'yeon' | 'wol'>('yeon')
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [yeon, setYeon] = useState<YeonUnEntry[] | null>(null)
  const [wol, setWol] = useState<WolUnEntry[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!dayStem) return
    const params = new URLSearchParams({ start_year: String(currentYear - 2), count: '10', day_stem: dayStem })
    api.get<YeonUnEntry[]>(`/api/saju/yeon-un?${params}`).then(setYeon).catch(() => setError(true))
  }, [dayStem, currentYear, api])

  useEffect(() => {
    if (!dayStem || tab !== 'wol' || wol !== null) return
    const params = new URLSearchParams({ year: String(currentYear), day_stem: dayStem })
    api.get<WolUnEntry[]>(`/api/saju/wol-un?${params}`).then(setWol).catch(() => setError(true))
  }, [tab, dayStem, currentYear, wol, api])

  const list = tab === 'yeon' ? yeon : wol
  const loading = list === null && !error

  return (
    <BrutalCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>연운 · 월운</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TabBtn active={tab === 'yeon'} label="연운" onPress={() => setTab('yeon')} />
          <TabBtn active={tab === 'wol'} label="월운" onPress={() => setTab('wol')} />
        </View>
      </View>

      {error ? (
        <Text style={{ color: '#8A8270', fontSize: 13 }}>데이터를 불러올 수 없어요</Text>
      ) : loading ? (
        <Text style={{ color: '#8A8270', fontSize: 13 }}>불러오는 중...</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {tab === 'yeon'
            ? (yeon ?? []).map((e) => (
                <GanjiColumn
                  key={e.year}
                  topLabel={String(e.year)}
                  stem={e.stem} stemElement={e.stem_element}
                  branch={e.branch} branchElement={e.branch_element}
                  stemTenGod={e.stem_ten_god} branchTenGod={e.branch_ten_god}
                  twelveWun={e.twelve_wun}
                  highlight={e.year === currentYear}
                  badge={e.year === currentYear ? '올해' : undefined}
                  dim={e.year < currentYear}
                />
              ))
            : (wol ?? []).map((e) => (
                <GanjiColumn
                  key={e.month}
                  topLabel={MONTH_NAMES[e.month - 1]}
                  stem={e.stem} stemElement={e.stem_element}
                  branch={e.branch} branchElement={e.branch_element}
                  stemTenGod={e.stem_ten_god} branchTenGod={e.branch_ten_god}
                  twelveWun={e.twelve_wun}
                  highlight={e.month === currentMonth}
                  badge={e.month === currentMonth ? '이번달' : undefined}
                />
              ))}
        </ScrollView>
      )}
    </BrutalCard>
  )
}
