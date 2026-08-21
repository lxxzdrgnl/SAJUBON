'use client'

/**
 * ScoreOverview — 궁합 점수 히어로 + 4세부 바
 * 종합 점수를 Wrapped 스타일 큰 숫자로 카운트업, 하위에 4개 세부 점수 바를 표시.
 * 색은 전부 design.md §2 토큰 사용. inline style에서만 CSS 변수 참조.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

// ── 인터페이스 ─────────────────────────────────────────────────────────────────

export interface CompatibilityScore {
  total: number
  day_pillar: number
  element_harmony: number
  branch_relation: number
  ten_gods: number
}

export interface ScoreOverviewProps {
  score: CompatibilityScore
  nameA?: string
  nameB?: string
}

// ── 카운트업 ──────────────────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 0 → target 카운트업. easeOut 커브. reduced-motion 시 즉시 최종값. */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    let start: number | null = null
    const tick = (ts: number) => {
      if (start === null) start = ts
      const t = Math.min((ts - start) / durationMs, 1)
      // easeOut cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    setValue(0)
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, durationMs])

  return value
}

// ── 세부 점수 바 ──────────────────────────────────────────────────────────────

interface SubScoreBarProps {
  label: string
  value: number
}

function SubScoreBar({ label, value }: SubScoreBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[13px] font-extrabold text-ink">{label}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-border-soft">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-teal transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-8 text-right text-[14px] font-extrabold tabular-nums text-ink">
        {value}
      </span>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function ScoreOverview({ score, nameA, nameB }: ScoreOverviewProps) {
  const t = useTranslations('compatibility')
  const displayScore = useCountUp(score.total)

  const isHighScore = score.total >= 90
  const isLowScore = score.total <= 35

  const subScores = [
    { key: 'dayPillar', value: score.day_pillar },
    { key: 'elementHarmony', value: score.element_harmony },
    { key: 'branchRelation', value: score.branch_relation },
    { key: 'tenGods', value: score.ten_gods },
  ] as const

  return (
    <div className="rounded-lg border-2 border-ink bg-surface p-5 shadow-brutal">
      {/* 이름 레이블 */}
      {(nameA || nameB) && (
        <p className="mb-3 text-[13px] font-extrabold tracking-[0.14em] text-ink">
          {nameA ?? t('scoreOverview.personA')}{' '}
          <span className="text-orange">&amp;</span>{' '}
          {nameB ?? t('scoreOverview.personB')}
        </p>
      )}

      {/* 히어로 점수 */}
      <div className="mb-5 flex items-end gap-2">
        <span
          className="font-black leading-[0.85] tabular-nums text-ink"
          style={{
            fontSize: 'clamp(88px, 28vw, 128px)',
            letterSpacing: '-0.04em',
            color: isHighScore
              ? 'var(--teal)'
              : isLowScore
                ? 'var(--text-sub)'
                : 'var(--ink)',
          }}
        >
          {displayScore}
        </span>
        <span className="mb-4 text-[22px] font-black text-ink">/100</span>

        {/* 뱃지 */}
        {isHighScore && (
          <span className="mb-4 rounded-full bg-teal px-3 py-1 text-[11px] font-black text-white">
            {t('scoreOverview.highBadge')}
          </span>
        )}
        {isLowScore && (
          <span className="mb-4 rounded-full bg-border-soft px-3 py-1 text-[11px] font-black text-text-sub">
            {t('scoreOverview.lowBadge')}
          </span>
        )}
      </div>

      {/* 4세부 점수 바 */}
      <div className="flex flex-col gap-3">
        {subScores.map(({ key, value }) => (
          <SubScoreBar key={key} label={t(`scoreOverview.${key}`)} value={value} />
        ))}
      </div>
    </div>
  )
}
