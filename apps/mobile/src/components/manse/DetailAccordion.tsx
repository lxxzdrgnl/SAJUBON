import { useState } from 'react'
import { Pressable, View, Text } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import type { SajuCalcResponse } from '@sajuguri/api-client'

const PILLAR_LABELS: [keyof Pick<SajuCalcResponse, 'year_pillar' | 'month_pillar' | 'day_pillar' | 'hour_pillar'>, string][] = [
  ['year_pillar', '년주'],
  ['month_pillar', '월주'],
  ['day_pillar', '일주'],
  ['hour_pillar', '시주'],
]

export function DetailAccordion({ data }: { data: SajuCalcResponse }) {
  const [open, setOpen] = useState(false)

  return (
    <BrutalCard>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>12운성 · 신살 · 지장간</Text>
        <Text style={{ fontSize: 13, color: '#8A8270', fontWeight: '700' }}>{open ? '접기 ▲' : '펼치기 ▼'}</Text>
      </Pressable>

      {open && (
        <View style={{ marginTop: 12, gap: 12 }}>
          {PILLAR_LABELS.map(([key, label]) => {
            const pillar = data[key]
            if (!pillar) return null
            return (
              <View key={label}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 }}>{label} — {pillar.ganji_name}</Text>
                <View style={{ gap: 4 }}>
                  {(pillar as { twelve_wun?: string }).twelve_wun && (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Text style={{ fontSize: 11, color: '#8A8270', fontWeight: '700', width: 56 }}>12운성</Text>
                      <Text style={{ fontSize: 11, color: '#1A1A1A', fontWeight: '600' }}>{(pillar as { twelve_wun?: string }).twelve_wun}</Text>
                    </View>
                  )}
                  {(pillar as { naeum_eum?: string }).naeum_eum && (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Text style={{ fontSize: 11, color: '#8A8270', fontWeight: '700', width: 56 }}>납음</Text>
                      <Text style={{ fontSize: 11, color: '#1A1A1A', fontWeight: '600' }}>{(pillar as { naeum_eum?: string }).naeum_eum}</Text>
                    </View>
                  )}
                  {data.ji_jang_gan[pillar.branch] && (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Text style={{ fontSize: 11, color: '#8A8270', fontWeight: '700', width: 56 }}>지장간</Text>
                      <Text style={{ fontSize: 11, color: '#1A1A1A', fontWeight: '600' }}>
                        {data.ji_jang_gan[pillar.branch].join(' · ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </BrutalCard>
  )
}
