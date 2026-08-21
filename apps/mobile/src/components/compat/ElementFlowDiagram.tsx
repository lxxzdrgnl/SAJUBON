/**
 * ElementFlowDiagram — 오행 흐름 다이어그램 (web ElementFlowDiagram RN 포트).
 * CompatibilitySynastry를 받아 stem_hap, element_synergy, complement, yongsin,
 * clash_pairs, day_ten_god 6개 섹션을 렌더한다.
 */

import { Text, View } from 'react-native'
import type { CompatibilitySynastry } from '@sajuguri/api-client'
import { BrutalCard } from '@/components/ui/BrutalCard'

const TEAL = '#00A878'
const ORANGE = '#FF6B00'
const INK = '#1A1A1A'
const TEXT_SUB = '#8A8270'

// ── 소형 공용 컴포넌트 ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '900', color: TEAL, marginBottom: 6, letterSpacing: 0.5 }}>
      {children}
    </Text>
  )
}

type ChipVariant = 'default' | 'clash' | 'synergy-saeng' | 'synergy-geuk' | 'yongsin'

function Chip({ children, variant = 'default' }: { children: string; variant?: ChipVariant }) {
  const styles: Record<ChipVariant, { bg: string; border: string; color: string }> = {
    default: { bg: '#E6F7F1', border: TEAL, color: '#005A3D' },
    clash: { bg: '#FFF4E3', border: ORANGE, color: ORANGE },
    'synergy-saeng': { bg: '#E6F7F1', border: TEAL, color: '#005A3D' },
    'synergy-geuk': { bg: '#FFF4E3', border: ORANGE, color: ORANGE },
    yongsin: { bg: '#FFFBF2', border: '#C0A040', color: INK },
  }
  const s = styles[variant]
  return (
    <View
      style={{
        backgroundColor: s.bg,
        borderWidth: 1,
        borderColor: s.border,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '800', color: s.color }}>{children}</Text>
    </View>
  )
}

function ArrowText({ direction = 'right' }: { direction?: 'right' | 'left' | 'both' }) {
  const sym = direction === 'both' ? '⇌' : direction === 'left' ? '←' : '→'
  return <Text style={{ fontSize: 15, fontWeight: '900', color: TEAL }}>{sym}</Text>
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────

interface ElementFlowDiagramProps {
  synastry: CompatibilitySynastry
  nameA: string
  nameB: string
}

export function ElementFlowDiagram({ synastry, nameA, nameB }: ElementFlowDiagramProps) {
  const {
    stem_hap,
    day_ten_god,
    element_synergy,
    clash_pairs,
    complement_a_to_b,
    complement_b_to_a,
    yongsin_help,
  } = synastry

  const hasStemHap = !!stem_hap
  const hasSynergy = !!element_synergy
  const hasComplements = complement_a_to_b.length > 0 || complement_b_to_a.length > 0
  const hasClash = clash_pairs.length > 0
  const hasYongsin = !!yongsin_help

  const isSaeng = typeof element_synergy === 'string' && element_synergy.includes('상생')
  const isGeuk = typeof element_synergy === 'string' && element_synergy.includes('상극')

  function yongsinLabel(): string {
    if (yongsin_help === 'a_helps_b') return `${nameA}이(가) ${nameB}의 용신을 채워줌`
    if (yongsin_help === 'b_helps_a') return `${nameB}이(가) ${nameA}의 용신을 채워줌`
    if (yongsin_help === 'mutual') return '서로의 용신을 채워주는 궁합'
    return ''
  }

  return (
    <BrutalCard intensity="full">
      <Text style={{ fontSize: 17, fontWeight: '900', color: TEAL, marginBottom: 16 }}>
        오행 흐름
      </Text>

      <View style={{ gap: 16 }}>
        {/* 천간합화 */}
        {hasStemHap && (
          <View>
            <SectionLabel>천간합화</SectionLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <View style={{ backgroundColor: '#FFFBF2', borderWidth: 2, borderColor: INK, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: INK }}>{nameA}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: TEXT_SUB }}>+</Text>
              <View style={{ backgroundColor: '#FFFBF2', borderWidth: 2, borderColor: INK, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: INK }}>{nameB}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: TEXT_SUB }}>→</Text>
              <View style={{ backgroundColor: '#E6F7F1', borderWidth: 2, borderColor: TEAL, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#005A3D' }}>{stem_hap}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 4 }}>
              {stem_hap}(으)로 합쳐지는 흐름
            </Text>
          </View>
        )}

        {/* 상생/상극/동기 */}
        {hasSynergy && (
          <View>
            <SectionLabel>오행 관계</SectionLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: INK }}>{nameA}</Text>
              <ArrowText direction="right" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: INK }}>{nameB}</Text>
              <Chip variant={isSaeng ? 'synergy-saeng' : isGeuk ? 'synergy-geuk' : 'default'}>
                {element_synergy!}
              </Chip>
            </View>
          </View>
        )}

        {/* 보완 방향 */}
        {hasComplements && (
          <View style={{ gap: 8 }}>
            <SectionLabel>보완 방향</SectionLabel>
            {complement_a_to_b.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: INK }}>{nameA}</Text>
                <ArrowText direction="right" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: INK }}>{nameB}</Text>
                <Text style={{ fontSize: 11, color: TEXT_SUB }}>:</Text>
                {complement_a_to_b.map((el) => <Chip key={el}>{el}</Chip>)}
              </View>
            )}
            {complement_b_to_a.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: INK }}>{nameB}</Text>
                <ArrowText direction="right" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: INK }}>{nameA}</Text>
                <Text style={{ fontSize: 11, color: TEXT_SUB }}>:</Text>
                {complement_b_to_a.map((el) => <Chip key={el}>{el}</Chip>)}
              </View>
            )}
          </View>
        )}

        {/* 용신 보완 */}
        {hasYongsin && (
          <View>
            <SectionLabel>용신 보완</SectionLabel>
            <Chip variant="yongsin">{yongsinLabel()}</Chip>
          </View>
        )}

        {/* 지지충 */}
        {hasClash && (
          <View>
            <SectionLabel>지지충</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {clash_pairs.map(([a, b], i) => (
                <Chip key={i} variant="clash">{`${a} ↔ ${b}`}</Chip>
              ))}
            </View>
          </View>
        )}

        {/* 십성 관계 */}
        <View>
          <SectionLabel>십성 관계</SectionLabel>
          <Text style={{ fontSize: 14, fontWeight: '800', color: INK }}>
            {nameA} 기준 상대 십성: {day_ten_god}
          </Text>
        </View>
      </View>
    </BrutalCard>
  )
}
