'use client'

/**
 * 운세 스토리 풀스크린 화면 (design.md §5.6).
 * - fixed inset-0, 딥 틸 그라디언트
 * - 상단 프로그레스 바 (채움: 옐로)
 * - 좌 1/3 탭 = 뒤로, 우 2/3 탭 = 다음
 * - ✕ 닫기 (홈으로)
 * - 힌트 문구 없음, 이모지 없음 (G2)
 * - max-w 640px 안에서 fixed inset-0
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { DailyStoryResponse } from '@sajuguri/api-client'
import { createDailyStory, getDailyRecord } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import { webStorage } from '@/lib/storage'
import { buildBirthKey, loadCachedStory, saveCachedStory } from '@/lib/fortune/cache'
import StoryCard from '@/components/fortune/StoryCard'
import SummaryCard from '@/components/fortune/SummaryCard'

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FortuneStoryPage() {
  const t = useTranslations('fortune.story')
  const router = useRouter()
  const params = useSearchParams()

  const [story, setStory] = useState<DailyStoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cardIndex, setCardIndex] = useState(0)

  // 카드 인터랙션 — 좌 1/3 탭=뒤로, 우 2/3 탭=다음 (터치·클릭 공용)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    router.push('/')
  }, [router])

  const goNext = useCallback(() => {
    if (!story) return
    setCardIndex((i) => Math.min(i + 1, story.cards.length - 1))
  }, [story])

  const goPrev = useCallback(() => {
    setCardIndex((i) => Math.max(i - 1, 0))
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

  // 데이터 로드
  useEffect(() => {
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
        setStory(cached)
        setCardIndex(0)
        setLoading(false)
        return
      }

      try {
        const data = await createDailyStory(api, { birth_input: birthInput, date: today })
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
  }, [params, t])

  const totalCards = story?.cards.length ?? 0
  const progress = totalCards > 0 ? (cardIndex + 1) / totalCards : 0
  const currentCard = story?.cards[cardIndex]
  const isSummary = currentCard?.kind === 'summary'

  return (
    /* 풀스크린 오버레이 — fixed inset-0, max-w 640px 중앙 정렬 */
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'linear-gradient(180deg, #00857D 0%, #04332F 100%)' }}
    >
      {/* 중앙 정렬 컨테이너 */}
      <div className="relative mx-auto flex h-full w-full max-w-[640px] flex-col">

        {/* 상단 프로그레스 바 + 닫기 */}
        <div className="flex shrink-0 items-center gap-3 px-4 pt-4 pb-2">
          {/* 프로그레스 바 (채움: 옐로) */}
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%`, background: '#FFD900' }}
            />
          </div>
          {/* ✕ 닫기 */}
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white"
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
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mascot.svg" alt="" width={72} height={72} className="animate-bounce" />
              <p className="text-sm font-semibold opacity-80">{t('loading')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm text-white/70">{error}</p>
              <button
                className="mt-4 rounded-xl border-2 border-white/40 px-6 py-2 text-sm font-extrabold text-white"
                onClick={handleClose}
              >
                홈으로
              </button>
            </div>
          )}

          {!loading && !error && story && currentCard && !isSummary && (
            <StoryCard
              card={currentCard}
              dayGanji={story.day_ganji}
              profileName={story.profile_name}
            />
          )}

          {!loading && !error && story && currentCard && isSummary && (
            <SummaryCard
              story={story}
              onClose={handleClose}
            />
          )}
        </div>

        {/* 하단 페이지 인디케이터 (점) */}
        {!loading && !error && story && (
          <div className="flex shrink-0 justify-center gap-1.5 py-3">
            {story.cards.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: i === cardIndex ? '20px' : '6px',
                  background: i === cardIndex ? '#FFD900' : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
