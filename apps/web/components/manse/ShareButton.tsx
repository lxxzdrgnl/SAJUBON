'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { createShare } from '@sajuguri/api-client'
import type { SajuCalcResponse, SajuCalcRequest } from '@sajuguri/api-client'
import ShareModal from '@/components/ui/ShareModal'
import { useShareModal } from '@/lib/hooks/useShareModal'

/**
 * 만세력 결과 공유 버튼 — 현재 calc 결과를 토큰화해 /share/{token} 링크를 생성.
 * ShareModal로 복사/공유 — iOS Safari 사용자 제스처 컨텍스트 보존.
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
  const { shareUrl, sharing, share, close } = useShareModal()
  const [error, setError] = useState('')

  function handleShare() {
    if (shareUrl) return  // 이미 생성된 URL이 있으면 모달만 다시 열기
    setError('')
    share(() =>
      createShare(api, {
        calc_snapshot: calcSnapshot,
        ...(profileId != null ? { profile_id: profileId } : {}),
        ...(profileId == null && birthInput ? { birth_input: birthInput } : {}),
      })
        .then((res) => `${window.location.origin}/share/${res.share_token}`)
        .catch((e) => { setError(t('error')); throw e }),
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className="w-full rounded-xl border-2 border-ink bg-teal py-3 text-center text-sm font-extrabold text-white shadow-[4px_4px_0_#1A1A1A] disabled:opacity-60"
      >
        {sharing ? t('loading') : t('label')}
      </button>
      {error && <p className="text-[12px] font-bold text-orange">{error}</p>}

      <ShareModal
        open={shareUrl !== null}
        url={shareUrl ?? ''}
        title={t('shareTitle')}
        onClose={close}
      />
    </div>
  )
}
