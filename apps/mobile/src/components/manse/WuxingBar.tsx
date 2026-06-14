import { View, Text } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { Chip } from '@/components/ui/Chip'
import { ohaengColor, ohaengTintColor } from '@/lib/manse/ohaeng'

const ELEMENTS = ['목', '화', '토', '금', '수'] as const

interface Props {
  wuxingCount: Record<string, number>
  dominantElements: string[]
  weakElements: string[]
}

export function WuxingBar({ wuxingCount, dominantElements, weakElements }: Props) {
  const total = ELEMENTS.reduce((sum, el) => sum + (wuxingCount[el] ?? 0), 0) || 1

  return (
    <BrutalCard>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 }}>오행 분포</Text>
      <View style={{ gap: 6 }}>
        {ELEMENTS.map((el) => {
          const count = wuxingCount[el] ?? 0
          const pct = Math.round((count / total) * 100)
          const color = ohaengColor(el)
          const bg = ohaengTintColor(el)
          return (
            <View key={el} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ width: 20, fontSize: 12, fontWeight: '800', color }}>{el}</Text>
              <View style={{ flex: 1, height: 14, backgroundColor: '#F0EDE6', borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: '#E0D9CE' }}>
                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 7 }} />
              </View>
              <Text style={{ width: 28, fontSize: 11, fontWeight: '700', color: '#8A8270', textAlign: 'right' }}>{count}</Text>
            </View>
          )
        })}
      </View>
      {(dominantElements.length > 0 || weakElements.length > 0) && (
        <View style={{ marginTop: 14, gap: 8 }}>
          {dominantElements.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A8270', marginRight: 2 }}>강한 오행</Text>
              {dominantElements.map((el) => (
                <Chip key={el} label={el} variant="lucky" />
              ))}
            </View>
          )}
          {weakElements.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A8270', marginRight: 2 }}>약한 오행</Text>
              {weakElements.map((el) => (
                <Chip key={el} label={el} variant="unlucky" />
              ))}
            </View>
          )}
        </View>
      )}
    </BrutalCard>
  )
}
