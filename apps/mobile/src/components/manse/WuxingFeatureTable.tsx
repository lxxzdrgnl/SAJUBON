import { View, Text } from 'react-native'
import type { SajuCalcResponse } from '@sajuguri/api-client'
import { Accordion } from '@/components/ui/Accordion'
import { Chip } from '@/components/ui/Chip'
import { ohaengColor } from '@/lib/manse/ohaeng'
import { colors } from '@/theme'

// 오행 특성 참고표 — 웹 WuxingFeatureTable 미러. 과다(dominant)·부족(weak) 오행 강조.
// 정적 데이터(웹과 동일), 퍼센트 표시 안 함. Accordion으로 접힘.
const FEATURES = [
  { el: '목', dir: '동 · 봄', traits: '창의·성장·인자함', body: '간·담·눈', jobs: '교육·의료·법' },
  { el: '화', dir: '남 · 여름', traits: '열정·표현·명랑함', body: '심장·소장·혀', jobs: '방송·영업·IT' },
  { el: '토', dir: '중앙 · 환절기', traits: '신뢰·중용·포용력', body: '위·비장·입', jobs: '부동산·금융·중개' },
  { el: '금', dir: '서 · 가을', traits: '의리·결단·정의감', body: '폐·대장·코', jobs: '군경·기계·법조' },
  { el: '수', dir: '북 · 겨울', traits: '지혜·유연·통찰력', body: '신장·방광·귀', jobs: '철학·유통·무역' },
] as const

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Text style={{ fontSize: 11, color: colors.textSub, width: 64 }}>{label}</Text>
      <Text style={{ fontSize: 11, color: colors.ink, flex: 1, fontWeight: '600' }}>{value}</Text>
    </View>
  )
}

export function WuxingFeatureTable({ data }: { data: SajuCalcResponse }) {
  const dominant = data.dominant_elements ?? []
  const weak = data.weak_elements ?? []

  return (
    <Accordion title="오행 특성 참고표">
      <View style={{ gap: 12 }}>
        {FEATURES.map((f) => {
          const isOver = dominant.includes(f.el)
          const isLack = weak.includes(f.el)
          const color = ohaengColor(f.el)
          return (
            <View
              key={f.el}
              style={{
                gap: 4,
                paddingBottom: 10,
                borderBottomWidth: f.el === '수' ? 0 : 1,
                borderBottomColor: colors.borderSoft,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: colors.ink,
                    backgroundColor: `${color}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '900', color }}>{f.el}</Text>
                </View>
                {isOver && <Chip label="과다" variant="unlucky" />}
                {isLack && <Chip label="부족" variant="lucky" />}
              </View>
              <Field label="방위·계절" value={f.dir} />
              <Field label="성격 특성" value={f.traits} />
              <Field label="관련 신체" value={f.body} />
              <Field label="어울리는 직업" value={f.jobs} />
            </View>
          )
        })}
      </View>
    </Accordion>
  )
}
