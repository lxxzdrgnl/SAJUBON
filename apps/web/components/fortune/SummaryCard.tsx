'use client'

/**
 * 운세 요약 카드 (kind=summary) — Spotify Wrapped식 "캡처하고 싶은 한 장".
 * 비비드 옐로 배경(palette) 꽉 채움. 휑한 여백 금지.
 *   - 브랜드 헤더(사주구리 + 너구리) + 날짜
 *   - 총점 초대형 히어로 + 이름
 *   - "오늘의 키워드" 인용 초대형 타이포
 *   - 카테고리 가로 점수 바 6개 (스태거 리빌)
 *   - [이미지 저장] [링크 공유] 동선 또렷
 * 이모지 없음 (G2). 데이터 값(점수·키워드·텍스트) 불변.
 * B4: 이미지 저장 — Canvas API, document.fonts.ready 대기 후 한글 렌더.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { DailyStoryResponse } from '@sajuguri/api-client'
import { createFortuneShare } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import { calcScoreBars } from '@/lib/fortune/canvas'
import { hexToRgba, scatterDots, type CardPalette } from '@/lib/fortune/story'
import ShareModal from '@/components/ui/ShareModal'

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
  palette: CardPalette
  /** 공유(읽기전용) 모드 — 저장/공유 동선 대신 "나도 내 운세 보기" CTA */
  shareMode?: boolean
}

export default function SummaryCard({ story, palette, shareMode = false }: Props) {
  const t = useTranslations('fortune.summary')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const { ink, inkSoft, accent, base } = palette

  // 요약 제목 — 이름이 있으면 "{이름}의 하루 요약", 없으면 기본 문구
  const summaryTitle = story.profile_name ? `${story.profile_name}의 하루 요약` : t('headerTitle')

  // 마운트 시 점수 바 0 → 차오름 (DOM 전용). reduced-motion 시 즉시 채움.
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

  /** 요약 카드 캔버스 렌더 → 이미지 다운로드 (비비드 옐로 Wrapped 룩) */
  async function handleSaveImage() {
    setSaving(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1920
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      await document.fonts.ready

      // 현재 슬라이드 팔레트 단색으로 배경 채움 (화면과 동일)
      ctx.fillStyle = base
      ctx.fillRect(0, 0, 1080, 1920)

      // 화면과 동일한 거품(점) 장식 — 잉크색 저투명 원
      for (const d of scatterDots(16)) {
        ctx.beginPath()
        ctx.fillStyle = hexToRgba(ink, 0.07)
        ctx.arc((d.x / 100) * 1080, (d.y / 100) * 1920, d.r * 5, 0, Math.PI * 2)
        ctx.fill()
      }

      // 하단 물결 (화면과 동일) — 잉크색 저투명
      {
        const wt = 1730
        ctx.fillStyle = hexToRgba(ink, 0.06)
        ctx.beginPath()
        ctx.moveTo(0, wt + 110)
        ctx.quadraticCurveTo(135, wt + 47, 270, wt + 110)
        ctx.quadraticCurveTo(405, wt + 173, 540, wt + 110)
        ctx.quadraticCurveTo(675, wt + 47, 810, wt + 110)
        ctx.quadraticCurveTo(945, wt + 173, 1080, wt + 110)
        ctx.lineTo(1080, 1920)
        ctx.lineTo(0, 1920)
        ctx.closePath()
        ctx.fill()
      }

      const PAD = 90
      ctx.textBaseline = 'top'

      // 브랜드 워터마크 상단
      ctx.fillStyle = ink
      ctx.font = '900 36px "Pretendard", "Noto Sans KR", sans-serif'
      ctx.fillText('사주구리', PAD, PAD)

      // 날짜
      ctx.fillStyle = hexToRgba(ink, 0.55)
      ctx.font = '600 34px "Pretendard", "Noto Sans KR", sans-serif'
      ctx.fillText(story.date, PAD, PAD + 56)

      // 제목
      ctx.fillStyle = ink
      ctx.font = '900 78px "Pretendard", "Noto Sans KR", sans-serif'
      ctx.fillText(summaryTitle, PAD, PAD + 120)

      // 총점 초대형 히어로 — 점수는 악센트색
      if (avgScore !== undefined) {
        ctx.fillStyle = accent
        ctx.font = '900 280px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.fillText(String(avgScore), PAD - 10, PAD + 210)
        ctx.fillStyle = hexToRgba(ink, 0.5)
        ctx.font = '800 48px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.fillText('/100', PAD - 10 + (avgScore >= 100 ? 420 : 320), PAD + 420)
      }

      // 키워드 인용 초대형
      if (story.keyword) {
        ctx.fillStyle = accent
        ctx.font = '900 72px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.fillText(`"${story.keyword}"`, PAD, PAD + 540)
      }

      // 구분선
      ctx.strokeStyle = hexToRgba(ink, 0.18)
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(PAD, PAD + 660)
      ctx.lineTo(1080 - PAD, PAD + 660)
      ctx.stroke()

      // 점수 바 6개
      const bars = calcScoreBars(story.scores, 700)
      const BAR_H = 44
      const OFFSET = PAD + 660 + 60
      for (let bi = 0; bi < bars.length; bi++) {
        const bar = bars[bi]
        const y = OFFSET + bi * 110
        const isLow = bar.score < BAR_LOW_THRESHOLD

        // 라벨
        ctx.fillStyle = hexToRgba(ink, 0.85)
        ctx.font = '800 36px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.fillText(bar.label, PAD, y + 4)

        // 바 배경
        ctx.fillStyle = hexToRgba(ink, 0.14)
        ctx.beginPath()
        ctx.roundRect(bar.barX, y, bar.barMaxWidth, BAR_H, 10)
        ctx.fill()

        // 바 채움
        const fillW = Math.round((bar.score / 100) * bar.barMaxWidth)
        ctx.fillStyle = isLow ? accent : ink
        ctx.beginPath()
        ctx.roundRect(bar.barX, y, fillW, BAR_H, 10)
        ctx.fill()

        // 점수 숫자
        ctx.fillStyle = isLow ? accent : ink
        ctx.font = '900 38px "Pretendard", "Noto Sans KR", sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(String(bar.score), bar.valueX, y + 2)
        ctx.textAlign = 'left'
      }

      // 하단 워터마크
      ctx.fillStyle = hexToRgba(ink, 0.45)
      ctx.font = '600 32px "Pretendard", "Noto Sans KR", sans-serif'
      ctx.fillText('사주구리 sajuguri', PAD, 1920 - PAD - 40)

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

  // 공유 요청 본문 — story 스냅샷으로 보낸다. 스냅샷은 story.profile_name(뷰에서
  // pname으로 보정된 이름)을 그대로 저장하므로 공유 미리보기에 이름이 정상 표기된다.
  // (record_id로 보내면 이름이 비어 저장됐던 옛 레코드를 재사용해 익명으로 나간다.)
  // 백엔드는 토큰 충돌만 재시도하므로 재공유해도 실패하지 않는다.
  const shareBody = () => ({ story })

  // 공유 토큰을 미리 발급해 둔다 — 공유하기 탭 '그 순간' 동기 복사가 가능하도록
  // (await 이후 복사하면 iOS 사용자 제스처가 끊겨 복사 실패).
  const preparedUrlRef = useRef<string | null>(null)
  useEffect(() => {
    if (shareMode) return
    let cancelled = false
    createFortuneShare(api, shareBody())
      .then(({ share_token }) => {
        if (!cancelled) preparedUrlRef.current = `${window.location.origin}/share/fortune/${share_token}`
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, shareMode])

  /**
   * 링크 공유 — 미리 받은 토큰이 있으면 탭 제스처 안에서 '즉시' 클립보드에 복사하고
   * 모달을 연다(복사됨 표시). 아직 미발급이면 발급 후 모달(모달이 자동 복사).
   */
  function handleShareLink() {
    const prepared = preparedUrlRef.current
    if (prepared) {
      // 사용자 제스처 안에서 동기 호출 — iOS에서도 복사 성공
      try { void navigator.clipboard?.writeText(prepared) } catch { /* 모달 복사 버튼으로 폴백 */ }
      setShareUrl(prepared)
      return
    }
    setSharing(true)
    createFortuneShare(api, shareBody())
      .then(({ share_token }) => setShareUrl(`${window.location.origin}/share/fortune/${share_token}`))
      .catch(() => {})
      .finally(() => setSharing(false))
  }

  const rise = (delay: number) => ({
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'translateY(0)' : 'translateY(12px)',
    transition: 'opacity 520ms ease-out, transform 520ms cubic-bezier(0.22,1,0.36,1)',
    transitionDelay: `${delay}ms`,
  })

  // 탭 전파를 막지 않는다 — 다른 카드처럼 좌측 1/3 탭=뒤로가 동작.
  // 버튼만 개별적으로 전파 차단(아래 CTA).
  return (
    <div
      className="flex flex-1 min-h-0 flex-col overflow-y-auto px-6 pt-3 select-none"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      {/* 브랜드 헤더 — 너구리 마크 + 사주구리 + 날짜 */}
      <div className="mb-2 flex items-center justify-between" style={rise(0)}>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.svg" alt="" width={30} height={30} />
          <span className="text-[14px] font-black tracking-widest uppercase" style={{ color: ink }}>
            사주구리
          </span>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: inkSoft }}>
          {story.date}
        </p>
      </div>

      {/* 총점 히어로 */}
      {avgScore !== undefined && (
        <div className="mb-1" style={rise(80)}>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: inkSoft }}>
            {summaryTitle}
          </p>
          <div className="flex items-end gap-2">
            <span
              className="font-black leading-[0.8] tabular-nums"
              style={{ color: accent, fontSize: 'clamp(72px, 21vw, 104px)', letterSpacing: '-0.04em' }}
            >
              {avgScore}
            </span>
            <span className="mb-2.5 text-[17px] font-black" style={{ color: inkSoft }}>/100</span>
          </div>
        </div>
      )}

      {/* 오늘의 키워드 */}
      {story.keyword && (
        <div className="mb-2.5" style={rise(180)}>
          <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.2em]" style={{ color: inkSoft }}>
            {t('keyword')}
          </p>
          <p
            className="font-black leading-[1.02]"
            style={{ color: ink, fontSize: 'clamp(30px, 8vw, 44px)', wordBreak: 'keep-all', letterSpacing: '-0.02em' }}
          >
            “{story.keyword}”
          </p>
        </div>
      )}

      {/* 점수 바 6개 — 스태거 리빌 */}
      <div className="mb-3 flex flex-col gap-2">
        {orderedKeys.map((key, i) => {
          const score = story.scores[key] ?? 0
          const isLow = score < BAR_LOW_THRESHOLD
          const barColor = isLow ? accent : ink
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-10 shrink-0 text-[12px] font-black tracking-wide" style={{ color: inkSoft }}>
                {CATEGORY_LABELS[key]}
              </span>
              <div
                className="relative h-3.5 flex-1 overflow-hidden rounded-full"
                style={{ background: hexToRgba(ink, 0.14) }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: revealed ? `${score}%` : '0%',
                    background: barColor,
                    transition: 'width 760ms cubic-bezier(0.22,1,0.36,1)',
                    transitionDelay: `${i * 80 + 260}ms`,
                  }}
                />
              </div>
              <span
                className="w-8 shrink-0 text-right text-[16px] font-black tabular-nums"
                style={{ color: isLow ? accent : ink }}
              >
                {score}
              </span>
            </div>
          )
        })}
      </div>

      {/* 요약 헤드라인 */}
      {summaryCard && (
        <div className="mb-2.5" style={rise(orderedKeys.length * 80 + 420)}>
          <p
            className="font-black leading-[1.12]"
            style={{ color: ink, fontSize: 'clamp(18px, 4.8vw, 21px)', wordBreak: 'keep-all' }}
          >
            {summaryCard.headline}
          </p>
          <p className="mt-1.5 text-[13.5px] leading-normal" style={{ color: inkSoft, wordBreak: 'keep-all' }}>
            {summaryCard.body}
          </p>
        </div>
      )}

      {/* CTA 버튼 — 공유 모드면 "나도 내 운세 보기", 아니면 저장/공유 동선 */}
      {shareMode ? (
        <div className="mt-auto pt-3" style={rise(orderedKeys.length * 80 + 540)}>
          <a
            href="/fortune"
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-black transition-all duration-100 active:translate-y-[2px]"
            style={{ background: ink, color: base }}
            onClick={(e) => e.stopPropagation()}
          >
            {t('shareCta')}
          </a>
        </div>
      ) : (
      <div className="mt-auto flex gap-3 pt-3" style={rise(orderedKeys.length * 80 + 540)}>
        {/* 이미지 저장 — 잉크 솔리드 필 */}
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-black disabled:opacity-50 transition-all duration-100 active:translate-y-[2px]"
          style={{ background: ink, color: base }}
          onClick={(e) => { e.stopPropagation(); handleSaveImage() }}
          disabled={saving}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {saving ? t('saving') : t('saveImage')}
        </button>

        {/* 링크 공유 — 아웃라인 */}
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-[2.5px] py-3 text-[14px] font-black disabled:opacity-50 transition-all duration-150"
          style={{
            borderColor: ink,
            color: ink,
            background: 'transparent',
          }}
          onClick={(e) => { e.stopPropagation(); handleShareLink() }}
          disabled={sharing}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
          {sharing ? t('sharing') : t('shareLink')}
        </button>
      </div>
      )}

      {/* 숨겨진 캔버스 (이미지 생성용) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 링크 공유 모달 — iOS Safari 제스처 대응 (복사/공유는 모달 버튼에서 실행) */}
      <ShareModal
        open={shareUrl !== null}
        url={shareUrl ?? ''}
        title={t('shareLabel')}
        onClose={() => setShareUrl(null)}
      />
    </div>
  )
}
