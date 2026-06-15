/**
 * ToolCard — React Native 버전 (웹 ToolCard.tsx 대응)
 *
 * 구현된 도구:
 *   get_palja       → PaljaMini
 *   get_wuxing_balance → WuxingMini
 *   get_ten_gods    → TenGodsMini
 *   get_strength    → StrengthMini
 *   get_dae_un      → DaeUnMini
 *   get_daily_fortune → FortuneScoreCard
 *   get_sin_sal     → SinSalChips
 *
 * 미구현(null 반환) — 추후 대응:
 *   get_wol_un, get_yeon_un, get_il_jin, get_compatibility_detail,
 *   get_twelve_un_seong, get_hap_chung,
 *   compat_branches, compat_day_relation, compat_yongsin,
 *   compat_palja_a, compat_palja_b, compat_wuxing_a, compat_wuxing_b,
 *   compat_ten_gods_a, compat_ten_gods_b, compat_strength_a, compat_strength_b
 *
 * AttachSheet 연동(inline_partner 실제 첨부 시트) — MessageBubble.tsx Task 7 참고
 */
import React, { useRef, useEffect } from 'react'
import { View, Text, ScrollView, Animated } from 'react-native'
import { ohaengColor, ohaengTintColor } from '@/lib/manse/ohaeng'
import {
  toPercent,
  judge,
  WUXING_ORDER,
} from '@/lib/manse/wuxing'
import { groupSummary, dominantGroups } from '@/lib/manse/tenGods'

// ── 팔레트 ──────────────────────────────────────────────────────────────────
const ink = '#1A1A1A'
const teal = '#00A878'
const tealTint = '#E8F7F2'
const orange = '#FF6B00'
const orangeTint = '#FFEDE0'
const yellow = '#FFE566'
const yellowTint = '#FFF9E0'
const textSub = '#8A8270'
const borderSoft = '#E0D9CE'

// ── 카드 공통 wrapper ────────────────────────────────────────────────────────
function CardWrapper({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: teal,
        backgroundColor: tealTint,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '800',
          color: '#00665F',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  )
}

// ── 도구 레이블 ──────────────────────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  get_dae_un: '대운',
  get_wol_un: '월운',
  get_yeon_un: '연운',
  get_daily_fortune: '오늘의 운세',
  get_il_jin: '일진',
  get_compatibility_detail: '궁합',
  get_wuxing_balance: '오행 균형',
  get_ten_gods: '십성 분포',
  get_sin_sal: '신살',
  get_palja: '사주팔자',
  get_strength: '강약·용신',
  get_twelve_un_seong: '12운성',
  get_hap_chung: '합충 관계',
  compat_branches: '지지 합·충 관계',
  compat_day_relation: '두 일간의 관계',
  compat_yongsin: '용신 보완',
  compat_palja_a: '사주팔자 (A)',
  compat_palja_b: '사주팔자 (B)',
  compat_wuxing_a: '오행 균형 (A)',
  compat_wuxing_b: '오행 균형 (B)',
  compat_ten_gods_a: '십성 분포 (A)',
  compat_ten_gods_b: '십성 분포 (B)',
  compat_strength_a: '강약·용신 (A)',
  compat_strength_b: '강약·용신 (B)',
}

// ── PaljaMini ────────────────────────────────────────────────────────────────
interface Pillar {
  stem: string
  branch: string
  stem_element: string
  branch_element: string
}

function PillarCell({ pillar, isDay }: { pillar: Pillar; isDay?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      {/* 천간 */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          borderWidth: isDay ? 2 : 1,
          borderColor: isDay ? orange : borderSoft,
          backgroundColor: ohaengTintColor(pillar.stem_element),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '800', color: ohaengColor(pillar.stem_element) }}>
          {pillar.stem}
        </Text>
      </View>
      {/* 지지 */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: borderSoft,
          backgroundColor: ohaengTintColor(pillar.branch_element),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '800', color: ohaengColor(pillar.branch_element) }}>
          {pillar.branch}
        </Text>
      </View>
    </View>
  )
}

function PaljaMini({ payload }: { payload: Record<string, unknown> }) {
  const pillars = [
    { key: 'year_pillar', label: '년' },
    { key: 'month_pillar', label: '월' },
    { key: 'day_pillar', label: '일' },
    { key: 'hour_pillar', label: '시' },
  ]

  return (
    <CardWrapper label={TOOL_LABELS.get_palja}>
      {/* 라벨 행 */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {pillars.map(({ label }) => (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: textSub, fontWeight: '700' }}>{label}</Text>
          </View>
        ))}
      </View>
      {/* 기둥 행 */}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {pillars.map(({ key }, idx) => {
          const pillar = payload[key] as Pillar | undefined
          if (!pillar) return <View key={key} style={{ flex: 1 }} />
          return (
            <PillarCell key={key} pillar={pillar} isDay={idx === 2} />
          )
        })}
      </View>
    </CardWrapper>
  )
}

// ── WuxingMini ───────────────────────────────────────────────────────────────
const WUXING_COLORS: Record<string, string> = {
  목: '#2D6A4F',
  화: '#C84B31',
  토: '#8B6914',
  금: '#5C5C5C',
  수: '#1A4F7A',
}

function WuxingMini({ payload }: { payload: Record<string, unknown> }) {
  const raw = (payload.wuxing_count_hap ?? payload.wuxing_count) as Record<string, number> | undefined
  if (!raw) return null
  const pct = toPercent(raw)

  const verdictColor = (v: string) => {
    if (v === '과다') return orange
    if (v === '부족') return '#5C5C5C'
    return teal
  }

  return (
    <CardWrapper label={TOOL_LABELS.get_wuxing_balance}>
      <View style={{ gap: 6 }}>
        {WUXING_ORDER.map((el) => {
          const p = pct[el] ?? 0
          const v = judge(p)
          return (
            <View key={el} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  width: 20,
                  fontSize: 13,
                  fontWeight: '800',
                  color: ohaengColor(el),
                  textAlign: 'center',
                }}
              >
                {el}
              </Text>
              {/* 바 */}
              <View
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#D9D0C4',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${p}%`,
                    height: '100%',
                    borderRadius: 4,
                    backgroundColor: ohaengColor(el),
                  }}
                />
              </View>
              <Text style={{ width: 30, fontSize: 11, color: textSub, textAlign: 'right' }}>
                {p}%
              </Text>
              {/* 판정 칩 */}
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: ohaengTintColor(el),
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: verdictColor(v) }}>
                  {v}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </CardWrapper>
  )
}

// ── TenGodsMini ──────────────────────────────────────────────────────────────
function TenGodsMini({ payload }: { payload: Record<string, unknown> }) {
  const dist = (payload.ten_gods_distribution ?? {}) as Record<string, number>
  const summary = groupSummary(dist)
  const dominant = new Set(dominantGroups(dist))

  if (summary.length === 0) return null

  const maxPct = Math.max(...summary.map((g) => g.pct), 1)

  return (
    <CardWrapper label={TOOL_LABELS.get_ten_gods}>
      <View style={{ gap: 6 }}>
        {summary.map(({ group, label, pct }) => (
          <View key={group} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 56 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: dominant.has(group) ? '800' : '600',
                  color: dominant.has(group) ? ink : textSub,
                }}
              >
                {group}
              </Text>
              <Text style={{ fontSize: 9, color: textSub }}>{label}</Text>
            </View>
            <View
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#D9D0C4',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${(pct / maxPct) * 100}%`,
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: dominant.has(group) ? teal : '#A09080',
                }}
              />
            </View>
            <Text style={{ width: 30, fontSize: 11, color: textSub, textAlign: 'right' }}>
              {pct}%
            </Text>
          </View>
        ))}
      </View>
    </CardWrapper>
  )
}

// ── StrengthMini ─────────────────────────────────────────────────────────────
interface YongSin {
  element: string
  role?: string
  description?: string
}

function StrengthMini({ payload }: { payload: Record<string, unknown> }) {
  const strength = payload.day_master_strength as
    | { level_8?: string; level?: string; score?: number }
    | undefined
  const yongSin = payload.yong_sin as
    | { primary?: YongSin; secondary?: YongSin; ji_sin?: YongSin }
    | undefined

  if (!strength) return null

  const label = strength.level_8 ?? strength.level ?? ''
  const score = typeof strength.score === 'number' ? strength.score : null

  return (
    <CardWrapper label={TOOL_LABELS.get_strength}>
      {/* 강약 레벨 + 게이지 */}
      <View style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: ink }}>{label}</Text>
          {score !== null && (
            <Text style={{ fontSize: 11, color: textSub }}>({score}점)</Text>
          )}
        </View>
        {score !== null && (
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#D9D0C4',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.min(100, Math.max(0, score))}%`,
                height: '100%',
                borderRadius: 4,
                backgroundColor: teal,
              }}
            />
          </View>
        )}
      </View>

      {/* 용신 칩 */}
      {yongSin && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {yongSin.primary && (
            <YongSinChip label="용신" yongSin={yongSin.primary} />
          )}
          {yongSin.secondary && (
            <YongSinChip label="희신" yongSin={yongSin.secondary} />
          )}
          {yongSin.ji_sin && (
            <YongSinChip label="기신" yongSin={yongSin.ji_sin} />
          )}
        </View>
      )}
    </CardWrapper>
  )
}

function YongSinChip({ label, yongSin }: { label: string; yongSin: YongSin }) {
  const el = yongSin.element ?? ''
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: ohaengTintColor(el),
        borderWidth: 1,
        borderColor: ohaengColor(el),
      }}
    >
      <Text style={{ fontSize: 10, color: textSub, fontWeight: '700' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '800', color: ohaengColor(el) }}>{el}</Text>
    </View>
  )
}

// ── DaeUnMini ────────────────────────────────────────────────────────────────
interface DaeUnItem {
  start_age: number
  stem?: string
  branch?: string
  ganji_name?: string
  ganji?: string
}

function DaeUnMini({ payload }: { payload: Record<string, unknown> }) {
  const items = (payload.dae_un_list ?? payload.dae_uns ?? []) as DaeUnItem[]
  const currentDaeUn = payload.current_dae_un as { start_age?: number } | undefined
  const currentAge = currentDaeUn?.start_age

  if (items.length === 0) return null

  const visible = items.slice(0, 6)

  return (
    <CardWrapper label={TOOL_LABELS.get_dae_un}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {visible.map((item, idx) => {
            const isCurrent = item.start_age === currentAge
            const ganji = item.ganji_name ?? item.ganji ?? `${item.stem ?? ''}${item.branch ?? ''}`
            return (
              <View
                key={idx}
                style={{
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: isCurrent ? 2 : 1,
                  borderColor: isCurrent ? orange : borderSoft,
                  backgroundColor: isCurrent ? orangeTint : '#FFFFFF',
                  minWidth: 52,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: isCurrent ? orange : textSub,
                    fontWeight: '700',
                    marginBottom: 2,
                  }}
                >
                  {item.start_age}세
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: isCurrent ? orange : ink,
                  }}
                >
                  {ganji}
                </Text>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </CardWrapper>
  )
}

// ── FortuneScoreCard ──────────────────────────────────────────────────────────
function FortuneScoreCard({ payload }: { payload: Record<string, unknown> }) {
  const score = payload.overall_score as number | undefined
  const overall = payload.overall as string | undefined
  const summary = payload.summary as string | undefined

  return (
    <CardWrapper label={TOOL_LABELS.get_daily_fortune}>
      {score !== undefined && (
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: yellow,
            marginBottom: 8,
            borderWidth: 1.5,
            borderColor: ink,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '900', color: ink }}>{score}점</Text>
        </View>
      )}
      {overall && (
        <Text style={{ fontSize: 13, fontWeight: '700', color: ink, marginBottom: 4 }}>
          {overall}
        </Text>
      )}
      {summary && (
        <Text style={{ fontSize: 12, color: textSub, lineHeight: 18 }}>{summary}</Text>
      )}
    </CardWrapper>
  )
}

// ── SinSalChips ──────────────────────────────────────────────────────────────
interface SinSal {
  name: string
  type?: 'lucky' | 'unlucky' | 'warning' | string
}

function SinSalChips({ payload }: { payload: Record<string, unknown> }) {
  const sinSals = (payload.sin_sals ?? []) as SinSal[]

  if (sinSals.length === 0) return null

  const chipStyle = (type?: string) => {
    if (type === 'lucky') {
      return { bg: tealTint, border: teal, text: '#00665F' }
    }
    return { bg: orangeTint, border: orange, text: '#CC4400' }
  }

  return (
    <CardWrapper label={TOOL_LABELS.get_sin_sal}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {sinSals.map((s, idx) => {
          const c = chipStyle(s.type)
          return (
            <View
              key={idx}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.bg,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.text }}>{s.name}</Text>
            </View>
          )
        })}
      </View>
    </CardWrapper>
  )
}

// ── ToolCard (public export) ──────────────────────────────────────────────────
export interface ToolCardProps {
  tool: string
  payload: Record<string, unknown>
}

export default function ToolCard({ tool, payload }: ToolCardProps) {
  switch (tool) {
    case 'get_palja':
      return <PaljaMini payload={payload} />
    case 'get_wuxing_balance':
      return <WuxingMini payload={payload} />
    case 'get_ten_gods':
      return <TenGodsMini payload={payload} />
    case 'get_strength':
      return <StrengthMini payload={payload} />
    case 'get_dae_un':
      return <DaeUnMini payload={payload} />
    case 'get_daily_fortune':
      return <FortuneScoreCard payload={payload} />
    case 'get_sin_sal':
      return <SinSalChips payload={payload} />
    // 미구현 도구들 — null 반환
    default:
      return null
  }
}
