'use client'

/**
 * 운세 요약 카드 (kind=summary) — Spotify Wrapped / Apple Music Recap 급 에디토리얼 포스터.
 * design.md §5.6:
 *   - 브랜드 헤더 (사주구리 + 날짜)
 *   - 총점 히어로 — 96px+ 디스플레이 숫자
 *   - 키워드 — 굵은 선언 한 줄 (큰 타이포, 박스 없음)
 *   - 카테고리 점수 — 에디토리얼 랭킹 (큰 숫자 + 카테고리명, 바 없음)
 *   - 총운 한 줄 (summaryCard.headline)
 *   - [이미지 저장] [링크 공유] CTA
 * 이모지 없음 (G2). frosted 흰 막 없음. 다크 톤 유지.
 * B4: 이미지 저장 — Canvas API, document.fonts.ready 대기 후 한글 렌더.
 */
import { useEffect, useState } from 'react'
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
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  // 마운트 후 리빌 — reduced-motion 시 즉시.
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

  // 총점 — overall 카드 점수 또는 카테고리 평균
  const overallScore = story.cards.find((c) => c.kind === 'overall')?.score
  const avgScore = overallScore ?? (
    orderedKeys.length > 0
      ? Math.round(orderedKeys.reduce((s, k) => s + (story.scores[k] ?? 0), 0) / orderedKeys.length)
      : undefined
  )

  // 점수 높은 순 정렬 — 랭킹 표시용
  const rankedKeys = [...orderedKeys].sort((a, b) => (story.scores[b] ?? 0) - (story.scores[a] ?? 0))

  /** 요약 카드 캔버스 렌더 → 이미지 다운로드 — Recap 포스터 스타일 */
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

      // 배경 그라디언트 — 다크 에디토리얼
      const grad = ctx.createLinearGradient(0, 0, 0, 1920)
      grad.addColorStop(0, '#1E0F00')
      grad.addColorStop(0.45, '#04332F')
      grad.addColorStop(1, '#020D0C')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 1080, 1920)

      // 미세 노이즈 대신 세련된 수평 분리선 1개
      ctx.strokeStyle = 'rgba(255,217,0,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(80, 160)
      ctx.lineTo(1000, 160)
      ctx.stroke()

      const PAD = 80
      ctx.textBaseline = 'top'

      // 브랜드 헤더
      ctx.fillStyle = '#FFD900'
      ctx.font = '900 32px "Pretendard", "Noto Sans KR", sans-serif'
      ctx.fillText('사주구리', PAD, PAD)

      // 날짜 — 우측 정렬
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '500 28px "Pretendard", "Noto Sans KR", sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(story.date, 1080 - PAD, PAD + 4)
      ctx.textAlign = 'left'

      // 이름 (있을 때)
      if (story.profile_name) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.font = '600 34px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.fillText(story.profile_name, PAD, PAD + 200)
      }

      // 총점 히어로 — 초대형
      if (avgScore !== undefined) {
        ctx.fillStyle = SCORE_COLOR
        ctx.font = `900 ${avgScore >= 90 ? 220 : 200}px "Pretendard", "Noto Sans KR", sans-serif`
        ctx.fillText(String(avgScore), PAD - 8, PAD + 240)
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.font = '500 40px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.fillText('/ 100', PAD + 8, PAD + 460)
      }

      // 키워드 — 굵고 큰 선언
      if (story.keyword) {
        ctx.fillStyle = '#FFD900'
        ctx.font = '900 72px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.fillText(story.keyword, PAD, PAD + 540)
      }

      // 구분선
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(PAD, PAD + 650)
      ctx.lineTo(1080 - PAD, PAD + 650)
      ctx.stroke()

      // 카테고리 랭킹 — 점수 높은 순, 에디토리얼 숫자
      const bars = calcScoreBars(story.scores, 700)
      const sorted = [...bars].sort((a, b) => b.score - a.score)
      const ROW_H = 130
      for (let i = 0; i < sorted.length; i++) {
        const bar = sorted[i]
        const y = PAD + 670 + i * ROW_H
        const isLow = bar.score < BAR_LOW_THRESHOLD

        // 순위 번호
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.font = '700 28px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.fillText(String(i + 1).padStart(2, '0'), PAD, y)

        // 카테고리명
        ctx.fillStyle = isLow ? 'rgba(255,138,46,0.85)' : 'rgba(255,255,255,0.65)'
        ctx.font = '700 42px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.fillText(bar.label, PAD + 90, y - 8)

        // 점수 숫자 — 우측
        ctx.fillStyle = isLow ? SCORE_COLOR : SCORE_NORMAL
        ctx.font = '900 72px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(String(bar.score), 1080 - PAD, y - 18)
        ctx.textAlign = 'left'
      }

      // 총운 한 줄
      if (summaryCard?.headline) {
        const summaryY = PAD + 670 + sorted.length * ROW_H + 40
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.font = '700 44px "Pretendard", "Noto Sans KR", sans-serif'
        // 긴 텍스트 줄바꿈 (최대 800px)
        const words = summaryCard.headline
        const maxW = 1080 - PAD * 2
        let line = ''
        let lineY = summaryY
        for (const char of words) {
          const test = line + char
          if (ctx.measureText(test).width > maxW) {
            ctx.fillText(line, PAD, lineY)
            line = char
            lineY += 56
          } else {
            line = test
          }
        }
        if (line) ctx.fillText(line, PAD, lineY)
      }

      // 하단 브랜드 워터마크
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '500 28px "Pretendard", "Noto Sans KR", sans-serif'
      ctx.fillText('sajuguri.app', PAD, 1920 - PAD - 30)

      // 다운로드
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sajuguri-${story.date}.png`
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

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-6 pt-4 select-none">

      {/* ── 브랜드 헤더 ── */}
      <div
        className="mb-6 flex items-center justify-between"
        style={{
          opacity: revealed ? 1 : 0,
          transition: 'opacity 350ms ease-out',
        }}
      >
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.svg" alt="" width={26} height={26} />
          <span
            className="text-[12px] font-black tracking-widest uppercase"
            style={{ color: '#FFD900' }}
          >
            사주구리
          </span>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          {story.date}
        </p>
      </div>

      {/* ── 이름 라벨 ── */}
      {story.profile_name && (
        <p
          className="mb-1 text-[13px] font-semibold tracking-wide text-white/50"
          style={{
            opacity: revealed ? 1 : 0,
            transition: 'opacity 400ms ease-out 80ms',
          }}
        >
          {story.profile_name}
        </p>
      )}

      {/* ── 총점 히어로 — 핵심 숫자 ── */}
      {avgScore !== undefined && (
        <div
          className="mb-2"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 500ms ease-out 120ms, transform 500ms cubic-bezier(0.22,1,0.36,1) 120ms',
          }}
        >
          <div className="flex items-end gap-3 leading-none">
            <span
              className="font-black tabular-nums leading-none"
              style={{
                color: SCORE_COLOR,
                fontSize: 'clamp(88px, 24vw, 108px)',
                lineHeight: 0.9,
              }}
            >
              {avgScore}
            </span>
            <span
              className="pb-3 text-[15px] font-semibold text-white/30"
            >
              / 100
            </span>
          </div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            {t('headerTitle')}
          </p>
        </div>
      )}

      {/* ── 수평 구분선 ── */}
      <div
        className="mb-5 mt-4 h-px w-full"
        style={{
          background: 'rgba(255,255,255,0.10)',
          opacity: revealed ? 1 : 0,
          transition: 'opacity 400ms ease-out 250ms',
        }}
      />

      {/* ── 키워드 — 굵은 선언 한 줄 ── */}
      {story.keyword && (
        <p
          className="mb-5 font-black leading-tight"
          style={{
            color: '#FFD900',
            fontSize: 'clamp(28px, 7.5vw, 36px)',
            wordBreak: 'keep-all',
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 500ms ease-out 300ms, transform 500ms cubic-bezier(0.22,1,0.36,1) 300ms',
          }}
        >
          {story.keyword}
        </p>
      )}

      {/* ── 카테고리 점수 — 에디토리얼 랭킹 ── */}
      <div className="mb-5 flex flex-col gap-2.5">
        {rankedKeys.map((key, i) => {
          const score = story.scores[key] ?? 0
          const isLow = score < BAR_LOW_THRESHOLD
          return (
            <div
              key={key}
              className="flex items-baseline justify-between"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translateX(0)' : 'translateX(-10px)',
                transition: `opacity 400ms ease-out ${380 + i * 55}ms, transform 400ms cubic-bezier(0.22,1,0.36,1) ${380 + i * 55}ms`,
              }}
            >
              {/* 순위 + 카테고리명 */}
              <div className="flex items-baseline gap-2.5">
                <span
                  className="font-bold tabular-nums text-white/25"
                  style={{ fontSize: '11px', letterSpacing: '0.05em', minWidth: '18px' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="font-extrabold"
                  style={{
                    color: isLow ? 'rgba(255,138,46,0.8)' : 'rgba(255,255,255,0.75)',
                    fontSize: 'clamp(14px, 3.8vw, 17px)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {CATEGORY_LABELS[key]}
                </span>
              </div>
              {/* 점수 숫자 */}
              <span
                className="font-black tabular-nums leading-none"
                style={{
                  color: isLow ? SCORE_COLOR : SCORE_NORMAL,
                  fontSize: 'clamp(28px, 7.5vw, 36px)',
                  lineHeight: 1,
                }}
              >
                {score}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── 총운 한 줄 — 굵고 간결하게 ── */}
      {summaryCard?.headline && (
        <p
          className="mb-5 font-bold text-white/80 leading-snug"
          style={{
            fontSize: 'clamp(15px, 4vw, 17px)',
            wordBreak: 'keep-all',
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(6px)',
            transition: `opacity 500ms ease-out ${400 + rankedKeys.length * 55 + 100}ms, transform 500ms cubic-bezier(0.22,1,0.36,1) ${400 + rankedKeys.length * 55 + 100}ms`,
          }}
        >
          {summaryCard.headline}
        </p>
      )}

      {/* ── CTA 버튼 ── */}
      <div className="mt-auto flex gap-3 pt-3">
        {/* 이미지 저장 */}
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-yellow py-3.5 text-[14px] font-extrabold text-ink shadow-[3px_3px_0_#1A1A1A] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50 transition-all duration-100"
          onClick={(e) => { e.stopPropagation(); handleSaveImage() }}
          disabled={saving}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {saving ? '...' : t('saveImage')}
        </button>

        {/* 링크 공유 */}
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/25 py-3.5 text-[14px] font-extrabold text-white disabled:opacity-50 transition-colors duration-200"
          style={{ background: copied ? 'rgba(255,255,255,0.08)' : 'transparent' }}
          onClick={(e) => { e.stopPropagation(); handleShareLink() }}
          disabled={sharing}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
          {copied ? t('copied') : t('shareLink')}
        </button>
      </div>
    </div>
  )
}
