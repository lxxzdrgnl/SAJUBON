/**
 * CompatScoreHeader — 궁합 점수 히어로 + 4세부 바 (web ScoreOverview 포트).
 * - 종합 점수 0→final 카운트업 (900ms easeOut)
 * - 색 임계값: ≥90 teal / ≤35 sub / else ink
 * - highBadge "찰떡궁합" (≥90) / lowBadge "주의" (≤35)
 * - 세부 점수 바: 일주 / 오행 조화 / 지지 관계 / 십성
 */

import { useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import type { CompatibilityScore, CompatibilitySynastry } from '@sajuguri/api-client'
import { BrutalCard } from '@/components/ui/BrutalCard'

// ── 색상 토큰 ───────────────────────────────────────────────────────────────
const TEAL = '#00A878'
const ORANGE = '#FF6B00'
const INK = '#1A1A1A'
const TEXT_SUB = '#8A8270'
const BORDER_SOFT = '#E0D9CE'

// ── 카운트업 훅 ─────────────────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setValue(0)
    startRef.current = null
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const t = Math.min((ts - startRef.current) / durationMs, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, durationMs])

  return value
}

// ── 세부 점수 바 ─────────────────────────────────────────────────────────────
function SubScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ width: 72, fontSize: 13, fontWeight: '800', color: INK }}>{label}</Text>
      <View
        style={{
          flex: 1,
          height: 12,
          backgroundColor: BORDER_SOFT,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.min(value, 100)}%` as `${number}%`,
            backgroundColor: TEAL,
            borderRadius: 999,
          }}
        />
      </View>
      <Text style={{ width: 28, textAlign: 'right', fontSize: 14, fontWeight: '900', color: INK }}>
        {value}
      </Text>
    </View>
  )
}

// ── Props ───────────────────────────────────────────────────────────────────
interface CompatScoreHeaderProps {
  nameA: string
  nameB: string
  score: CompatibilityScore
  synastry: CompatibilitySynastry
  summaryLine?: string
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export function CompatScoreHeader({
  nameA,
  nameB,
  score,
  synastry,
  summaryLine,
}: CompatScoreHeaderProps) {
  const displayScore = useCountUp(score.total)
  const isHighScore = score.total >= 90
  const isLowScore = score.total <= 35
  const totalColor = isHighScore ? TEAL : isLowScore ? TEXT_SUB : INK

  const subScores: Array<{ label: string; value: number }> = [
    { label: '일주', value: score.day_pillar },
    { label: '오행 조화', value: score.element_harmony },
    { label: '지지 관계', value: score.branch_relation },
    { label: '십성', value: score.ten_gods },
  ]

  return (
    <View style={{ gap: 16 }}>
      {/* 히어로 점수 카드 */}
      <BrutalCard intensity="full">
        <View style={{ alignItems: 'center', gap: 8 }}>
          {/* 이름 행 */}
          <Text style={{ fontSize: 13, fontWeight: '800', color: INK }}>
            {nameA} <Text style={{ color: ORANGE }}>&amp;</Text> {nameB}
          </Text>

          {/* 종합 점수 (카운트업) */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8 }}>
            <Text
              style={{
                fontSize: 88,
                fontWeight: '900',
                color: totalColor,
                lineHeight: 88,
                letterSpacing: -3,
              }}
            >
              {displayScore}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: INK, marginBottom: 12 }}>
              /100
            </Text>
            {isHighScore && (
              <View
                style={{
                  backgroundColor: TEAL,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>찰떡궁합</Text>
              </View>
            )}
            {isLowScore && (
              <View
                style={{
                  backgroundColor: BORDER_SOFT,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: TEXT_SUB }}>주의</Text>
              </View>
            )}
          </View>

          {/* 한 줄 요약 */}
          {summaryLine ? (
            <View
              style={{
                backgroundColor: '#FFF4E3',
                borderRadius: 10,
                padding: 12,
                width: '100%',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: INK,
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

      {/* 4세부 점수 바 */}
      <BrutalCard intensity="soft">
        <Text style={{ fontSize: 13, fontWeight: '900', color: INK, marginBottom: 12 }}>
          세부 점수
        </Text>
        <View style={{ gap: 12 }}>
          {subScores.map(({ label, value }) => (
            <SubScoreBar key={label} label={label} value={value} />
          ))}
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
                borderColor: INK,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: '#FAFAF7',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: INK }}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 시너지 요약 */}
      {(synastry.stem_hap || synastry.element_synergy) && (
        <BrutalCard intensity="soft">
          <Text style={{ fontSize: 13, fontWeight: '900', color: TEAL, marginBottom: 8 }}>
            오행 시너지
          </Text>
          {synastry.stem_hap && (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_SUB }}>천간합</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>{synastry.stem_hap}</Text>
            </View>
          )}
          {synastry.element_synergy && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_SUB }}>오행 시너지</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>{synastry.element_synergy}</Text>
            </View>
          )}
        </BrutalCard>
      )}
    </View>
  )
}
