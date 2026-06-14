import { View, Text } from 'react-native'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { ohaengColor, ohaengTintColor } from '@/lib/manse/ohaeng'
import type { Pillar } from '@sajuguri/api-client'

interface Props {
  pillar: Pillar
  kind: 'stem' | 'branch'
  label?: string
  isDay?: boolean
}

export function PillarCard({ pillar, kind, label, isDay = false }: Props) {
  const hanja = kind === 'stem' ? pillar.stem_hanja : pillar.branch_hanja
  const kor = kind === 'stem' ? pillar.stem : pillar.branch
  const element = kind === 'stem' ? pillar.stem_element : pillar.branch_element
  const tenGod = kind === 'stem' ? pillar.stem_ten_god : pillar.branch_ten_god
  const color = ohaengColor(element)
  const bg = ohaengTintColor(element)
  const borderColor = isDay ? '#FF6B00' : '#1A1A1A'
  const shadowColor = isDay ? '#FF6B00' : '#1A1A1A'

  return (
    <BrutalShadow offset={2} radius={11} color={shadowColor} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: bg, borderRadius: 11, borderWidth: 2, borderColor, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' }}>
        {label && <Text style={{ fontSize: 10, fontWeight: '800', color: isDay ? '#FF6B00' : '#8A8270', marginBottom: 2 }}>{label}{isDay ? ' ★' : ''}</Text>}
        <Text className="font-serif" style={{ fontSize: 26, fontWeight: '900', lineHeight: 30, color }}>{hanja}</Text>
        <Text style={{ fontSize: 11, fontWeight: '800', color }}>{kor} · {element}</Text>
        <Text style={{ fontSize: 10, color: '#8A8270', marginTop: 2 }}>{tenGod}</Text>
      </View>
    </BrutalShadow>
  )
}
