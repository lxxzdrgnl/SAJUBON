'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ApiClient, createProfile } from '@sajuguri/api-client'
import type { SajuCalcRequest } from '@sajuguri/api-client'

interface Props {
  birthInput: SajuCalcRequest
  isLoggedIn: boolean
  googleLoginUrl: string
}

export default function SaveToMyButton({ birthInput, isLoggedIn, googleLoginUrl }: Props) {
  const t = useTranslations('manse.result.shared')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  async function handleSave() {
    if (state === 'busy' || state === 'done') return
    setState('busy')
    try {
      const api = new ApiClient('')
      await createProfile(api, {
        name: birthInput.name ?? '',
        birth_date: birthInput.birth_date,
        birth_time: birthInput.birth_time,
        calendar: birthInput.calendar,
        gender: birthInput.gender,
        is_leap_month: birthInput.is_leap_month,
        city: birthInput.city,
        longitude: birthInput.birth_longitude,
      })
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="mt-2 flex flex-col gap-2 rounded-lg border-2 border-ink bg-surface p-4 shadow-brutal">
        <p className="text-[13px] text-text-sub">{t('saveToMyLoginHint')}</p>
        <a
          href={googleLoginUrl}
          className="block w-full rounded-lg border-2 border-ink bg-surface py-3 text-center text-sm font-extrabold shadow-brutal-sm transition-opacity hover:opacity-80"
        >
          {t('saveToMyLoginLink')}
        </a>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={state === 'busy' || state === 'done'}
      className={
        'mt-2 block w-full rounded-lg border-2 border-ink py-3 text-center text-sm font-extrabold shadow-brutal-sm transition-opacity disabled:opacity-60 ' +
        (state === 'done'
          ? 'bg-teal text-surface'
          : state === 'error'
            ? 'bg-surface text-orange'
            : 'bg-surface text-ink hover:opacity-80')
      }
    >
      {state === 'done'
        ? t('saveToMySuccess')
        : state === 'error'
          ? t('saveToMyError')
          : t('saveToMyTitle')}
    </button>
  )
}
