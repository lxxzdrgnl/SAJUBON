import { View, Text } from 'react-native'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { ganjiNickname } from '@/lib/ganji'
import { radii } from '@/theme'
import type { Pillar } from '@sajuguri/api-client'

interface Props {
  dayPillar: Pillar
  label?: string
}

export function IljuHero({ dayPillar, label = '내 일주' }: Props) {
  const nick = ganjiNickname(dayPillar.stem, dayPillar.branch)

  return (
    <BrutalShadow radius={radii.card}>
      <View
        style={{
          backgroundColor: nick.bg,
          borderRadius: radii.card,
          borderWidth: 2,
          borderColor: '#1A1A1A',
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: text */}
          <View style={{ flex: 1, alignItems: 'flex-start', gap: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(26,26,26,0.6)' }}>{label}</Text>
            <Text
              className="font-serif"
              style={{ fontSize: 42, fontWeight: '900', lineHeight: 48, color: '#1A1A1A' }}
            >
              {dayPillar.stem_hanja}{dayPillar.branch_hanja}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1A1A1A' }}>
              {dayPillar.ganji_name}일주
            </Text>
            {nick.ko ? (
              <View
                style={{
                  marginTop: 4,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: '#1A1A1A',
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1A1A1A' }}>{nick.ko}</Text>
              </View>
            ) : null}
          </View>
          {/* Right: mascot box 84×84 */}
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#1A1A1A',
              backgroundColor: 'rgba(255,255,255,0.7)',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 12,
              flexShrink: 0,
              shadowColor: '#1A1A1A',
              shadowOffset: { width: 3, height: 3 },
              shadowOpacity: 1,
              shadowRadius: 0,
            }}
          >
            <MascotTinted stem={dayPillar.stem} size={64} />
          </View>
        </View>
      </View>
    </BrutalShadow>
  )
}
