import { View, Text } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { Chip } from '@/components/ui/Chip'
import type { DayMasterStrength, YongSin } from '@sajuguri/api-client'

interface Props {
  dayMasterStrength: DayMasterStrength
  yongSin: YongSin
  gyeokGuk: { name: string; basis: string }
}

export function StrengthSection({ dayMasterStrength, yongSin, gyeokGuk }: Props) {
  const deukChips = [
    { label: '득령', active: dayMasterStrength.deuk_ryeong },
    { label: '득지', active: dayMasterStrength.deuk_ji },
    { label: '득시', active: dayMasterStrength.deuk_si },
    { label: '득세', active: dayMasterStrength.deuk_se },
  ]

  return (
    <View style={{ gap: 12 }}>
      {/* 일간 강약 */}
      <BrutalCard>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 }}>일간 강약</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A1A1A' }}>{dayMasterStrength.level_8}</Text>
            <Text style={{ fontSize: 12, color: '#8A8270', fontWeight: '600', marginTop: 2 }}>점수 {dayMasterStrength.score.toFixed(1)}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
            {deukChips.map(({ label, active }) => (
              <Chip key={label} label={label} variant={active ? 'lucky' : 'default'} />
            ))}
          </View>
        </View>
      </BrutalCard>

      {/* 용신 */}
      <BrutalCard>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 }}>용신</Text>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#8A8270', fontWeight: '700', width: 40 }}>용신</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>{yongSin.primary}</Text>
            {yongSin.secondary && (
              <Text style={{ fontSize: 13, color: '#8A8270' }}>· {yongSin.secondary}</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#8A8270', fontWeight: '700', width: 40 }}>유형</Text>
            <Text style={{ fontSize: 13, color: '#1A1A1A', fontWeight: '600' }}>{yongSin.yong_sin_label}</Text>
          </View>
          {yongSin.xi_sin.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: '#8A8270', fontWeight: '700' }}>희신</Text>
              {yongSin.xi_sin.map((s) => (
                <Chip key={s} label={s} variant="lucky" />
              ))}
            </View>
          )}
          {yongSin.ji_sin.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              <Text style={{ fontSize: 11, color: '#8A8270', fontWeight: '700' }}>기신</Text>
              {yongSin.ji_sin.map((s) => (
                <Chip key={s} label={s} variant="unlucky" />
              ))}
            </View>
          )}
        </View>
      </BrutalCard>

      {/* 격국 */}
      <BrutalCard>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 }}>격국</Text>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A' }}>{gyeokGuk.name}</Text>
        <Text style={{ fontSize: 12, color: '#8A8270', marginTop: 4, lineHeight: 18 }}>{gyeokGuk.basis}</Text>
      </BrutalCard>
    </View>
  )
}
