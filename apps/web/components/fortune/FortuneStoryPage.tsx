'use client'

/**
 * 운세 스토리 풀스크린 화면 — Spotify Wrapped 룩.
 * - fixed inset-0, 슬라이드마다 강렬한 단색 비비드 배경 (cardPalette)
 * - 상단 세그먼트 프로그레스 바 (인스타 스토리식)
 * - 좌 1/3 탭 = 뒤로, 우 2/3 탭 = 다음
 * - 플레이풀 그래픽 악센트(흩뿌린 점·물결 SVG)
 * - ✕ 닫기 (홈으로), 이모지 없음 (G2)
 * - max-w 640px 안에서 fixed inset-0
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import type { DailyStoryResponse } from '@sajuguri/api-client'
import { createDailyStory, getDailyRecord } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import { webStorage } from '@/lib/storage'
import { buildBirthKey, loadCachedStory, saveCachedStory } from '@/lib/fortune/cache'
import {
  calcSegmentFills,
  slideDirection,
  cardPalette,
  hashSeed,
  scatterDots,
  hexToRgba,
  type SlideDirection,
} from '@/lib/fortune/story'
import StoryCard from '@/components/fortune/StoryCard'
import SummaryCard from '@/components/fortune/SummaryCard'

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 배경 위 흩뿌린 점 — 결정적 좌표, prefers-reduced-motion 무관 (정적 데코). */
const DOTS = scatterDots(14)

interface FortuneStoryPageProps {
  /**
   * 미리 받은 스토리를 주입하면 fetch를 건너뛰고 읽기전용(공유) 모드로 렌더한다.
   * 없으면 기존 동작(쿼리 파라미터로 생성/저장본 재생).
   */
  initialStory?: DailyStoryResponse
}

export default function FortuneStoryPage({ initialStory }: FortuneStoryPageProps = {}) {
  const t = useTranslations('fortune.story')
  const locale = useLocale()
  const router = useRouter()
  const params = useSearchParams()

  const shareMode = initialStory != null
  const [story, setStory] = useState<DailyStoryResponse | null>(initialStory ?? null)
  const [loading, setLoading] = useState(!initialStory)
  const [error, setError] = useState<string | null>(null)
  const [cardIndex, setCardIndex] = useState(0)
  // 전환 방향 — 카드 슬라이드 인 방향 결정 (next=오른쪽에서, prev=왼쪽에서)
  const [direction, setDirection] = useState<SlideDirection>('none')

  // 카드 인터랙션 — 좌 1/3 탭=뒤로, 우 2/3 탭=다음 (터치·클릭 공용)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    router.push('/')
  }, [router])

  const goNext = useCallback(() => {
    if (!story) return
    setCardIndex((i) => {
      const next = Math.min(i + 1, story.cards.length - 1)
      setDirection(slideDirection(i, next))
      return next
    })
  }, [story])

  const goPrev = useCallback(() => {
    setCardIndex((i) => {
      const next = Math.max(i - 1, 0)
      setDirection(slideDirection(i, next))
      return next
    })
  }, [])

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const third = rect.width / 3
      if (x < third) goPrev()
      else goNext()
    },
    [goPrev, goNext],
  )

  // 데이터 로드 — 공유 모드(initialStory 주입)면 fetch 스킵
  useEffect(() => {
    if (shareMode) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      // record 파라미터: 저장본 재생
      const recordId = params.get('record')
      if (recordId) {
        try {
          const data = await getDailyRecord(api, Number(recordId))
          if (!cancelled) { setStory(data); setCardIndex(0) }
        } catch {
          if (!cancelled) setError(t('error'))
        } finally {
          if (!cancelled) setLoading(false)
        }
        return
      }

      // birth 파라미터로 생성
      const birthDate = params.get('birth_date')
      const birthTime = params.get('birth_time') || null
      const gender = params.get('gender') as 'male' | 'female' | null
      const calendar = (params.get('calendar') ?? 'solar') as 'solar' | 'lunar'
      const isLeapMonth = params.get('is_leap_month') === 'true'
      const birthLong = params.get('birth_longitude')
      const pname = params.get('pname') ?? ''

      if (!birthDate || !gender) {
        if (!cancelled) { setError(t('error')); setLoading(false) }
        return
      }

      const birthInput = {
        name: pname,
        birth_date: birthDate,
        birth_time: birthTime,
        gender,
        calendar,
        is_leap_month: isLeapMonth,
        birth_longitude: birthLong ? Number(birthLong) : undefined,
      }

      const today = todayLocal()
      const birthKey = buildBirthKey(birthInput)

      // 게스트 1일 1회: localStorage 캐시 확인
      const cached = await loadCachedStory(webStorage, birthKey, today)
      if (cached && !cancelled) {
        // 캐시 저장 시 이름 없이 생성된 경우 → pname으로 profile_name 보정 (in-memory only)
        const patched = pname && !cached.profile_name
          ? { ...cached, profile_name: pname }
          : cached
        setStory(patched)
        setCardIndex(0)
        setLoading(false)
        return
      }

      try {
        const data = await createDailyStory(api, { birth_input: birthInput, date: today, language: locale })
        if (!cancelled) {
          setStory(data)
          setCardIndex(0)
          // 오늘 본 목록에 추가
          const seenKey = `sajuguri.fortune.seen.${today}`
          const existing = JSON.parse(window.localStorage.getItem(seenKey) ?? '[]') as string[]
          if (!existing.includes(birthKey)) {
            window.localStorage.setItem(seenKey, JSON.stringify([...existing, birthKey]))
          }
          // 캐시 저장
          await saveCachedStory(webStorage, birthKey, today, data)
        }
      } catch {
        if (!cancelled) setError(t('error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [params, t, shareMode])

  const totalCards = story?.cards.length ?? 0
  const segments = calcSegmentFills(totalCards, cardIndex)
  const currentCard = story?.cards[cardIndex]
  const isSummary = currentCard?.kind === 'summary'

  // Wrapped 비비드 스킨 — 카드마다 색이 확 바뀐다. 시드(날짜+간지+이름)로 사람·날짜마다 셔플.
  // day_ganji는 날짜 공통이라 변별력이 없다 → 사람마다 다른 scores를 시드에 포함.
  const colorSeed = story
    ? hashSeed(`${story.date}|${story.profile_name ?? ''}|${JSON.stringify(story.scores)}`)
    : 0
  const palette = currentCard
    ? cardPalette(currentCard.kind, (currentCard as { category_key?: string }).category_key, colorSeed)
    : cardPalette('fallback', undefined, colorSeed)

  // 카테고리 랭킹 번호 (오늘의 TOP 01·02…) — category 카드들 사이 순서
  const categoryRank = (() => {
    if (!story || currentCard?.kind !== 'category') return null
    const cats = story.cards.filter((c) => c.kind === 'category')
    const idx = cats.findIndex((c) => c === currentCard)
    return idx >= 0 ? idx + 1 : null
  })()

  // 현재 카드 배경색(solid base)을 body/html에 동기화 — iOS Safari 상하 safe-area 영역이
  // 기본 앱 배경(크림)이 아닌 카드 색으로 채워지도록 한다.
  // setProperty('background', ..., 'important')로 CSS 규칙(globals.css body{background:...})을
  // 명시적으로 이기고, theme-color 메타로 iOS 상단 상태바 틴트도 업데이트.
  useEffect(() => {
    const prevBody = document.body.style.getPropertyValue('background')
    const prevBodyPriority = document.body.style.getPropertyPriority('background')
    const prevHtml = document.documentElement.style.getPropertyValue('background')
    const prevHtmlPriority = document.documentElement.style.getPropertyPriority('background')

    document.body.style.setProperty('background', palette.base, 'important')
    document.documentElement.style.setProperty('background', palette.base, 'important')

    // theme-color 메타 — iOS 상단 브라우저 틴트 / 홈화면 추가 시 상태바 색
    let metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const prevTheme = metaTheme?.content ?? ''
    if (!metaTheme) {
      metaTheme = document.createElement('meta')
      metaTheme.name = 'theme-color'
      document.head.appendChild(metaTheme)
    }
    metaTheme.content = palette.base

    return () => {
      if (prevBody) {
        document.body.style.setProperty('background', prevBody, prevBodyPriority || '')
      } else {
        document.body.style.removeProperty('background')
      }
      if (prevHtml) {
        document.documentElement.style.setProperty('background', prevHtml, prevHtmlPriority || '')
      } else {
        document.documentElement.style.removeProperty('background')
      }
      if (metaTheme) metaTheme.content = prevTheme
    }
  }, [palette.base])

  return (
    /* 풀스크린 오버레이 — fixed inset-0, max-w 640px 중앙 정렬 */
    <div
      className="fixed inset-0 z-50 flex flex-col overscroll-none"
      style={{
        background: palette.bg,
        transition: 'background 480ms cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* 플레이풀 그래픽 악센트 — 흩뿌린 점 + 하단 물결. 비비드 배경 위 포인트. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {DOTS.map((d, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: d.r * 2,
              height: d.r * 2,
              background: palette.inkLight ? 'rgba(255,255,255,0.13)' : 'rgba(21,35,58,0.12)',
              transition: 'background 480ms ease',
            }}
          />
        ))}
        {/* 하단 물결 squiggle */}
        <svg
          className="absolute bottom-0 left-0 w-full"
          height="120"
          viewBox="0 0 640 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 70 Q 80 30 160 70 T 320 70 T 480 70 T 640 70 V120 H0 Z"
            fill={palette.inkLight ? 'rgba(255,255,255,0.06)' : 'rgba(21,35,58,0.06)'}
            style={{ transition: 'fill 480ms ease' }}
          />
        </svg>
      </div>

      {/* 스토리 전환·등장 애니메이션 (Tailwind + CSS keyframe, 외부 라이브러리 없음).
          prefers-reduced-motion 존중 — 애니메이션 끔. */}
      <style>{`
        @keyframes story-slide-next {
          from { opacity: 0; transform: translateX(8%) scale(0.985); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes story-slide-prev {
          from { opacity: 0; transform: translateX(-8%) scale(0.985); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes story-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes story-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes story-pop {
          0%   { opacity: 0; transform: scale(0.6) rotate(-4deg); }
          70%  { transform: scale(1.06) rotate(1deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes confetti-burst {
          0%   { transform: translate(-50%,-50%) scale(1) rotate(0deg); opacity: 1; }
          80%  { opacity: 0.8; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.4) rotate(540deg); opacity: 0; }
        }
        @keyframes score-pulse {
          0%,100% { filter: drop-shadow(0 0 18px currentColor) drop-shadow(0 0 8px currentColor); }
          50%     { filter: drop-shadow(0 0 30px currentColor) drop-shadow(0 0 12px currentColor); }
        }
        @keyframes badge-pop {
          from { transform: scale(0) rotate(-12deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes caution-pulse {
          0%,100% { opacity: 0.5; }
          50%     { opacity: 0.8; }
        }
        .story-card-anim.story-dir-next { animation: story-slide-next 420ms cubic-bezier(0.22,1,0.36,1) both; }
        .story-card-anim.story-dir-prev { animation: story-slide-prev 420ms cubic-bezier(0.22,1,0.36,1) both; }
        .story-card-anim.story-dir-none { animation: story-fade-in 340ms ease-out both; }
        /* stagger: 카드 전환 직후부터 콘텐츠가 경쾌하게 순차 등장 */
        .story-stagger > * { animation: story-rise 520ms cubic-bezier(0.22,1,0.36,1) both; }
        .story-stagger > *:nth-child(1) { animation-delay: 140ms; }
        .story-stagger > *:nth-child(2) { animation-delay: 250ms; }
        .story-stagger > *:nth-child(3) { animation-delay: 360ms; }
        .story-stagger > *:nth-child(4) { animation-delay: 460ms; }
        .story-pop { animation: story-pop 560ms cubic-bezier(0.34,1.56,0.64,1) 120ms both; }
        @media (prefers-reduced-motion: reduce) {
          .story-card-anim,
          .story-card-anim.story-dir-next,
          .story-card-anim.story-dir-prev,
          .story-card-anim.story-dir-none,
          .story-stagger > *,
          .story-pop { animation: none !important; }
          [style*="score-pulse"],
          [style*="badge-pop"],
          [style*="caution-pulse"] { animation: none !important; }
        }
      `}</style>
      {/* 중앙 정렬 컨테이너 */}
      <div className="relative mx-auto flex h-full w-full max-w-[640px] flex-col">

        {/* 상단 세그먼트 프로그레스 바 (인스타 스토리식) + 닫기 — 노치 클리어 */}
        <div className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-[calc(1rem+env(safe-area-inset-top))]">
          {/* 카드 개수만큼 세그먼트 — 잉크색으로 채움(배경 대비) */}
          <div className="flex flex-1 items-center gap-1">
            {segments.length === 0 ? (
              <div
                className="h-1 flex-1 overflow-hidden rounded-full"
                style={{ background: hexToRgba(palette.ink, 0.22) }}
              />
            ) : (
              segments.map((fill, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 overflow-hidden rounded-full"
                  style={{ background: hexToRgba(palette.ink, 0.25) }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${fill * 100}%`, background: palette.ink }}
                  />
                </div>
              ))
            )}
          </div>
          {/* ✕ 닫기 */}
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: hexToRgba(palette.ink, 0.16), color: palette.ink }}
            onClick={handleClose}
            aria-label={t('closeLabel')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 카드 영역 — 탭 네비 포함 */}
        <div
          ref={containerRef}
          className="flex flex-1 cursor-pointer flex-col overflow-hidden"
          onClick={handleTap}
        >
          {loading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4" style={{ color: palette.ink }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mascot.svg" alt="" width={72} height={72} className="animate-bounce" />
              <p className="text-sm font-semibold opacity-80">{t('loading')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm" style={{ color: palette.inkSoft }}>{error}</p>
              <button
                className="mt-4 rounded-xl border-2 px-6 py-2 text-sm font-extrabold"
                style={{ borderColor: hexToRgba(palette.ink, 0.4), color: palette.ink }}
                onClick={handleClose}
              >
                {t('home')}
              </button>
            </div>
          )}

          {!loading && !error && story && currentCard && (
            /* 전환 애니메이션 — key 변경 시 슬라이드+페이드 인 재생.
               prefers-reduced-motion 시 애니메이션 제거 (위 <style>). */
            <div
              key={cardIndex}
              className={`flex flex-1 flex-col overflow-hidden story-card-anim story-dir-${direction}`}
            >
              {!isSummary && (
                <StoryCard
                  card={currentCard}
                  dayGanji={story.day_ganji}
                  profileName={story.profile_name}
                  palette={palette}
                  rank={categoryRank}
                />
              )}
              {isSummary && (
                <SummaryCard
                  story={story}
                  onClose={handleClose}
                  palette={palette}
                  shareMode={shareMode}
                />
              )}
            </div>
          )}
        </div>

        {/* 하단 페이지 인디케이터 (점) */}
        {!loading && !error && story && (
          <div className="flex shrink-0 justify-center gap-1.5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {story.cards.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: i === cardIndex ? '20px' : '6px',
                  background: i === cardIndex ? palette.ink : hexToRgba(palette.ink, 0.32),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
