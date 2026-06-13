'use client'

/**
 * 스토리 단일 카드 렌더 — kind별 레이아웃 분기.
 * design.md §5.6:
 *   - intro: 마스코트(MascotTinted 일간색) + 일진 (큰 세리프 + 오행색 강조)
 *   - overall/category: 점수 54px(카운트업) + 원형 게이지 링 + 헤드라인 26px/900 + 본문
 *                       점수 ≥ 90 → 컨페티 파티클 버스트 1회
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
const GAUGE_R = 46       // 반지름 (px) — 숫자 54px 둘레를 감쌈
const GAUGE_STROKE = 5   // 선 두께
const GAUGE_SIZE = (GAUGE_R + GAUGE_STROKE) * 2
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_R

interface ScoreGaugeProps {
  score: number        // 0..100
  displayValue: number // 카운트업 중인 표시값
  color: string        // 오행색 또는 SCORE_COLOR
}

function ScoreGauge({ score, displayValue, color }: ScoreGaugeProps) {
  // 링은 실제 최종 점수 기준으로 채움 (카운트업 완료 전에도 목표 보여줌)
  const dashOffset = GAUGE_CIRCUMFERENCE * (1 - score / 100)
  const cx = GAUGE_SIZE / 2
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
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
      {/* 점수 숫자 — useCountUp 그대로 */}
      <span
        className="relative text-[54px] font-black leading-none tabular-nums"
        style={{ color: SCORE_COLOR }}
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
  '#FFFFFF',
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

    const COUNT = 42
    const fragments: HTMLSpanElement[] = []

    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('span')
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      const size = 6 + Math.random() * 7        // 6–13px
      const angle = Math.random() * 360          // 발사 각도
      const dist = 60 + Math.random() * 130      // 비행 거리
      const dur = 600 + Math.random() * 500      // 지속 시간 ms
      const delay = Math.random() * 160          // 딜레이 ms

      const rad = (angle * Math.PI) / 180
      const tx = Math.cos(rad) * dist
      const ty = Math.sin(rad) * dist - 80       // 위로 약간 치우침

      el.style.cssText = `
        position:absolute;
        left:50%;top:50%;
        width:${size}px;height:${size * (Math.random() > 0.5 ? 1 : 2.2)}px;
        background:${color};
        border-radius:${Math.random() > 0.4 ? '50%' : '2px'};
        transform-origin:center;
        animation:confetti-burst ${dur}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both;
        --tx:${tx}px;--ty:${ty}px;
        pointer-events:none;
      `
      container.appendChild(el)
      fragments.push(el)
    }

    const cleanup = setTimeout(() => {
      fragments.forEach((el) => el.remove())
    }, 1500)

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
      {/* 각 카드마다 뚜렷한 오행색 그라디언트 오버레이 */}
      {accentColor && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(110% 70% at 85% 10%, ${hexToRgba(accentColor, 0.45)} 0%, transparent 55%),
              radial-gradient(80% 60% at 15% 85%, ${hexToRgba(accentColor, 0.25)} 0%, transparent 50%)
            `,
          }}
        />
      )}
      {/* overall: 오렌지 글로 */}
      {card.kind === 'overall' && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(110% 70% at 85% 10%, ${hexToRgba(SCORE_COLOR, 0.38)} 0%, transparent 55%)`,
          }}
        />
      )}
      {/* caution: 붉은 경고 글로 */}
      {card.kind === 'caution' && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(100% 65% at 80% 5%, ${hexToRgba('#FF6B00', 0.35)} 0%, transparent 55%)`,
          }}
        />
      )}
      {/* color: 추천 색 스와치 첫번째 색 글로 */}
      {card.kind === 'color' && swatches[0] && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(100% 65% at 80% 5%, ${hexToRgba(swatches[0], 0.32)} 0%, transparent 55%)`,
          }}
        />
      )}

      <div className="relative z-0 flex flex-1 flex-col">
        {/* 질문 라벨 (14px) */}
        <p className="mb-3 text-[13px] font-semibold tracking-wide text-white/60 uppercase">
          {card.title}
        </p>

        {/* intro: 마스코트(일간색 틴팅) + 일진 (큰 세리프 + 오행색) */}
        {card.kind === 'intro' && (
          <div className="story-stagger flex flex-1 flex-col items-center justify-center gap-6">
            <MascotTinted stem={dayGanji.stem} width={100} height={100} />
            <div className="text-center">
              <p
                className="text-[56px] font-black leading-none"
                style={{ fontFamily: 'var(--font-serif, serif)', color: stemColor }}
              >
                {dayGanji.stem}{dayGanji.branch}
              </p>
              <p className="mt-2 text-[15px] font-semibold text-white/70">{profileName}의 오늘</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-center">
              <p className="text-[20px] font-extrabold text-white leading-snug">{card.headline}</p>
              <p className="mt-2 text-[14px] text-white/75 leading-relaxed">{card.body}</p>
            </div>
          </div>
        )}

        {/* overall / category: 점수 원형 게이지 + 헤드라인 + 본문 + 컨페티 */}
        {(card.kind === 'overall' || card.kind === 'category') && (
          <div className="story-stagger flex flex-1 flex-col justify-center gap-4">
            {card.score !== undefined && (
              <div className="relative w-fit" ref={confettiRef as React.RefObject<HTMLDivElement>}>
                <ScoreGauge
                  score={card.score}
                  displayValue={scoreValue}
                  color={gaugeColor}
                />
              </div>
            )}
            <p className="text-[26px] font-black text-white leading-tight">
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
              {/* color 카드: 추천 색 스와치 — 크기 키워 강조 */}
              {swatches.length > 0 && (
                <div className="mb-5 flex items-center gap-3">
                  {/* 흰 보더는 §4.1 잉크 보더 규칙의 의도된 예외 — 딥틸 스토리 배경 위 색 스와치라 흰 칩으로 분리 */}
                  {swatches.map((hex) => (
                    <span
                      key={hex}
                      className="h-10 w-10 rounded-full border-2 border-white/60 shadow-[2px_2px_0_rgba(0,0,0,0.2)]"
                      style={{ background: hex }}
                    />
                  ))}
                </div>
              )}
              <p className="text-[22px] font-extrabold text-white leading-snug">
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
