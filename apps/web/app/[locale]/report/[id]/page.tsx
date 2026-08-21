import { getTranslations } from 'next-intl/server'
import { serverAuthApi } from '@/lib/serverAuth'
import { getReport } from '@sajuguri/api-client'
import ReportView from '@/components/report/ReportView'
import MascotTinted from '@/components/ui/MascotTinted'

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = await params
  const t = await getTranslations('report')

  let report = null
  try {
    const api = await serverAuthApi()
    report = await getReport(api, Number(id))
  } catch {
    report = null
  }

  if (!report) {
    return (
      <main className="pt-16 text-center">
        <p className="text-[15px] font-extrabold text-text-sub">{t('errorFallback')}</p>
      </main>
    )
  }

  const bi = report.birth_input
  const summaryLine = [
    bi.name,
    bi.birth_date,
    bi.gender === 'male' ? '남성' : '여성',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <main className="flex flex-col gap-4">
      {/* 원국 한 줄 요약 — 마스코트 아바타 포함 */}
      <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-3 shadow-brutal">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface">
          <MascotTinted width={40} height={40} />
        </span>
        <span className="text-[14px] font-bold text-ink">{summaryLine}</span>
      </div>

      <ReportView report={report} reportId={Number(id)} />

      {/* 안내 — 콘텐츠 하단으로 이동 */}
      <p className="pb-2 text-center text-[13px] text-text-sub">{t('page.guideText')}</p>
    </main>
  )
}
