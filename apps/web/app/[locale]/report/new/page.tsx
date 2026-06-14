'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { api } from '@/lib/api'
import { createReport } from '@sajuguri/api-client'
import type { SajuCalcRequest } from '@sajuguri/api-client'
import PageHeading from '@/components/ui/PageHeading'

const LOADING_PHRASES = [
  '사주를 읽고 있어요...',
  '천간과 지지를 살피는 중이에요...',
  '대운의 흐름을 분석하고 있어요...',
  '오행의 균형을 파악하는 중이에요...',
  '당신만의 해설을 작성하고 있어요...',
  '거의 다 됐어요, 조금만 기다려 주세요...',
]

export default function ReportNewPage() {
  const t = useTranslations('report')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [topics, setTopics] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  const GOOGLE_LOGIN_URL = `${API_URL}/api/auth/google?client=web`

  // 로그인 상태 확인
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => setIsLoggedIn(r.ok))
      .catch(() => setIsLoggedIn(false))
  }, [])

  // 로딩 문구 순환
  useEffect(() => {
    if (!loading) return
    const timer = setInterval(() => {
      setPhraseIdx(i => (i + 1) % LOADING_PHRASES.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [loading])

  // searchParams에서 birth 정보 추출
  function buildBirthInput(): SajuCalcRequest | null {
    const birth_date = searchParams.get('birth_date')
    const gender = searchParams.get('gender')
    if (!birth_date || !gender) return null
    return {
      name: searchParams.get('name') ?? undefined,
      birth_date,
      birth_time: searchParams.get('birth_time') ?? null,
      gender: (gender === 'female' ? 'female' : 'male') as 'male' | 'female',
      calendar: (searchParams.get('calendar') ?? 'solar') as 'solar' | 'lunar',
      is_leap_month: searchParams.get('is_leap_month') === 'true',
      ...(searchParams.get('birth_longitude') ? { birth_longitude: Number(searchParams.get('birth_longitude')) } : {}),
      ...(searchParams.get('birth_utc_offset') ? { birth_utc_offset: Number(searchParams.get('birth_utc_offset')) } : {}),
      ...(searchParams.get('city') ? { city: searchParams.get('city')! } : {}),
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const birthInput = buildBirthInput()
    if (!birthInput) {
      setError(t('errorMissingBirth'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const profileId = searchParams.get('profile_id')
      const report = await createReport(api, {
        birth_input: birthInput,
        ...(topics.trim() ? { request_topics: topics.trim() } : {}),
        ...(profileId ? { profile_id: Number(profileId) } : {}),
        language: locale,
      })
      router.replace(`/report/${report.id}`)
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 401) {
        setError(t('errorLogin'))
      } else if (status === 429) {
        setError(t('errorLimit'))
      } else {
        setError(t('errorFallback'))
      }
      setLoading(false)
    }
  }

  // 로딩 중 화면
  if (loading) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <Image src="/mascot.svg" alt="" width={72} height={72} className="animate-bounce" priority />
        <p className="text-[15px] font-extrabold text-ink">{LOADING_PHRASES[phraseIdx]}</p>
        <p className="text-[13px] text-text-sub">{t('loadingNote')}</p>
      </main>
    )
  }

  // 로그인 확인 중
  if (isLoggedIn === null) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-text-sub">{t('checking')}</p>
      </main>
    )
  }

  // 비로그인
  if (!isLoggedIn) {
    return (
      <main className="flex flex-col gap-5">
        <h1 className="text-lg font-black">{t('title')}</h1>
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-ink bg-surface p-6 text-center shadow-[4px_4px_0_#1A1A1A]">
          <Image src="/mascot.svg" alt="" width={56} height={56} />
          <p className="text-[15px] font-extrabold">{t('loginRequired')}</p>
          <p className="text-[13px] text-text-sub">{t('loginDesc')}</p>
          <a
            href={GOOGLE_LOGIN_URL}
            className="w-full rounded-xl border-2 border-ink bg-yellow py-3 text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A]"
          >
            {t('loginWithGoogle')}
          </a>
        </div>
      </main>
    )
  }

  // 로그인 상태 — 생성 폼
  return (
    <main className="flex flex-col gap-5">
      <PageHeading title={t('title')} accent="orange" />

      <p className="text-[13px] leading-relaxed text-text-sub">{t('guideline')}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-extrabold" htmlFor="topics">
            {t('topicsLabel')}
          </label>
          <input
            id="topics"
            type="text"
            value={topics}
            onChange={e => setTopics(e.target.value)}
            placeholder={t('topicsPlaceholder')}
            className="w-full rounded-xl border-2 border-ink bg-surface px-4 py-3 text-sm outline-none shadow-[4px_4px_0_#1A1A1A]"
            maxLength={100}
          />
          <p className="text-[12px] text-text-sub">{t('topicsHint')}</p>
        </div>

        {error && (
          <p className="rounded-xl border-[1.5px] border-orange-tint bg-orange-tint px-4 py-3 text-[13px] font-bold text-orange">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-xl border-2 border-ink bg-orange py-3.5 text-sm font-extrabold text-white shadow-[4px_4px_0_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1A1A1A]"
        >
          {t('submit')}
        </button>
      </form>
    </main>
  )
}
