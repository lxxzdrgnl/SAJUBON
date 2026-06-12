import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { serverAuthApi } from '@/lib/serverAuth'
import { getReport } from '@sajuguri/api-client'
import ReportView from '@/components/report/ReportView'

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
      {/* 원국 한 줄 요약 */}
      <div className="rounded-2xl border-[1.5px] border-border-soft bg-surface p-3 text-[13px] text-text-sub">
        {summaryLine}
      </div>

      {/* 안내 */}
      <p className="text-[13px] text-text-sub">{t('page.guideText')}</p>

      <ReportView report={report} reportId={Number(id)} />
    </main>
  )
}
