'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { createShare } from '@sajuguri/api-client'
import type { SajuCalcResponse, SajuCalcRequest } from '@sajuguri/api-client'

/**
 * 만세력 결과 공유 버튼 — 현재 calc 결과를 토큰화해 /share/{token} 링크를 생성.
 * 링크는 navigator.share(가능 시) 또는 클립보드 복사.
 */
export default function ShareButton({
  calcSnapshot,
  birthInput,
  profileId,
}: {
  calcSnapshot: SajuCalcResponse
  birthInput?: SajuCalcRequest
  profileId?: number
}) {
  const t = useTranslations('manse.result.shareBtn')
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function buildUrl(): Promise<string> {
    if (shareUrl) return shareUrl
    const res = await createShare(api, {
      calc_snapshot: calcSnapshot,
      ...(profileId != null ? { profile_id: profileId } : {}),
      ...(profileId == null && birthInput ? { birth_input: birthInput } : {}),
    })
    const url = `${window.location.origin}/share/${res.share_token}`
    setShareUrl(url)
    return url
  }

  async function handleShare() {
    setLoading(true)
    setError('')
    try {
      const url = await buildUrl()
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: t('shareTitle'), url })
          return
        } catch {
          /* 사용자가 취소했거나 미지원 — 클립보드로 폴백 */
        }
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      setError(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        className="w-full rounded-xl border-2 border-ink bg-teal py-3 text-center text-sm font-extrabold text-white shadow-[4px_4px_0_#1A1A1A] disabled:opacity-60"
      >
        {loading ? t('loading') : copied ? t('copied') : t('label')}
      </button>
      {shareUrl && !copied && (
        <p className="truncate rounded-xl border-[1.5px] border-border-soft bg-surface px-3 py-2 text-[12px] text-text-sub">
          {shareUrl}
        </p>
      )}
      {error && <p className="text-[12px] font-bold text-orange">{error}</p>}
    </div>
  )
}
