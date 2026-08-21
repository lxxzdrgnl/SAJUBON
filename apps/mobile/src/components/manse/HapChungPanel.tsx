import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { ohaengColor } from '@/lib/manse/ohaeng'
import {
  ALL_TABS, buildEntries, hasData, activePillars, PLABEL,
  type TabKey, type PillarKey,
} from '@/lib/manse/hapChung'
import type { SajuCalcResponse, Pillar } from '@sajuguri/api-client'

const PALACE_WEIGHTS: Record<PillarKey, { stem: string; branch: string }> = {
  hour: { stem: '×1.0', branch: '×0.8' },
  day: { stem: '×1.5', branch: '×1.0' },
  month: { stem: '×1.0', branch: '×2.0' },
  year: { stem: '×1.0', branch: '×1.0' },
}

function pillarOf(data: SajuCalcResponse, p: PillarKey): Pillar | null {
  return (data[`${p}_pillar`] as Pillar | null) ?? null
}

function Box({ ch, on, weight }: { ch?: string; on: boolean; weight?: string }) {
  return (
    <View style={{
      height: 56, flex: 1, alignItems: 'center', justifyContent: 'center',
      borderRadius: 8, borderWidth: 2,
      borderColor: on ? '#FF6B00' : '#1A1A1A',
      backgroundColor: on ? '#FF6B00' : '#FAFAF7',
    }}>
      <Text className="font-serif" style={{ fontSize: 20, fontWeight: '900', color: on ? '#FFFFFF' : '#1A1A1A' }}>{ch ?? '—'}</Text>
      <View style={{ height: 14, justifyContent: 'center' }}>
        <Text style={{ fontSize: 9, fontWeight: '700', color: on ? 'rgba(255,255,255,0.7)' : '#8A8270' }}>{weight ?? ''}</Text>
      </View>
    </View>
  )
}

function MiniGrid({ data, stems, branches, showWeight, active }: {
  data: SajuCalcResponse
  stems: PillarKey[]
  branches: PillarKey[]
  showWeight: boolean
  active: PillarKey[]
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
      {active.map((pk) => {
        const p = pillarOf(data, pk)
        return (
          <View key={pk} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 10, color: '#8A8270' }}>{PLABEL[pk]}주</Text>
            <Box ch={p?.stem} on={stems.includes(pk)} weight={showWeight ? PALACE_WEIGHTS[pk].stem : undefined} />
            <Box ch={p?.branch} on={branches.includes(pk)} weight={showWeight ? PALACE_WEIGHTS[pk].branch : undefined} />
          </View>
        )
      })}
    </View>
  )
}

export function HapChungPanel({ data }: { data: SajuCalcResponse }) {
  const [tab, setTab] = useState<TabKey>('gung_seong')
  const active = activePillars(data)
  const entries = buildEntries(data, tab)
  const showWeight = tab === 'gung_seong'

  return (
    <BrutalCard>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 }}>합충 분석</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
        {ALL_TABS.map((tabDef) => {
          const has = hasData(data, tabDef.key)
          const isActive = tab === tabDef.key
          return (
            <Pressable
              key={tabDef.key}
              onPress={() => setTab(tabDef.key)}
              style={{
                borderRadius: 999, borderWidth: 2, borderColor: '#1A1A1A',
                paddingHorizontal: 10, paddingVertical: 2,
                backgroundColor: isActive ? '#FFDE21' : '#FAFAF7',
                shadowColor: '#1A1A1A',
                shadowOffset: { width: (isActive || has) ? 2 : 0, height: (isActive || has) ? 2 : 0 },
                shadowOpacity: (isActive || has) ? 1 : 0,
                shadowRadius: 0,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? '#1A1A1A' : has ? '#1A1A1A' : '#8A8270' }}>{tabDef.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <View style={{ borderTopWidth: 2, borderTopColor: '#E0D9CE', paddingTop: 12 }}>
        {showWeight ? (
          <>
            <Text style={{ fontSize: 12, color: '#8A8270', lineHeight: 18, marginBottom: 8 }}>
              기둥 위치에 따라 오행 작용력 가중치가 달라요. 월지 {'>'} 일간 {'>'} 시지·연주 {'>'} 천간 순서예요.
            </Text>
            <MiniGrid data={data} stems={[]} branches={[]} showWeight active={active} />
          </>
        ) : entries.length === 0 ? (
          <Text style={{ color: '#8A8270', fontSize: 13 }}>해당하는 관계가 없어요</Text>
        ) : (
          <View style={{ gap: 20 }}>
            {entries.map((e, i) => (
              <View key={i} style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 18 }}>
                  {e.text.replace(/<b>/g, '').replace(/<\/b>/g, '')}
                </Text>
                {e.broken && (
                  <View style={{
                    alignSelf: 'flex-start', borderRadius: 10, borderWidth: 2, borderColor: '#1A1A1A',
                    backgroundColor: '#FFEDE0', paddingHorizontal: 8, paddingVertical: 2,
                    shadowColor: '#1A1A1A', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#B34800' }}>충으로 합 파괴됨</Text>
                  </View>
                )}
                {e.resultEl != null && !e.broken && (
                  <View style={{
                    alignSelf: 'flex-start', borderRadius: 10, borderWidth: 2, borderColor: '#1A1A1A',
                    paddingHorizontal: 8, paddingVertical: 2,
                    backgroundColor: `${ohaengColor(e.resultEl)}1A`,
                    shadowColor: '#1A1A1A', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: ohaengColor(e.resultEl) }}>→ {e.resultEl}화(化)</Text>
                  </View>
                )}
                <MiniGrid data={data} stems={e.stems} branches={e.branches} showWeight={false} active={active} />
              </View>
            ))}
          </View>
        )}
      </View>
    </BrutalCard>
  )
}
