'use client'

/**
 * 스토리 단일 카드 렌더 — Spotify Wrapped 룩. kind별 레이아웃 분기.
 *   - intro: 마스코트(MascotTinted 일간색) + 일진 초대형 타이포
 *   - overall: 점수 초대형(카운트업) + 헤드라인 + 본문
 *               점수 ≥ 90 → 컨페티 버스트 + 글로우 펄스 + 하이라이트 뱃지
 *               점수 ≤ 35 → 절제된 주의 분위기 — 주의 뱃지, 컨페티 없음
 *   - category: "오늘의 TOP" 랭킹 번호(01·02…) + 점수 + 헤드라인 + 본문
 *   - caution/color: 헤드라인 + 본문 (color는 색 스와치)
 *   - summary: SummaryCard에서 처리
 * 색은 전부 palette(상위에서 주입)로 결정 — 비비드 배경에 맞춘 고대비 잉크.
 * 텍스트 stagger 등장. 이모지 없음 (G2). 데이터 값 불변.
 */
import { useEffect, useRef, useState } from 'react'
import type { StoryCard as StoryCardType } from '@sajuguri/api-client'
import { countUpValue, extractColorSwatches, hexToRgba, type CardPalette } from '@/lib/fortune/story'
import MascotTinted from '@/components/ui/MascotTinted'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 0 → target 카운트업. 1씩 오르면 번잡해 보여 step(기본 5) 단위로 양자화한다.
 * 마지막 프레임은 정확한 target으로 스냅. reduced-motion 시 즉시 최종값.
 */
function useCountUp(target: number | undefined, durationMs = 800, step = 5): number {
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

// ── 컨페티 파티클 (외부 라이브러리 없음) ───────────────────────────
// CSS 키프레임은 FortuneStoryPage <style> 블록에 주입된다.

const CONFETTI_COLORS = [
  '#FFD900', '#FF2D78', '#00C2B8',
  '#7B3FE4', '#C6F432', '#FF6B00',
  '#FFFFFF', '#3DA5FF', '#FF5A4D',
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

    const COUNT = 80
    const fragments: HTMLSpanElement[] = []

    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('span')
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      const size = 5 + Math.random() * 10
      const angle = Math.random() * 360
      const dist = 80 + Math.random() * 200
      const dur = 900 + Math.random() * 1000
      const delay = Math.random() * 300

      const rad = (angle * Math.PI) / 180
      const tx = Math.cos(rad) * dist
      const ty = Math.sin(rad) * dist - 120

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
  palette: CardPalette
  /** category 카드의 "오늘의 TOP" 랭킹 (1부터). 그 외 null. */
  rank: number | null
}

export default function StoryCard({ card, dayGanji, profileName, palette, rank }: Props) {
  const scoreValue = useCountUp(card.score)

  // color 카드 스와치
  const swatches = card.kind === 'color' ? extractColorSwatches(`${card.headline} ${card.body}`) : []

  // 컨페티: overall/category에서 점수 ≥ 90
  const isHighScore = (card.kind === 'overall' || card.kind === 'category') && (card.score ?? 0) >= 90
  // 주의: overall/category에서 점수 ≤ 35
  const isLowScore = (card.kind === 'overall' || card.kind === 'category') && (card.score ?? 100) <= 35
  const confettiRef = useConfetti(isHighScore)

  const { ink, inkSoft, accent } = palette

  return (
    <div className="relative flex flex-1 flex-col px-6 py-4 select-none overflow-hidden">
      <div className="relative z-0 flex flex-1 flex-col">
        {/* 질문 라벨 */}
        <p
          className="mb-3 text-[13px] font-extrabold tracking-[0.18em] uppercase"
          style={{ color: inkSoft }}
        >
          {card.title}
        </p>

        {/* intro: 마스코트(일간색 틴팅) + 일진 초대형 타이포 */}
        {card.kind === 'intro' && (
          <div className="story-stagger flex flex-1 flex-col items-center justify-center gap-6">
            <div className="story-pop">
              <MascotTinted stem={dayGanji.stem} width={120} height={120} />
            </div>
            <div className="text-center">
              <p
                className="font-black leading-[0.9]"
                style={{ fontSize: 'clamp(72px, 22vw, 104px)', color: ink, letterSpacing: '-0.02em' }}
              >
                {dayGanji.stem}{dayGanji.branch}
              </p>
              <p className="mt-3 text-[17px] font-extrabold" style={{ color: inkSoft }}>
                {profileName}{profileName ? '의 ' : ''}오늘
              </p>
            </div>
            <div className="w-full text-center">
              <p
                className="font-black leading-[1.08]"
                style={{ fontSize: 'clamp(26px, 7.5vw, 34px)', color: ink, wordBreak: 'keep-all', overflowWrap: 'break-word' }}
              >
                {card.headline}
              </p>
              <p className="mt-4 text-[17px] leading-relaxed" style={{ color: inkSoft, wordBreak: 'keep-all' }}>
                {card.body}
              </p>
            </div>
          </div>
        )}

        {/* overall: 점수 초대형 카운트업 + 헤드라인 + 본문 + 컨페티 */}
        {card.kind === 'overall' && (
          <div className="story-stagger flex flex-1 flex-col justify-center gap-5">
            {card.score !== undefined && (
              <div className="relative w-fit" ref={confettiRef as React.RefObject<HTMLDivElement>}>
                <div className="flex items-end gap-2">
                  <span
                    className="font-black leading-[0.82] tabular-nums"
                    style={{
                      color: ink,
                      fontSize: isHighScore ? 'clamp(120px, 38vw, 168px)' : 'clamp(108px, 34vw, 150px)',
                      animation: isHighScore ? 'score-pulse 2s ease-in-out infinite' : undefined,
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {scoreValue}
                  </span>
                  <span className="mb-4 text-[24px] font-black" style={{ color: inkSoft }}>/100</span>
                </div>
                {isHighScore && (
                  <div
                    className="absolute -top-1 right-0 translate-x-1/3 rounded-full px-2.5 py-1 text-[12px] font-black tracking-wider"
                    style={{
                      background: accent,
                      color: palette.inkLight ? '#15233A' : '#FFFFFF',
                      boxShadow: `0 3px 10px ${hexToRgba(accent, 0.55)}`,
                      animation: 'badge-pop 400ms cubic-bezier(0.34,1.56,0.64,1) 850ms both',
                    }}
                  >
                    오늘의 하이라이트
                  </div>
                )}
                {isLowScore && (
                  <div
                    className="absolute -top-1 right-0 translate-x-1/3 rounded-full px-2.5 py-1 text-[12px] font-black tracking-wider"
                    style={{
                      background: hexToRgba(ink, 0.9),
                      color: palette.inkLight ? '#15233A' : '#FFFFFF',
                      animation: 'badge-pop 400ms cubic-bezier(0.34,1.56,0.64,1) 900ms both',
                    }}
                  >
                    주의
                  </div>
                )}
              </div>
            )}
            {isLowScore && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(60% 45% at 30% 35%, ${hexToRgba(ink, 0.1)} 0%, transparent 70%)`,
                  animation: 'caution-pulse 3s ease-in-out infinite',
                }}
              />
            )}
            <p
              className="font-black leading-[1.04]"
              style={{ fontSize: 'clamp(30px, 8.5vw, 44px)', color: ink, wordBreak: 'keep-all', overflowWrap: 'break-word', letterSpacing: '-0.01em' }}
            >
              {card.headline}
            </p>
            <p className="text-[18px] leading-relaxed" style={{ color: inkSoft, wordBreak: 'keep-all' }}>
              {card.body}
            </p>
          </div>
        )}

        {/* category: "오늘의 TOP" 랭킹 번호 + 점수 + 헤드라인 + 본문 */}
        {card.kind === 'category' && (
          <div className="story-stagger flex flex-1 flex-col justify-center gap-4">
            {/* 초대형 랭킹 번호 */}
            {rank !== null && (
              <div className="flex items-end gap-4" ref={confettiRef as React.RefObject<HTMLDivElement>}>
                <span
                  className="font-black leading-[0.78] tabular-nums"
                  style={{ fontSize: 'clamp(96px, 30vw, 140px)', color: accent, letterSpacing: '-0.05em' }}
                >
                  {String(rank).padStart(2, '0')}
                </span>
                {card.score !== undefined && (
                  <div className="mb-3 flex flex-col">
                    <span className="text-[12px] font-extrabold tracking-[0.18em] uppercase" style={{ color: inkSoft }}>
                      SCORE
                    </span>
                    <span
                      className="font-black leading-none tabular-nums"
                      style={{ fontSize: '52px', color: ink }}
                    >
                      {scoreValue}
                    </span>
                  </div>
                )}
                {isHighScore && (
                  <span
                    className="mb-5 rounded-full px-2.5 py-1 text-[11px] font-black tracking-wider"
                    style={{
                      background: accent,
                      color: palette.inkLight ? '#15233A' : '#FFFFFF',
                      animation: 'badge-pop 400ms cubic-bezier(0.34,1.56,0.64,1) 850ms both',
                    }}
                  >
                    오늘의 하이라이트
                  </span>
                )}
                {isLowScore && (
                  <span
                    className="mb-5 rounded-full px-2.5 py-1 text-[11px] font-black tracking-wider"
                    style={{ background: hexToRgba(ink, 0.9), color: palette.inkLight ? '#15233A' : '#FFFFFF' }}
                  >
                    주의
                  </span>
                )}
              </div>
            )}
            <p
              className="font-black leading-[1.04]"
              style={{ fontSize: 'clamp(28px, 7.5vw, 40px)', color: ink, wordBreak: 'keep-all', overflowWrap: 'break-word', letterSpacing: '-0.01em' }}
            >
              {card.headline}
            </p>
            <p className="text-[18px] leading-relaxed" style={{ color: inkSoft, wordBreak: 'keep-all' }}>
              {card.body}
            </p>
          </div>
        )}

        {/* caution / color: 헤드라인 + 본문 (color는 색 스와치) */}
        {(card.kind === 'caution' || card.kind === 'color') && (
          <div className="story-stagger flex flex-1 flex-col justify-center gap-6">
            {/* color 카드: 추천 색 스와치 */}
            {swatches.length > 0 && (
              <div className="flex items-center gap-3">
                {swatches.map((hex) => (
                  <span
                    key={hex}
                    className="h-16 w-16 rounded-full border-4"
                    style={{ background: hex, borderColor: hexToRgba(ink, 0.85) }}
                  />
                ))}
              </div>
            )}
            <p
              className="font-black leading-[1.04]"
              style={{ fontSize: 'clamp(28px, 8vw, 40px)', color: ink, wordBreak: 'keep-all', overflowWrap: 'break-word', letterSpacing: '-0.01em' }}
            >
              {card.headline}
            </p>
            <p className="text-[18px] leading-relaxed" style={{ color: inkSoft, wordBreak: 'keep-all' }}>
              {card.body}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
