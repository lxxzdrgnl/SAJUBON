'use client'

/**
 * CompatibilityView — 궁합 리포트 조립 뷰.
 * 상단 overview(ScoreOverview + ElementFlowDiagram) + 헤드라인 탭 아코디언(TabbedReport).
 * 소유자 페이지에서는 onShare로 공유 모달을 띄우고, shareMode면 공유 CTA를 숨긴다.
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { CompatibilityReportDetail, ReportTab } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import { shareCompatibilityReport } from '@sajuguri/api-client'
import TabbedReport from '@/components/report/TabbedReport'
import ScoreOverview from './ScoreOverview'
import ElementFlowDiagram from './ElementFlowDiagram'

// ── 공유 모달 ──────────────────────────────────────────────────────────────────

function ShareModal({
  reportId,
  onClose,
  t,
}: {
  reportId: number
  onClose: () => void
  t: ReturnType<typeof useTranslations>
}) {
  const [maskBirth, setMaskBirth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function handleShare() {
    setLoading(true)
    setError('')
    try {
      const res = await shareCompatibilityReport(api, reportId, { mask_birth: maskBirth })
      setShareUrl(
        res.share_url || `${window.location.origin}/compatibility/shared/${res.share_token}`,
      )
    } catch {
      setError(t('share.error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      /* clipboard 권한 없는 경우 무시 */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[480px] rounded-t-3xl border-2 border-ink bg-surface p-6 shadow-[0_-4px_0_#1A1A1A] sm:rounded-3xl sm:shadow-[4px_4px_0_#1A1A1A]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold">{t('share.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink text-text-sub"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* 생년월일시 공개 토글 */}
        <div className="mb-5 flex items-center justify-between rounded-xl border-2 border-ink bg-surface px-4 py-3">
          <span className="text-[14px] font-bold text-ink">{t('share.maskBirthLabel')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={!maskBirth}
            onClick={() => setMaskBirth((v) => !v)}
            className={`relative h-6 w-11 rounded-full border-2 border-ink transition-colors ${
              !maskBirth ? 'bg-teal' : 'bg-surface'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full border-2 border-ink bg-white transition-transform ${
                !maskBirth ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {error && <p className="mb-3 text-[12px] font-bold text-orange">{error}</p>}

        {shareUrl ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-xl border-2 border-ink bg-surface px-3 py-2">
              <span className="flex-1 truncate text-[12px] text-text-sub">{shareUrl}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full rounded-xl border-2 border-ink bg-teal py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_#1A1A1A]"
            >
              {copied ? t('share.copied') : t('share.copyUrl')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleShare}
            disabled={loading}
            className="w-full rounded-xl border-2 border-ink bg-teal py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_#1A1A1A] disabled:opacity-60"
          >
            {loading ? t('share.creating') : t('share.shareBtn')}
          </button>
        )}
      </div>
    </div>
  )
}

// ── 메인 CompatibilityView ─────────────────────────────────────────────────────

export default function CompatibilityView({
  detail,
  shareMode = false,
}: {
  detail: CompatibilityReportDetail
  shareMode?: boolean
}) {
  const t = useTranslations('compatibility')
  const [showShare, setShowShare] = useState(false)

  const nameA = detail.person_a.name ?? t('scoreOverview.personA')
  const nameB = detail.person_b.name ?? t('scoreOverview.personB')

  return (
    <div className="flex flex-col gap-4">
      <TabbedReport
        overview={
          <>
            <ScoreOverview score={detail.score} nameA={nameA} nameB={nameB} />
            <ElementFlowDiagram synastry={detail.synastry} nameA={nameA} nameB={nameB} />
          </>
        }
        tabs={detail.tabs as ReportTab[]}
        onShare={() => setShowShare(true)}
        shareLabel={t('share.shareBtn')}
        shareMode={shareMode}
      />

      {/* 공유 모달 */}
      {showShare && (
        <ShareModal reportId={detail.id} onClose={() => setShowShare(false)} t={t} />
      )}
    </div>
  )
}
