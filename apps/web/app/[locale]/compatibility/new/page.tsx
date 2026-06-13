'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { ProfileResponse, BirthInput } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import { createCompatibilityReport } from '@sajuguri/api-client'
import PersonSlotPicker, { type PersonPick } from '@/components/compatibility/PersonSlotPicker'

export default function CompatibilityNewPage() {
  const t = useTranslations('compatibility')
  const router = useRouter()

  const [profiles, setProfiles] = useState<ProfileResponse[]>([])
  const [topics, setTopics] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  const GOOGLE_LOGIN_URL = `${API_URL}/api/auth/google?client=web`

  const loadingPhrases = [
    t('new.loading.0'),
    t('new.loading.1'),
    t('new.loading.2'),
    t('new.loading.3'),
    t('new.loading.4'),
  ]

  // 로그인 상태 확인 + 프로필 로드
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        setIsLoggedIn(!!user)
        if (!user) return
        return fetch('/api/profiles', { credentials: 'include' })
          .then((r) => (r.ok ? r.json() : []))
          .then(setProfiles)
      })
      .catch(() => setIsLoggedIn(false))
  }, [])

  // 로딩 문구 순환
  useEffect(() => {
    if (!loading) return
    const timer = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % loadingPhrases.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [loading, loadingPhrases.length])

  function toBirthInput(pick: PersonPick): BirthInput {
    return {
      name: pick.name,
      birth_date: pick.birth_date,
      birth_time: pick.birth_time,
      gender: pick.gender,
      calendar: pick.calendar,
      is_leap_month: pick.is_leap_month,
      ...(pick.birth_longitude != null ? { birth_longitude: pick.birth_longitude } : {}),
    }
  }

  async function handleComplete(a: PersonPick, b: PersonPick) {
    setLoading(true)
    setError('')
    try {
      const report = await createCompatibilityReport(api, {
        person_a: toBirthInput(a),
        person_b: toBirthInput(b),
        ...(topics.trim() ? { request_topics: topics.trim() } : {}),
        language: 'ko',
      })
      router.replace(`/compatibility/${report.id}`)
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 401) {
        setError(t('new.errorLogin'))
      } else if (status === 429) {
        setError(t('new.errorLimit'))
      } else {
        setError(t('new.errorFallback'))
      }
      setLoading(false)
    }
  }

  // 로딩 중 화면
  if (loading) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <Image src="/mascot.svg" alt="" width={72} height={72} className="animate-bounce" priority />
        <p className="text-[15px] font-extrabold text-ink">{loadingPhrases[phraseIdx]}</p>
        <p className="text-[13px] text-text-sub">{t('new.loadingNote')}</p>
      </main>
    )
  }

  // 로그인 확인 중
  if (isLoggedIn === null) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-text-sub">{t('new.checking')}</p>
      </main>
    )
  }

  // 비로그인
  if (!isLoggedIn) {
    return (
      <main className="flex flex-col gap-5">
        <h1 className="text-lg font-black">{t('new.title')}</h1>
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-ink bg-surface p-6 text-center shadow-[4px_4px_0_#1A1A1A]">
          <Image src="/mascot.svg" alt="" width={56} height={56} />
          <p className="text-[15px] font-extrabold">{t('new.loginRequired')}</p>
          <p className="text-[13px] text-text-sub">{t('new.loginDesc')}</p>
          <a
            href={GOOGLE_LOGIN_URL}
            className="w-full rounded-xl border-2 border-ink bg-yellow py-3 text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A]"
          >
            {t('new.loginWithGoogle')}
          </a>
        </div>
      </main>
    )
  }

  // 로그인 상태 — 슬롯 선택 + 요청 주제
  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black leading-tight text-ink">{t('new.title')}</h1>
        <span className="mt-2 block h-1.5 w-12 rounded-full bg-orange" />
      </div>
      <p className="text-[13px] leading-relaxed text-text-sub">{t('new.guideline')}</p>

      {/* 요청 주제 입력 (브루탈 스타일) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-extrabold" htmlFor="topics">
          {t('new.topicsLabel')}
        </label>
        <input
          id="topics"
          type="text"
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          placeholder={t('new.topicsPlaceholder')}
          className="w-full rounded-xl border-2 border-ink bg-surface px-4 py-3 text-sm outline-none shadow-[4px_4px_0_#1A1A1A]"
          maxLength={100}
        />
        <p className="text-[12px] text-text-sub">{t('new.topicsHint')}</p>
      </div>

      {error && (
        <p className="rounded-xl border-[1.5px] border-orange-tint bg-orange-tint px-4 py-3 text-[13px] font-bold text-orange">
          {error}
        </p>
      )}

      <PersonSlotPicker profiles={profiles} onComplete={handleComplete} />
    </main>
  )
}
