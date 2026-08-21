'use client'

/**
 * ElementFlowDiagram — 오행 흐름 다이어그램
 * CompatibilitySynastry 신호를 받아:
 *   - 천간합화 노드 (stem_hap)
 *   - 상생/상극 방향 화살표 (element_synergy)
 *   - 보완 방향 칩+화살표 (complement_a_to_b / complement_b_to_a)
 *   - 용신 보완 뱃지 (yongsin_help)
 *   - 지지충 칩 (clash_pairs)
 *   - 십성 라벨 (day_ten_god)
 * 색은 전부 design.md §2 토큰 사용.
 */

import { useTranslations } from 'next-intl'

// ── 인터페이스 ─────────────────────────────────────────────────────────────────

export interface CompatibilitySynastry {
  stem_hap: string | null
  day_ten_god: string
  element_synergy: string | null
  clash_pairs: [string, string][]
  complement_a_to_b: string[]
  complement_b_to_a: string[]
  yongsin_help: 'a_helps_b' | 'b_helps_a' | 'mutual' | null
  interaction_tags: string[]
}

export interface ElementFlowDiagramProps {
  synastry: CompatibilitySynastry
  nameA: string
  nameB: string
}

// ── 공용 소형 컴포넌트 ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[12px] font-extrabold tracking-[0.14em] text-teal-deep">
      {children}
    </p>
  )
}

function Chip({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'clash' | 'synergy-saeng' | 'synergy-geuk' | 'yongsin'
}) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-extrabold'
  const variants: Record<string, string> = {
    default: 'bg-teal-tint text-teal-deep border border-teal',
    clash: 'bg-orange-tint text-orange border border-orange',
    'synergy-saeng': 'bg-teal-tint text-teal-deep border border-teal',
    'synergy-geuk': 'bg-orange-tint text-orange border border-orange',
    yongsin: 'bg-yellow-tint text-ink border border-amber',
  }
  return <span className={`${base} ${variants[variant]}`}>{children}</span>
}

function Arrow({ direction = 'right' }: { direction?: 'right' | 'left' | 'both' }) {
  if (direction === 'both') return <span className="text-[15px] font-black text-teal">⇌</span>
  if (direction === 'left') return <span className="text-[15px] font-black text-teal">←</span>
  return <span className="text-[15px] font-black text-teal">→</span>
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function ElementFlowDiagram({
  synastry,
  nameA,
  nameB,
}: ElementFlowDiagramProps) {
  const t = useTranslations('compatibility')

  const {
    stem_hap,
    day_ten_god,
    element_synergy,
    clash_pairs,
    complement_a_to_b,
    complement_b_to_a,
    yongsin_help,
  } = synastry

  const hasSynergy = !!element_synergy
  const hasComplements = complement_a_to_b.length > 0 || complement_b_to_a.length > 0
  const hasClash = clash_pairs.length > 0
  const hasStemHap = !!stem_hap
  const hasYongsin = !!yongsin_help

  // element_synergy 값이 '상생'/'상극'/'동기'인지 판단
  const isSaeng =
    typeof element_synergy === 'string' && element_synergy.includes('상생')
  const isGeuk =
    typeof element_synergy === 'string' && element_synergy.includes('상극')

  // yongsin_help 방향 레이블
  function yongsinLabel(): string {
    if (yongsin_help === 'a_helps_b') return t('elementFlow.yongsinAHelpsB', { nameA, nameB })
    if (yongsin_help === 'b_helps_a') return t('elementFlow.yongsinBHelpsA', { nameA, nameB })
    if (yongsin_help === 'mutual') return t('elementFlow.yongsinMutual')
    return ''
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border-2 border-ink bg-surface p-5 shadow-brutal">
      <p className="text-[17px] font-extrabold text-teal">
        {t('elementFlow.title')}
      </p>

      {/* 천간합화 노드 */}
      {hasStemHap && (
        <div className="flex flex-col gap-1">
          <SectionLabel>{t('elementFlow.stemHapLabel')}</SectionLabel>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-lg border-2 border-ink bg-yellow-tint px-3 py-1.5 text-[14px] font-extrabold text-ink">
              {nameA}
            </span>
            <span className="text-[15px] font-black text-text-sub">+</span>
            <span className="rounded-lg border-2 border-ink bg-yellow-tint px-3 py-1.5 text-[14px] font-extrabold text-ink">
              {nameB}
            </span>
            <span className="text-[15px] font-black text-text-sub">→</span>
            <span className="rounded-lg border-2 border-teal bg-teal-tint px-3 py-1.5 text-[14px] font-extrabold text-teal-deep">
              {stem_hap}
            </span>
          </div>
          <p className="text-[12px] text-text-sub">
            {t('elementFlow.stemHapDesc', { element: stem_hap ?? '' })}
          </p>
        </div>
      )}

      {/* 상생/상극/동기 화살표 */}
      {hasSynergy && (
        <div className="flex flex-col gap-1">
          <SectionLabel>{t('elementFlow.synergyLabel')}</SectionLabel>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-extrabold text-ink">{nameA}</span>
            <Arrow direction="right" />
            <span className="text-[13px] font-extrabold text-ink">{nameB}</span>
            <Chip variant={isSaeng ? 'synergy-saeng' : isGeuk ? 'synergy-geuk' : 'default'}>
              {element_synergy}
            </Chip>
          </div>
        </div>
      )}

      {/* 보완 방향 칩+화살표 */}
      {hasComplements && (
        <div className="flex flex-col gap-2">
          <SectionLabel>{t('elementFlow.complementLabel')}</SectionLabel>

          {complement_a_to_b.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] font-extrabold text-ink">{nameA}</span>
              <Arrow direction="right" />
              <span className="text-[12px] font-extrabold text-ink">{nameB}</span>
              <span className="text-[11px] text-text-sub mx-1">:</span>
              {complement_a_to_b.map((el) => (
                <Chip key={el}>{el}</Chip>
              ))}
            </div>
          )}

          {complement_b_to_a.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] font-extrabold text-ink">{nameB}</span>
              <Arrow direction="right" />
              <span className="text-[12px] font-extrabold text-ink">{nameA}</span>
              <span className="text-[11px] text-text-sub mx-1">:</span>
              {complement_b_to_a.map((el) => (
                <Chip key={el}>{el}</Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 용신 보완 뱃지 */}
      {hasYongsin && (
        <div className="flex flex-col gap-1">
          <SectionLabel>{t('elementFlow.yongsinLabel')}</SectionLabel>
          <Chip variant="yongsin">{yongsinLabel()}</Chip>
        </div>
      )}

      {/* 지지충 칩 */}
      {hasClash && (
        <div className="flex flex-col gap-1">
          <SectionLabel>{t('elementFlow.clashLabel')}</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {clash_pairs.map(([a, b], i) => (
              <Chip key={i} variant="clash">
                {a} ↔ {b}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* 십성 라벨 */}
      <div className="flex flex-col gap-1">
        <SectionLabel>{t('elementFlow.tenGodLabel')}</SectionLabel>
        <p className="text-[14px] font-extrabold text-ink">
          {t('elementFlow.tenGodDesc', { nameA, tenGod: day_ten_god })}
        </p>
      </div>
    </div>
  )
}
