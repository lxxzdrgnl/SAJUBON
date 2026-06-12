import type { Metadata } from 'next'
import { serverApi } from '@/lib/api'
import { getSharedReport } from '@sajuguri/api-client'
import ReportView from '@/components/report/ReportView'

export const dynamic = 'force-dynamic'

// OG 메타 — 카카오 미리보기 (spec §7.5 핵심 요구)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  let name = '사주구리'
  try {
    const report = await getSharedReport(serverApi, token)
    name = report.profile_name || name
  } catch {
    /* fallback */
  }
  const title = `${name}님의 사주 리포트 | 사주구리`
  return {
    title,
    description: `${name}님의 AI 사주 리포트를 확인해보세요.`,
    robots: { index: false },
    openGraph: {
      title,
      description: `${name}님의 AI 사주 리포트를 확인해보세요.`,
      siteName: '사주구리',
    },
  }
}

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  let report = null
  try {
    report = await getSharedReport(serverApi, token)
  } catch {
    report = null
  }

  if (!report) {
    return (
      <main className="pt-16 text-center">
        <p className="text-[15px] font-extrabold text-text-sub">공유 링크를 찾을 수 없어요.</p>
        <p className="mt-2 text-[13px] text-text-sub">링크가 만료됐거나 잘못된 주소예요.</p>
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
      <div className="rounded-2xl border-[1.5px] border-border-soft bg-surface p-3 text-[13px] text-text-sub">
        {summaryLine}
      </div>
      <p className="text-[13px] text-text-sub">각 제목을 클릭하면 해설이 펼쳐져요</p>

      {/* 공유 모드 — CTA 없음 */}
      <ReportView report={report} reportId={0} shareMode />

      {/* 나도 확인 CTA */}
      <div className="mt-2 rounded-2xl border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#1A1A1A]">
        <p className="mb-1 text-[14px] font-extrabold text-ink">나도 내 사주가 궁금하다면?</p>
        <p className="mb-3 text-[13px] text-text-sub">생년월일시만 입력하면 무료로 만세력을 확인할 수 있어요.</p>
        <a
          href="/"
          className="block w-full rounded-xl border-2 border-ink bg-yellow py-3 text-center text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A]"
        >
          나도 확인해보기
        </a>
      </div>
    </main>
  )
}
