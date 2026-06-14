/**
 * CompatScoreHeader — 궁합 점수 + 두 사람 이름 + 시너지 요약 헤더.
 */

import { Text, View } from 'react-native'
import type { CompatibilityScore, CompatibilitySynastry } from '@sajuguri/api-client'
import { BrutalCard } from '@/components/ui/BrutalCard'

interface CompatScoreHeaderProps {
  nameA: string
  nameB: string
  score: CompatibilityScore
  synastry: CompatibilitySynastry
  /** 종합 케미 탭 헤드라인 (한 줄 요약) */
  summaryLine?: string
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A8270' }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '900', color: '#1A1A1A' }}>{value}점</Text>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: '#E0D9CE',
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: '#1A1A1A',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${Math.min(value, 100)}%`,
            backgroundColor: value >= 70 ? '#00A878' : value >= 40 ? '#FF6B00' : '#E53E3E',
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  )
}

export function CompatScoreHeader({
  nameA,
  nameB,
  score,
  synastry,
  summaryLine,
}: CompatScoreHeaderProps) {
  const totalColor =
    score.total >= 70 ? '#00A878' : score.total >= 40 ? '#FF6B00' : '#E53E3E'

  return (
    <View style={{ gap: 16 }}>
      {/* 두 사람 이름 + 종합 점수 */}
      <BrutalCard intensity="full">
        <View style={{ alignItems: 'center', gap: 8 }}>
          {/* 이름 행 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                backgroundColor: '#FFF4E3',
                borderWidth: 2,
                borderColor: '#FF6B00',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#FF6B00' }}>
                {nameA}
              </Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A' }}>♥</Text>
            <View
              style={{
                backgroundColor: '#FFF4E3',
                borderWidth: 2,
                borderColor: '#FF6B00',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#FF6B00' }}>
                {nameB}
              </Text>
            </View>
          </View>

          {/* 종합 점수 */}
          <Text style={{ fontSize: 56, fontWeight: '900', color: totalColor, lineHeight: 64 }}>
            {score.total}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#8A8270', marginTop: -4 }}>
            종합 궁합 점수
          </Text>

          {/* 한 줄 요약 */}
          {summaryLine ? (
            <View
              style={{
                backgroundColor: '#FFF4E3',
                borderRadius: 10,
                padding: 12,
                marginTop: 4,
                width: '100%',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: '#1A1A1A',
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {summaryLine}
              </Text>
            </View>
          ) : null}
        </View>
      </BrutalCard>

      {/* 세부 점수 바 */}
      <BrutalCard intensity="soft">
        <Text style={{ fontSize: 13, fontWeight: '900', color: '#1A1A1A', marginBottom: 12 }}>
          세부 점수
        </Text>
        <View style={{ gap: 10 }}>
          <ScoreBar label="일주 궁합" value={score.day_pillar} />
          <ScoreBar label="오행 조화" value={score.element_harmony} />
          <ScoreBar label="지지 관계" value={score.branch_relation} />
          <ScoreBar label="십신 관계" value={score.ten_gods} />
        </View>
      </BrutalCard>

      {/* 시너지 태그 */}
      {synastry.interaction_tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {synastry.interaction_tags.map((tag, i) => (
            <View
              key={i}
              style={{
                borderWidth: 2,
                borderColor: '#1A1A1A',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: '#FAFAF7',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1A1A1A' }}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 시너지 요약 — stem_hap, element_synergy */}
      {(synastry.stem_hap || synastry.element_synergy) && (
        <BrutalCard intensity="soft">
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#00A878', marginBottom: 8 }}>
            오행 시너지
          </Text>
          {synastry.stem_hap && (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270' }}>천간합</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                {synastry.stem_hap}
              </Text>
            </View>
          )}
          {synastry.element_synergy && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270' }}>오행 시너지</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                {synastry.element_synergy}
              </Text>
            </View>
          )}
        </BrutalCard>
      )}
    </View>
  )
}
