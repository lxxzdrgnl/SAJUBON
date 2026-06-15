import { ScrollView, View, Text } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { GanjiColumn } from './GanjiColumn'
import type { SajuCalcResponse } from '@sajuguri/api-client'

export function DaeUnRow({ data }: { data: SajuCalcResponse }) {
  const list = (data.dae_un_list ?? []).slice(0, 10)
  const currentAge = data.current_dae_un?.start_age

  return (
    <BrutalCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>대운</Text>
        <View style={{
          borderRadius: 999, borderWidth: 2, borderColor: '#1A1A1A',
          backgroundColor: '#FFDE21', paddingHorizontal: 8, paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#1A1A1A' }}>{data.dae_un_start_age}세 시작</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
        {list.map((e) => {
          const current = e.start_age === currentAge
          return (
            <View
              key={e.start_age}
              style={current ? {
                borderRadius: 12, borderWidth: 2, borderColor: '#FF6B00',
                backgroundColor: '#FFF4E3', paddingHorizontal: 8, paddingVertical: 4,
                shadowColor: '#FF6B00', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
              } : undefined}
            >
              <GanjiColumn
                topLabel={`${e.start_age}세`}
                stem={e.stem}
                stemElement={e.stem_element}
                branch={e.branch}
                branchElement={e.branch_element}
                stemTenGod={e.stem_ten_god}
                branchTenGod={e.branch_ten_god}
                twelveWun={e.twelve_wun}
                highlight={current}
                badge={current ? '현재' : undefined}
              />
            </View>
          )
        })}
      </ScrollView>
    </BrutalCard>
  )
}
