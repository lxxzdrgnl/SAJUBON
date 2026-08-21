import { getTranslations } from 'next-intl/server'
import { serverAuthApi } from '@/lib/serverAuth'
import { getCompatibilityReport } from '@sajuguri/api-client'
import CompatibilityView from '@/components/compatibility/CompatibilityView'

export default async function CompatibilityDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = await params
  const t = await getTranslations('compatibility')

  let detail = null
  try {
    const api = await serverAuthApi()
    detail = await getCompatibilityReport(api, Number(id))
  } catch {
    detail = null
  }

  if (!detail) {
    return (
      <main className="pt-16 text-center">
        <p className="text-[15px] font-extrabold text-text-sub">{t('view.errorFallback')}</p>
      </main>
    )
  }

  const nameA = detail.person_a.name ?? t('scoreOverview.personA')
  const nameB = detail.person_b.name ?? t('scoreOverview.personB')

  return (
    <main className="flex flex-col gap-4">
      {/* 두 사람 요약 헤더 */}
      <div className="flex items-center gap-2 rounded-lg border-2 border-ink bg-surface px-4 py-3 shadow-brutal">
        <div className="flex flex-1 flex-col min-w-0">
          <span className="truncate text-[14px] font-extrabold text-ink">{nameA}</span>
          {detail.person_a.birth_date && (
            <span className="text-[12px] text-text-sub">{detail.person_a.birth_date}</span>
          )}
        </div>
        <span className="shrink-0 text-[20px] text-orange font-black">♥</span>
        <div className="flex flex-1 flex-col items-end min-w-0">
          <span className="truncate text-[14px] font-extrabold text-ink">{nameB}</span>
          {detail.person_b.birth_date && (
            <span className="text-[12px] text-text-sub">{detail.person_b.birth_date}</span>
          )}
        </div>
      </div>

      <CompatibilityView detail={detail} />

      {/* 안내 — 콘텐츠 하단 */}
      <p className="pb-2 text-center text-[13px] text-text-sub">{t('view.guideText')}</p>
    </main>
  )
}
