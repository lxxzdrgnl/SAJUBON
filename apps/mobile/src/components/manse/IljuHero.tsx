import { View, Text } from 'react-native'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { ganjiNickname } from '@/lib/ganji'
import { ohaengColor } from '@/lib/manse/ohaeng'
import { radii } from '@/theme'
import type { Pillar } from '@sajuguri/api-client'

interface Props {
  dayPillar: Pillar
}

export function IljuHero({ dayPillar }: Props) {
  const nick = ganjiNickname(dayPillar.stem, dayPillar.branch)
  const stemColor = ohaengColor(dayPillar.stem_element)
  const branchColor = ohaengColor(dayPillar.branch_element)

  return (
    <BrutalShadow radius={radii.card}>
      <View
        style={{
          backgroundColor: nick.bg,
          borderRadius: radii.card,
          borderWidth: 2,
          borderColor: '#1A1A1A',
          padding: 20,
          alignItems: 'center',
        }}
      >
        <MascotTinted stem={dayPillar.stem} size={72} />
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginTop: 10 }}>
          {nick.ko}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', opacity: 0.7, marginTop: 2 }}>
          {nick.en}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <Text className="font-serif" style={{ fontSize: 32, fontWeight: '900', color: stemColor }}>{dayPillar.stem_hanja}</Text>
            <Text style={{ fontSize: 11, color: stemColor, fontWeight: '700' }}>{dayPillar.stem} · {dayPillar.stem_element}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text className="font-serif" style={{ fontSize: 32, fontWeight: '900', color: branchColor }}>{dayPillar.branch_hanja}</Text>
            <Text style={{ fontSize: 11, color: branchColor, fontWeight: '700' }}>{dayPillar.branch} · {dayPillar.branch_element}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: '#1A1A1A', opacity: 0.6, marginTop: 8 }}>
          일주 · {dayPillar.ganji_name}
        </Text>
      </View>
    </BrutalShadow>
  )
}
