import { View, Text } from 'react-native'
import { Accordion } from '@/components/ui/Accordion'
import { ohaengColor } from '@/lib/manse/ohaeng'
import { pillarSlots, sinSalsForPillar, jiJangGanText } from '@/lib/manse/pillars'
import type { SajuCalcResponse, SinSal } from '@sajuguri/api-client'

function sinSalVariant(s: SinSal): { bg: string; text: string } {
  if (s.type === 'lucky') return { bg: '#E0FAF8', text: '#00665F' }
  if (s.type === 'unlucky' || s.type === 'warning') return { bg: '#FFEDE0', text: '#B34800' }
  return { bg: '#FAFAF7', text: '#8A8270' }
}

function sinSalPrefix(s: SinSal): string {
  if (s.type === 'lucky') return '+'
  if (s.type === 'unlucky' || s.type === 'warning') return '-'
  return '·'
}

export function DetailAccordion({ data }: { data: SajuCalcResponse }) {
  const slots = pillarSlots(data)

  return (
    <Accordion title="12운성 · 신살 · 지장간 상세">
      {/* Header row */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#1A1A1A', paddingBottom: 6, marginBottom: 2 }}>
        <View style={{ width: 48 }} />
        {slots.map((s) => (
          <View key={s.loc} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{
              fontSize: 11, fontWeight: '800',
              color: s.loc === 'day' ? '#FF6B00' : '#8A8270',
            }}>
              {s.colLabel}{s.loc === 'day' ? ' ★' : ''}
            </Text>
          </View>
        ))}
      </View>

      {/* 12운성 row */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0D9CE', paddingVertical: 8 }}>
        <View style={{ width: 48, justifyContent: 'flex-start' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270' }}>12운성</Text>
        </View>
        {slots.map((s) => (
          <View key={s.loc} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: s.pillar ? ohaengColor(s.pillar.branch_element) : '#8A8270' }}>
              {s.pillar ? s.pillar.twelve_wun : '—'}
            </Text>
          </View>
        ))}
      </View>

      {/* 지장간 row */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0D9CE', paddingVertical: 8 }}>
        <View style={{ width: 48, justifyContent: 'flex-start' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270' }}>지장간</Text>
        </View>
        {slots.map((s) => (
          <View key={s.loc} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1A1A1A', letterSpacing: 1 }}>
              {s.pillar ? jiJangGanText(data.ji_jang_gan, s.loc) || '—' : '—'}
            </Text>
          </View>
        ))}
      </View>

      {/* 신살 row */}
      <View style={{ flexDirection: 'row', paddingTop: 8 }}>
        <View style={{ width: 48, justifyContent: 'flex-start' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270' }}>신살</Text>
        </View>
        {slots.map((s) => {
          const sals = s.pillar ? sinSalsForPillar(data.sin_sals, s.loc) : []
          return (
            <View key={s.loc} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              {sals.length > 0 ? sals.map((sal) => {
                const vs = sinSalVariant(sal)
                return (
                  <View key={sal.name} style={{
                    borderRadius: 8, borderWidth: 1.5, borderColor: '#1A1A1A',
                    backgroundColor: vs.bg, paddingHorizontal: 4, paddingVertical: 1,
                    shadowColor: '#1A1A1A', shadowOffset: { width: 1.5, height: 1.5 }, shadowOpacity: 1, shadowRadius: 0,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: vs.text }}>
                      {sinSalPrefix(sal)}{sal.name}
                    </Text>
                  </View>
                )
              }) : (
                <Text style={{ fontSize: 11, color: '#8A8270' }}>—</Text>
              )}
            </View>
          )
        })}
      </View>
    </Accordion>
  )
}
