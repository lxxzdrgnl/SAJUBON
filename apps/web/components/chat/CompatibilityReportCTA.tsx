'use client'

/**
 * 챗 인라인 궁합 리포트 CTA.
 * check_compatibility 툴 결과 직후 렌더되며, 클릭 시 해당 세션의 두 사주로
 * 궁합 리포트를 생성하고 /compatibility/[id]로 이동한다.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createCompatibilityJobFromSession } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import { useGenerationJob } from '@/lib/hooks/useGenerationJob'

interface Props {
  sessionId: string
}

export default function CompatibilityReportCTA({ sessionId }: Props) {
  const t = useTranslations('chat')
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { loading: busy, start } = useGenerationJob((_type, resultId) => {
    router.push(`/compatibility/${resultId}`)
  })

  const handleClick = async () => {
    if (busy) return
    setError(null)
    try {
      const { job_id } = await createCompatibilityJobFromSession(api, sessionId)
      start(job_id)
    } catch {
      setError(t('compatibilityCta.error'))
    }
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-teal-tint p-3 shadow-[2px_2px_0_#1A1A1A]">
      <p className="mb-2.5 text-[13px] font-extrabold text-ink leading-snug">
        {t('compatibilityCta.title')}
      </p>
      <button
        className="w-full rounded-xl border-2 border-ink bg-teal py-2 text-sm font-extrabold text-surface shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80 disabled:opacity-40"
        onClick={handleClick}
        disabled={busy}
      >
        {busy ? '…' : t('compatibilityCta.action')}
      </button>
      {error && (
        <p className="mt-1.5 text-[11px] font-semibold text-orange">
          {error}
        </p>
      )}
    </div>
  )
}
