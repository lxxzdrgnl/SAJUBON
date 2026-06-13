import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { serverApi } from '@/lib/api'
import { getSharedCompatibilityReport } from '@sajuguri/api-client'
import CompatibilityView from '@/components/compatibility/CompatibilityView'

export const dynamic = 'force-dynamic'

// OG 메타 — 카카오 미리보기
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  let nameA = 'A'
  let nameB = 'B'
  let total: number | null = null
  try {
    const detail = await getSharedCompatibilityReport(serverApi, token)
    nameA = detail.person_a.name || nameA
    nameB = detail.person_b.name || nameB
    total = detail.score.total
  } catch {
    /* fallback */
  }
  const title =
    total != null
      ? `${nameA} ♥ ${nameB} · ${total} | 사주구리 궁합`
      : '사주구리 궁합 리포트'
  const description = `${nameA}님과 ${nameB}님의 AI 궁합 리포트를 확인해보세요.`
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, siteName: '사주구리' },
  }
}

export default async function SharedCompatibilityPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const t = await getTranslations('compatibility')

  let detail = null
  try {
    detail = await getSharedCompatibilityReport(serverApi, token)
  } catch {
    detail = null
  }

  if (!detail) {
    return (
      <main className="pt-16 text-center">
        <p className="text-[15px] font-extrabold text-text-sub">{t('share.notFoundTitle')}</p>
        <p className="mt-2 text-[13px] text-text-sub">{t('share.notFoundDesc')}</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-4">
      <p className="text-[13px] text-text-sub">{t('view.guideText')}</p>

      {/* 공유 모드 — 공유/재생성 CTA 없음, 저장 스냅샷 */}
      <CompatibilityView detail={detail} shareMode />

      {/* 나도 확인 CTA */}
      <div className="mt-2 rounded-2xl border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#1A1A1A]">
        <p className="mb-1 text-[14px] font-extrabold text-ink">{t('share.ctaTitle')}</p>
        <p className="mb-3 text-[13px] text-text-sub">{t('share.ctaDesc')}</p>
        <a
          href="/compatibility/new"
          className="block w-full rounded-xl border-2 border-ink bg-yellow py-3 text-center text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A]"
        >
          {t('share.ctaBtn')}
        </a>
      </div>
    </main>
  )
}
