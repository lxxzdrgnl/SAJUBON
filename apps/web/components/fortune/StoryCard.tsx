'use client'

/**
 * 스토리 단일 카드 렌더 — kind별 레이아웃 분기.
 * design.md §5.6:
 *   - intro: 마스코트(MascotTinted 일간색) + 일진 (큰 세리프 + 오행색 강조)
 *   - overall/category: 점수 54px(카운트업) + 원형 게이지 링 + 헤드라인 32px/900 + 본문
 *                       점수 ≥ 90 → 컨페티 파티클 버스트 + 글로우 펄스 + 하이라이트 뱃지
 *   - caution/color: 헤드라인 + 본문 (color는 색 스와치)
 *   - summary: SummaryCard에서 처리
 * 텍스트 stagger 등장(헤드라인 먼저, body 늦게). 이모지 없음 (G2).
 */
import { useEffect, useRef, useState } from 'react'
import type { StoryCard as StoryCardType } from '@sajuguri/api-client'
import { ohaeng } from '@sajuguri/design'
import { categoryColor, countUpValue, extractColorSwatches, hexToRgba } from '@/lib/fortune/story'
import MascotTinted from '@/components/ui/MascotTinted'

const SCORE_COLOR = '#FF8A2E'  // design.md §2.4

/** 일진 천간 → 오행색 (intro 강조). 천간 한글 첫 글자 매핑. */
const STEM_OHAENG: Record<string, keyof typeof ohaeng> = {
  갑: '목', 을: '목',
  병: '화', 정: '화',
  무: '토', 기: '토',
  경: '금', 신: '금',
  임: '수', 계: '수',
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 0 → target 카운트업. 1씩 오르면 번잡해 보여 step(기본 5) 단위로 양자화한다.
 * 마지막 프레임은 정확한 target으로 스냅. reduced-motion 시 즉시 최종값.
 */
function useCountUp(target: number | undefined, durationMs = 700, step = 5): number {
  const [value, setValue] = useState(target ?? 0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === undefined) return
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    let start: number | null = null
    const tick = (ts: number) => {
      if (start === null) start = ts
      const progress = (ts - start) / durationMs
      if (progress >= 1) {
        setValue(target)
        return
      }
      const eased = countUpValue(target, progress)
      setValue(Math.min(target, Math.round(eased / step) * step))
      rafRef.current = requestAnimationFrame(tick)
    }
    setValue(0)
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, durationMs, step])

  return value
}

// ── 원형 게이지 링 ──────────────────────────────────────────────────
const GAUGE_R = 56       // 반지름 (px) — 숫자 64px 둘레를 감쌈 (임팩트 강화)
const GAUGE_STROKE = 7   // 선 두께
const GAUGE_SIZE = (GAUGE_R + GAUGE_STROKE) * 2
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_R

interface ScoreGaugeProps {
  score: number        // 0..100
  displayValue: number // 카운트업 중인 표시값
  color: string        // 오행색 또는 SCORE_COLOR
  isHigh: boolean      // 90+ 글로우 펄스
}

function ScoreGauge({ score, displayValue, color, isHigh }: ScoreGaugeProps) {
  const cx = GAUGE_SIZE / 2
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{
        width: GAUGE_SIZE,
        height: GAUGE_SIZE,
        // 90+ 글로우 — 링·숫자 주변 발광
        filter: isHigh ? `drop-shadow(0 0 18px ${color}) drop-shadow(0 0 8px ${color})` : undefined,
        animation: isHigh ? 'score-pulse 2s ease-in-out infinite' : undefined,
      }}
    >
      {/* SVG 게이지 링 */}
      <svg
        width={GAUGE_SIZE}
        height={GAUGE_SIZE}
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden
      >
        {/* 트랙 */}
        <circle
          cx={cx}
          cy={cx}
          r={GAUGE_R}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={GAUGE_STROKE}
        />
        {/* 채움 — 카운트업과 함께 */}
        <circle
          cx={cx}
          cy={cx}
          r={GAUGE_R}
          fill="none"
          stroke={color}
          strokeWidth={GAUGE_STROKE}
          strokeLinecap="round"
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          strokeDashoffset={GAUGE_CIRCUMFERENCE * (1 - displayValue / 100)}
          style={{ transition: 'stroke-dashoffset 80ms linear' }}
        />
      </svg>
      {/* 점수 숫자 — useCountUp 그대로, 90+ 더 크게 */}
      <span
        className="relative font-black leading-none tabular-nums"
        style={{
          color: SCORE_COLOR,
          fontSize: isHigh ? '72px' : '64px',
        }}
      >
        {displayValue}
      </span>
    </div>
  )
}

// ── 컨페티 파티클 (외부 라이브러리 없음) ───────────────────────────
// CSS 키프레임: FortuneStoryPage <style> 블록에 confetti 키프레임이 주입된다.
// 여기서는 DOM 기반 파티클을 rAF 루프 없이 CSS animation으로 구현.

const CONFETTI_COLORS = [
  '#FFD900', '#FF8A2E', '#FF6B00',
  '#00A86B', '#0090A8', '#D9A400',
  '#FFFFFF', '#FFB200', '#00C2B8',
]

function useConfetti(trigger: boolean): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!trigger || firedRef.current) return
    if (prefersReducedMotion()) return
    firedRef.current = true

    const container = containerRef.current
    if (!container) return

    // 풍성하게: 80개, 더 길게(2.5s)
    const COUNT = 80
    const fragments: HTMLSpanElement[] = []

    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('span')
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      const size = 5 + Math.random() * 10       // 5–15px
      const angle = Math.random() * 360         // 발사 각도
      const dist = 80 + Math.random() * 200     // 비행 거리 (더 넓게)
      const dur = 900 + Math.random() * 1000    // 지속 시간 ms (더 길게)
      const delay = Math.random() * 300         // 딜레이 ms

      const rad = (angle * Math.PI) / 180
      const tx = Math.cos(rad) * dist
      const ty = Math.sin(rad) * dist - 120     // 위로 치우침

      el.style.cssText = `
        position:absolute;
        left:50%;top:50%;
        width:${size}px;height:${size * (Math.random() > 0.5 ? 1 : 2.5)}px;
        background:${color};
        border-radius:${Math.random() > 0.4 ? '50%' : '2px'};
        transform-origin:center;
        animation:confetti-burst ${dur}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both;
        --tx:${tx}px;--ty:${ty}px;
        pointer-events:none;
        z-index:100;
      `
      container.appendChild(el)
      fragments.push(el)
    }

    const cleanup = setTimeout(() => {
      fragments.forEach((el) => el.remove())
    }, 2500)

    return () => {
      clearTimeout(cleanup)
      fragments.forEach((el) => el.remove())
    }
  }, [trigger])

  return containerRef
}

interface Props {
  card: StoryCardType
  dayGanji: { stem: string; branch: string }
  profileName: string
}

export default function StoryCard({ card, dayGanji, profileName }: Props) {
  const scoreValue = useCountUp(card.score)

  // intro 일진 천간 오행색
  const stemEl = STEM_OHAENG[dayGanji.stem] ?? '토'
  const stemColor = ohaeng[stemEl]
  // category 배경 오행 그라디언트
  const catColor = categoryColor(card.category_key)
  // 점수 링 색: category 카드면 catColor, 아니면 SCORE_COLOR
  const gaugeColor = catColor ?? SCORE_COLOR
  // color 카드 스와치
  const swatches = card.kind === 'color' ? extractColorSwatches(`${card.headline} ${card.body}`) : []

  // 컨페티: overall/category에서 점수 ≥ 90
  const isHighScore = (card.kind === 'overall' || card.kind === 'category') && (card.score ?? 0) >= 90
  const confettiRef = useConfetti(isHighScore)

  // 카드 종류별 강조 오행색 — intro는 stemColor, category는 catColor, 나머지는 null
  const accentColor = card.kind === 'intro'
    ? stemColor
    : (card.kind === 'category' ? catColor : null)

  return (
    <div className="relative flex flex-1 flex-col px-6 py-4 select-none overflow-hidden">
      {/* 은은한 광원 오버레이 — 풀스크린 배경은 FortuneStoryPage에서 담당, 여기서는 보조 */}
      {accentColor && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(70% 50% at 80% 15%, ${hexToRgba(accentColor, 0.25)} 0%, transparent 55%)`,
          }}
        />
      )}

      <div className="relative z-0 flex flex-1 flex-col">
        {/* 질문 라벨 */}
        <p className="mb-3 text-[13px] font-semibold tracking-wide text-white/60 uppercase">
          {card.title}
        </p>

        {/* intro: 마스코트(일간색 틴팅) + 일진 (큰 세리프 + 오행색) */}
        {card.kind === 'intro' && (
          <div className="story-stagger flex flex-1 flex-col items-center justify-center gap-6">
            <MascotTinted stem={dayGanji.stem} width={110} height={110} />
            <div className="text-center">
              <p
                className="text-[68px] font-black leading-none"
                style={{ fontFamily: 'var(--font-serif, serif)', color: stemColor }}
              >
                {dayGanji.stem}{dayGanji.branch}
              </p>
              <p className="mt-2 text-[16px] font-bold text-white/70">{profileName}의 오늘</p>
            </div>
            <div className="w-full rounded-2xl border border-white/20 bg-white/10 px-6 py-5 text-center">
              <p className="text-[22px] font-black text-white leading-snug">{card.headline}</p>
              <p className="mt-3 text-[15px] text-white/75 leading-relaxed">{card.body}</p>
            </div>
          </div>
        )}

        {/* overall / category: 점수 원형 게이지 + 헤드라인 + 본문 + 컨페티 */}
        {(card.kind === 'overall' || card.kind === 'category') && (
          <div className="story-stagger flex flex-1 flex-col justify-center gap-5">
            {card.score !== undefined && (
              <div className="relative w-fit" ref={confettiRef as React.RefObject<HTMLDivElement>}>
                <ScoreGauge
                  score={card.score}
                  displayValue={scoreValue}
                  color={gaugeColor}
                  isHigh={isHighScore}
                />
                {/* 90+ 하이라이트 뱃지 */}
                {isHighScore && (
                  <div
                    className="absolute -top-2 -right-3 rounded-full px-2 py-0.5 text-[11px] font-black tracking-wider"
                    style={{
                      background: '#FFD900',
                      color: '#1A1A1A',
                      boxShadow: '0 2px 8px rgba(255,217,0,0.6)',
                      animation: 'badge-pop 400ms cubic-bezier(0.34,1.56,0.64,1) 800ms both',
                    }}
                  >
                    오늘의 하이라이트
                  </div>
                )}
              </div>
            )}
            {/* 헤드라인 — Wrapped식 한 방 타이포 */}
            <p className="text-[32px] font-black text-white leading-tight">
              {card.headline}
            </p>
            <p className="text-[15px] text-white/80 leading-relaxed">
              {card.body}
            </p>
          </div>
        )}

        {/* caution / color: 헤드라인 + 본문 (color는 색 스와치) */}
        {(card.kind === 'caution' || card.kind === 'color') && (
          <div className="story-stagger flex flex-1 flex-col justify-center gap-6">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-6">
              {/* color 카드: 추천 색 스와치 */}
              {swatches.length > 0 && (
                <div className="mb-5 flex items-center gap-3">
                  {swatches.map((hex) => (
                    <span
                      key={hex}
                      className="h-12 w-12 rounded-full border-2 border-white/60 shadow-[2px_2px_0_rgba(0,0,0,0.2)]"
                      style={{ background: hex }}
                    />
                  ))}
                </div>
              )}
              <p className="text-[26px] font-black text-white leading-snug">
                {card.headline}
              </p>
              <p className="mt-3 text-[15px] text-white/80 leading-relaxed">
                {card.body}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
