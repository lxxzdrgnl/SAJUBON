import { View } from 'react-native'
import { Chip } from '@/components/ui/Chip'
import type { SajuCalcResponse, SinSal } from '@sajuguri/api-client'

function sinSalVariant(s: SinSal): 'lucky' | 'unlucky' | 'default' {
  if (s.type === 'lucky') return 'lucky'
  if (s.type === 'unlucky' || s.type === 'warning') return 'unlucky'
  return 'default'
}

export function TagChips({ data }: { data: SajuCalcResponse }) {
  const shown = data.sin_sals.slice(0, 4)
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <Chip label={`${data.day_pillar.ganji_name} 일주`} variant="yellow" />
      <Chip label={data.gyeok_guk.name} />
      <Chip label={`용신 ${data.yong_sin.primary}`} />
      <Chip label={data.day_master_strength.level_8} />
      {shown.map((s) => (
        <Chip key={s.name} label={s.name} variant={sinSalVariant(s)} />
      ))}
    </View>
  )
}
