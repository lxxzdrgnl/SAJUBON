import { View, Text } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'

interface Props {
  tenGodsDistribution: Record<string, number>
}

export function TenGodsRow({ tenGodsDistribution }: Props) {
  const entries = Object.entries(tenGodsDistribution)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0)
  const max = entries[0]?.[1] ?? 1

  return (
    <BrutalCard>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 }}>십성 분포</Text>
      <View style={{ gap: 6 }}>
        {entries.map(([god, count]) => {
          const pct = Math.round((count / max) * 100)
          return (
            <View key={god} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ width: 28, fontSize: 12, fontWeight: '800', color: '#1A1A1A' }}>{god}</Text>
              <View style={{ flex: 1, height: 14, backgroundColor: '#F0EDE6', borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: '#E0D9CE' }}>
                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#1A1A1A', borderRadius: 7, opacity: 0.15 + 0.65 * (pct / 100) }} />
              </View>
              <Text style={{ width: 20, fontSize: 11, fontWeight: '700', color: '#8A8270', textAlign: 'right' }}>{count}</Text>
            </View>
          )
        })}
      </View>
    </BrutalCard>
  )
}
