'use client'

/**
 * 운세 요약 카드 (kind=summary).
 * design.md §5.6:
 *   - 날짜 + "너의 하루 요약" + 카테고리 가로 점수 바 6개 (저점만 #FF8A2E)
 *   - "오늘의 키워드" 인용 타이포
 *   - [이미지 저장(옐로 필)] [링크 공유(고스트)]
 * 이모지 없음 (G2).
 * B4: 이미지 저장 — Canvas API, document.fonts.ready 대기 후 한글 렌더.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { DailyStoryResponse } from '@sajuguri/api-client'
import { calcScoreBars } from '@/lib/fortune/canvas'

const SCORE_COLOR = '#FF8A2E'   // design.md §2.4 저점
const SCORE_NORMAL = '#FFD900'  // 옐로
const BAR_LOW_THRESHOLD = 60

const CATEGORY_LABELS: Record<string, string> = {
  exam:   '학업',
  money:  '금전',
  love:   '연애',
  career: '직업',
  health: '건강',
  social: '사교',
}

interface Props {
  story: DailyStoryResponse
  onClose: () => void
}

export default function SummaryCard({ story, onClose }: Props) {
  const t = useTranslations('fortune.summary')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  // 마운트 시 점수 바 0 → 점수 차오름 (DOM 전용, 캔버스는 정적 최종값 사용).
  // reduced-motion 시 즉시 채움.
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setRevealed(true)
      return
    }
    const id = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const orderedKeys = Object.keys(CATEGORY_LABELS).filter((k) => k in story.scores)
  const summaryCard = story.cards.find((c) => c.kind === 'summary')

  /** 요약 카드 캔버스 렌더 → 이미지 다운로드 */
  async function handleSaveImage() {
    setSaving(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1920
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 한글 폰트 준비 대기
      await document.fonts.ready

      // 배경 그라디언트
      const grad = ctx.createLinearGradient(0, 0, 0, 1920)
      grad.addColorStop(0, '#00857D')
      grad.addColorStop(1, '#04332F')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 1080, 1920)

      const PAD = 80
      ctx.textBaseline = 'top'

      // 날짜
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '400 36px "Pretendard", "Noto Sans KR", sans-serif'
      ctx.fillText(story.date, PAD, PAD + 10)

      // 제목 "너의 하루 요약"
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '900 64px "Pretendard", "Noto Sans KR", sans-serif'
      ctx.fillText(t('headerTitle'), PAD, PAD + 80)

      // 키워드 인용 타이포
      if (story.keyword) {
        ctx.fillStyle = '#FFD900'
        ctx.font = '900 52px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.fillText(`"${story.keyword}"`, PAD, PAD + 180)
      }

      // 점수 바 6개
      const bars = calcScoreBars(story.scores, 700)
      const BAR_H = 36
      for (const bar of bars) {
        const isLow = bar.score < BAR_LOW_THRESHOLD

        // 라벨
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.font = '600 34px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.fillText(bar.label, bar.labelX, bar.y + 2)

        // 바 배경
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.beginPath()
        ctx.roundRect(bar.barX, bar.y, bar.barMaxWidth, BAR_H, 8)
        ctx.fill()

        // 바 채움
        const fillW = Math.round((bar.score / 100) * bar.barMaxWidth)
        ctx.fillStyle = isLow ? SCORE_COLOR : SCORE_NORMAL
        ctx.beginPath()
        ctx.roundRect(bar.barX, bar.y, fillW, BAR_H, 8)
        ctx.fill()

        // 점수 숫자
        ctx.fillStyle = isLow ? SCORE_COLOR : '#FFFFFF'
        ctx.font = '700 32px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(String(bar.score), bar.valueX, bar.y + 2)
        ctx.textAlign = 'left'
      }

      // 워터마크
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '500 30px "Pretendard", "Noto Sans KR", sans-serif'
      ctx.fillText('사주구리 sajuguri', PAD, 1920 - PAD - 40)

      // 다운로드
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sajuguri-fortune-${story.date}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 'image/png')
    } finally {
      setSaving(false)
    }
  }

  /** 링크 공유 — record_id 있으면 /fortune?record={id}, 없으면 클립보드 복사 */
  async function handleShareLink() {
    setSharing(true)
    try {
      const url = story.record_id
        ? `${window.location.origin}/fortune?record=${story.record_id}`
        : window.location.href
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드 불가 — silent fail
    } finally {
      setSharing(false)
    }
  }

  // 탭 전파를 막지 않는다 — 다른 카드처럼 좌측 1/3 탭=뒤로가 동작.
  // 스크롤·버튼만 개별적으로 전파 차단(아래 CTA).
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2 select-none">
      {/* 헤더 */}
      <div className="mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot.svg" alt="" width={52} height={52} className="mb-3" />
        <p className="text-[12px] font-semibold uppercase tracking-widest text-white/50">
          {story.date}
        </p>
        <h2 className="mt-1 text-[22px] font-black text-white leading-tight">
          {t('headerTitle')}
        </h2>
      </div>

      {/* 점수 바 6개 — 마운트 시 0→점수 차오름 (stagger 100ms). 캔버스는 정적 최종값. */}
      <div className="mb-6 flex flex-col gap-2">
        {orderedKeys.map((key, i) => {
          const score = story.scores[key] ?? 0
          const isLow = score < BAR_LOW_THRESHOLD
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-10 shrink-0 text-[11px] font-bold text-white/70">
                {CATEGORY_LABELS[key]}
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded-full border border-white/20 bg-white/15">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: revealed ? `${score}%` : '0%',
                    background: isLow ? SCORE_COLOR : SCORE_NORMAL,
                    transition: 'width 700ms cubic-bezier(0.22,1,0.36,1)',
                    transitionDelay: `${i * 100}ms`,
                  }}
                />
                {/* 상단 하이라이트 — 입체감 */}
                <div className="pointer-events-none absolute inset-0 h-1/2 rounded-full bg-white/20" />
              </div>
              <span
                className="w-10 shrink-0 text-right text-[17px] font-black"
                style={{ color: isLow ? SCORE_COLOR : 'rgba(255,255,255,0.85)' }}
              >
                {score}
              </span>
            </div>
          )
        })}
      </div>

      {/* 오늘의 키워드 — 바 다음에 살짝 늦게 떠오름 */}
      {story.keyword && (
        <div
          className="mb-5 rounded-2xl border border-white/20 bg-white/10 px-5 py-4"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 600ms ease-out, transform 600ms cubic-bezier(0.22,1,0.36,1)',
            transitionDelay: `${orderedKeys.length * 100 + 120}ms`,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50 mb-1">
            {t('keyword')}
          </p>
          <p className="text-[26px] font-black text-yellow leading-none">
            {story.keyword}
          </p>
        </div>
      )}

      {/* 요약 카드 본문 */}
      {summaryCard && (
        <div className="mb-5">
          <p className="text-[20px] font-extrabold text-white leading-snug">
            {summaryCard.headline}
          </p>
          <p className="mt-2 text-[14px] text-white/75 leading-relaxed">
            {summaryCard.body}
          </p>
        </div>
      )}

      {/* CTA 버튼 */}
      <div className="mt-auto flex gap-3 pt-2">
        {/* 이미지 저장 (옐로 필) */}
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-yellow py-3 text-[14px] font-extrabold text-ink shadow-[4px_4px_0_#1A1A1A] disabled:opacity-50"
          onClick={(e) => { e.stopPropagation(); handleSaveImage() }}
          disabled={saving}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {saving ? '저장 중...' : t('saveImage')}
        </button>

        {/* 링크 공유 (고스트) */}
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-white/50 py-3 text-[14px] font-extrabold text-white disabled:opacity-50"
          onClick={(e) => { e.stopPropagation(); handleShareLink() }}
          disabled={sharing}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
          {copied ? '복사됨' : t('shareLink')}
        </button>
      </div>

      {/* 숨겨진 캔버스 (이미지 생성용) */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
