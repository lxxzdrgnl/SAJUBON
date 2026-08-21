'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { logout } from '@sajuguri/api-client'
import { api } from '@/lib/api'

/** 로그아웃 — 서버 쿠키 폐기 후 새로고침으로 서버 컴포넌트 재평가. */
export default function LogoutButton() {
  const t = useTranslations('my')
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onClick() {
    if (busy) return
    setBusy(true)
    await logout(api)
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full rounded-xl border-2 border-ink bg-surface py-3 text-sm font-extrabold shadow-brutal disabled:opacity-60"
    >
      {t('logout')}
    </button>
  )
}
