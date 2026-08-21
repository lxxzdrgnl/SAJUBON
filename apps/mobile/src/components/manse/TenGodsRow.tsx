import { View, Text } from 'react-native'
import Svg, { Path, Text as SvgText } from 'react-native-svg'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { ohaengColor } from '@/lib/manse/ohaeng'
import { donutArcs, groupSummary, dominantGroups, TG_ELEMENT, DONUT_GEOMETRY } from '@/lib/manse/tenGods'
import type { SajuCalcResponse } from '@sajuguri/api-client'

export function TenGodsRow({ data }: { data: SajuCalcResponse }) {
  const dist = data.ten_gods_distribution ?? {}
  const arcs = donutArcs(dist, (ss) => ohaengColor(TG_ELEMENT[ss] ?? ''))
  const summary = groupSummary(dist)
  const dominant = dominantGroups(dist)
  const { CX, CY } = DONUT_GEOMETRY

  return (
    <BrutalCard>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 }}>십성 구조</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {/* SVG donut 140×140 */}
        <View style={{ flexShrink: 0 }}>
          <Svg viewBox="0 0 120 120" width={140} height={140}>
            {arcs.map((a) => (
              <Path key={a.ss} d={a.d} fill={a.color} stroke="#FFFFFF" strokeWidth="1.5" />
            ))}
            <SvgText x={CX} y={CY - 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#8A8270">핵심 구조</SvgText>
            <SvgText x={CX} y={CY + 10} textAnchor="middle" fontSize="11" fontWeight="800" fill="#1A1A1A">
              {dominant.join('·') || '—'}
            </SvgText>
          </Svg>
        </View>

        {/* Group summary bars */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270', marginBottom: 6 }}>십성 구조 요약</Text>
          {summary.map((g) => {
            const hot = dominant.includes(g.group)
            return (
              <View key={g.group} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <View style={{ width: 40, flexShrink: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: hot ? '#FF6B00' : '#1A1A1A' }}>{g.group}</Text>
                  <Text style={{ fontSize: 9, color: '#8A8270' }}>{g.label}</Text>
                </View>
                <View style={{ flex: 1, height: 8, backgroundColor: '#F0EDE6', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(g.pct, 100)}%`, height: '100%', backgroundColor: hot ? '#FF6B00' : '#A09880', borderRadius: 4 }} />
                </View>
                <Text style={{ width: 32, fontSize: 11, fontWeight: '700', color: '#8A8270', textAlign: 'right' }}>{g.pct}%</Text>
              </View>
            )
          })}
        </View>
      </View>
    </BrutalCard>
  )
}
