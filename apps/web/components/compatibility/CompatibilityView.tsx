'use client'

/**
 * CompatibilityView — 궁합 리포트 조립 뷰.
 * 상단 overview(ScoreOverview + ElementFlowDiagram) + 헤드라인 탭 아코디언(TabbedReport).
 * 소유자 페이지에서는 onShare로 공유 모달을 띄우고, shareMode면 공유 CTA를 숨긴다.
 */

import { useTranslations } from 'next-intl'
import type { CompatibilityReportDetail, ReportTab } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import { shareCompatibilityReport } from '@sajuguri/api-client'
import TabbedReport from '@/components/report/TabbedReport'
import ShareModal from '@/components/ui/ShareModal'
import { useShareModal } from '@/lib/hooks/useShareModal'
import ScoreOverview from './ScoreOverview'
import ElementFlowDiagram from './ElementFlowDiagram'

// ── 궁합 차트 → tool 이름 맵 ──────────────────────────────────────────────────
// detail.charts 의 각 키를 compat_* tool 이름에 매핑한다.
// 탭 content의 `[[chart:TOOL]]` 마커가 이 맵으로 인라인 ToolCard로 치환된다.

function buildCompatChartsToolByName(
  charts: Record<string, unknown> | undefined,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {}
  if (!charts) return out
  // 백엔드 detail.charts 키 = 마커 tool 이름과 동일(compat_*). 그대로 매핑한다.
  const tools = [
    'compat_palja_a', 'compat_palja_b',
    'compat_wuxing_a', 'compat_wuxing_b',
    'compat_ten_gods_a', 'compat_ten_gods_b',
    'compat_strength_a', 'compat_strength_b',
    'compat_branches',
  ]
  for (const tool of tools) {
    const payload = charts[tool]
    if (payload && typeof payload === 'object') {
      out[tool] = payload as Record<string, unknown>
    }
  }
  return out
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
  const { shareUrl, sharing, share, close } = useShareModal()

  const nameA = detail.person_a.name ?? t('scoreOverview.personA')
  const nameB = detail.person_b.name ?? t('scoreOverview.personB')

  function handleShare() {
    if (shareUrl) return
    share(() =>
      shareCompatibilityReport(api, detail.id, { mask_birth: false }).then(
        (res) => res.share_url || `${window.location.origin}/compatibility/shared/${res.share_token}`,
      ),
    )
  }

  const chartsToolByName = buildCompatChartsToolByName(detail.charts)

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
        chartsToolByName={chartsToolByName}
      />

      {/* 공유 모달 */}
      <ShareModal
        open={shareUrl !== null}
        url={shareUrl ?? ''}
        title={t('share.title')}
        onClose={close}
      />
    </div>
  )
}
