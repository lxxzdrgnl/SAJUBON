'use client'

/**
 * 스토리 단일 카드 렌더 — kind별 레이아웃 분기.
 * design.md §5.6:
 *   - intro: 마스코트 + 일진 (큰 세리프 + 오행색 강조)
 *   - overall/category: 점수 54px 오렌지(카운트업) + 헤드라인 26px/900 + 본문
 *   - caution/color: 헤드라인 + 본문 (color는 색 스와치)
 *   - summary: SummaryCard에서 처리
 * 텍스트 stagger 등장(헤드라인 먼저, body 늦게). 이모지 없음 (G2).
 */
import { useEffect, useRef, useState } from 'react'
import type { StoryCard as StoryCardType } from '@sajuguri/api-client'
import { ohaeng } from '@sajuguri/design'
import { categoryColor, countUpValue, extractColorSwatches, hexToRgba } from '@/lib/fortune/story'

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

interface Props {
  card: StoryCardType
  dayGanji: { stem: string; branch: string }
  profileName: string
}

export default function StoryCard({ card, dayGanji, profileName }: Props) {
  const scoreValue = useCountUp(card.score)

  // intro 일진 천간 오행색
  const stemColor = ohaeng[STEM_OHAENG[dayGanji.stem] ?? '토']
  // category 배경 오행 그라디언트
  const catColor = categoryColor(card.category_key)
  // color 카드 스와치
  const swatches = card.kind === 'color' ? extractColorSwatches(`${card.headline} ${card.body}`) : []

  return (
    <div className="relative flex flex-1 flex-col px-6 py-4 select-none overflow-hidden">
      {/* category: 은은한 오행 그라디언트 오버레이 (딥틸 위에 살짝) */}
      {catColor && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0"
          style={{
            background: `radial-gradient(120% 80% at 80% 0%, ${hexToRgba(catColor, 0.28)} 0%, rgba(0,0,0,0) 60%)`,
          }}
        />
      )}

      <div className="relative z-0 flex flex-1 flex-col">
        {/* 질문 라벨 (14px) */}
        <p className="mb-3 text-[13px] font-semibold tracking-wide text-white/60 uppercase">
          {card.title}
        </p>

        {/* intro: 마스코트 + 일진 (큰 세리프 + 오행색) */}
        {card.kind === 'intro' && (
          <div className="story-stagger flex flex-1 flex-col items-center justify-center gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot.svg" alt="" width={100} height={100} />
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

        {/* overall / category: 점수 카운트업 + 헤드라인 + 본문 */}
        {(card.kind === 'overall' || card.kind === 'category') && (
          <div className="story-stagger flex flex-1 flex-col justify-center gap-4">
            {card.score !== undefined && (
              <p
                className="text-[54px] font-black leading-none tabular-nums"
                style={{ color: SCORE_COLOR }}
              >
                {scoreValue}
              </p>
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
              {/* color 카드: 추천 색 스와치 */}
              {swatches.length > 0 && (
                <div className="mb-4 flex items-center gap-2">
                  {/* 흰 보더는 §4.1 잉크 보더 규칙의 의도된 예외 — 딥틸 스토리 배경 위 색 스와치라 흰 칩으로 분리 */}
                  {swatches.map((hex) => (
                    <span
                      key={hex}
                      className="h-7 w-7 rounded-full border-2 border-white/60 shadow-[2px_2px_0_rgba(0,0,0,0.2)]"
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
