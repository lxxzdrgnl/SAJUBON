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
import ShareModal from '@/components/ui/ShareModal'
import ScoreOverview from './ScoreOverview'
import ElementFlowDiagram from './ElementFlowDiagram'

// ── 메인 CompatibilityView ─────────────────────────────────────────────────────

export default function CompatibilityView({
  detail,
  shareMode = false,
}: {
  detail: CompatibilityReportDetail
  shareMode?: boolean
}) {
  const t = useTranslations('compatibility')
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const nameA = detail.person_a.name ?? t('scoreOverview.personA')
  const nameB = detail.person_b.name ?? t('scoreOverview.personB')

  async function handleShare() {
    if (shareUrl) return
    setSharing(true)
    try {
      const res = await shareCompatibilityReport(api, detail.id, { mask_birth: false })
      setShareUrl(
        res.share_url || `${window.location.origin}/compatibility/shared/${res.share_token}`,
      )
    } catch {
      // silent fail
    } finally {
      setSharing(false)
    }
  }

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
        onShare={handleShare}
        shareLabel={sharing ? t('share.creating') : t('share.shareBtn')}
        shareMode={shareMode}
      />

      {/* 공유 모달 */}
      <ShareModal
        open={shareUrl !== null}
        url={shareUrl ?? ''}
        title={t('share.title')}
        onClose={() => setShareUrl(null)}
      />
    </div>
  )
}
