import { View, Text } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { ohaengColor } from '@/lib/manse/ohaeng'
import type { SajuCalcResponse } from '@sajuguri/api-client'

const WUXING_ORDER = ['木', '火', '土', '金', '水']
const WUXING_FEATURES: Record<string, { organ: string; direction: string; season: string }> = {
  木: { organ: '간·담', direction: '동', season: '봄' },
  火: { organ: '심장·소장', direction: '남', season: '여름' },
  土: { organ: '비장·위', direction: '중앙', season: '환절기' },
  金: { organ: '폐·대장', direction: '서', season: '가을' },
  水: { organ: '신장·방광', direction: '북', season: '겨울' },
}

export function WuxingFeatureTable({ data }: { data: SajuCalcResponse }) {
  const count = data.wuxing_count ?? {}
  const total = Object.values(count).reduce((s, v) => s + (v as number), 0) || 1

  return (
    <BrutalCard>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 }}>오행 특성 참고표</Text>
      <View style={{ gap: 6 }}>
        {WUXING_ORDER.map((w) => {
          const n = (count[w] as number) ?? 0
          const pct = Math.round((n / total) * 100)
          const color = ohaengColor(w)
          const feat = WUXING_FEATURES[w]
          return (
            <View key={w} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{
                width: 28, height: 28, borderRadius: 6,
                borderWidth: 1.5, borderColor: '#1A1A1A',
                backgroundColor: color, alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A1A' }}>{w}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A', width: 32 }}>{pct}%</Text>
              <Text style={{ fontSize: 11, color: '#8A8270', flex: 1 }}>
                {feat.organ} · {feat.direction} · {feat.season}
              </Text>
            </View>
          )
        })}
      </View>
    </BrutalCard>
  )
}
