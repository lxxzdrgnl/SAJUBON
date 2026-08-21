import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { serverApi } from '@/lib/api'
import { getSharedConsultation } from '@sajuguri/api-client'
import type { ConsultationDetail } from '@sajuguri/api-client'
import Markdown from '@/components/ui/Markdown'
import { renderTextWithCharts } from '@/lib/chat/chartMarkers'

export const dynamic = 'force-dynamic'

async function fetchShared(token: string): Promise<ConsultationDetail | null> {
  try {
    return await getSharedConsultation(serverApi, token)
  } catch {
    return null
  }
}

// OG 메타 — 카카오/트위터 미리보기
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const t = await getTranslations('question.shared')
  const detail = await fetchShared(token)

  if (!detail) {
    return { title: t('notFoundTitle'), robots: { index: false } }
  }

  // 이름이 있으면 "{이름}님의 한줄상담", 없으면(게스트) "님의" 없는 익명 제목.
  const title = detail.name
    ? `${detail.name}님의 한줄상담 · ${detail.headline} | 사주구리`
    : `사주구리 한줄상담 · ${detail.headline}`
  return {
    title,
    description: detail.headline,
    robots: { index: false },
    openGraph: {
      title,
      description: detail.headline,
      siteName: '사주구리',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: detail.headline,
    },
  }
}

export default async function SharedConsultationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const t = await getTranslations('question.shared')
  const detail = await fetchShared(token)

  if (!detail) {
    return (
      <main className="pt-16 text-center">
        <p className="text-[15px] font-extrabold text-text-sub">{t('notFoundTitle')}</p>
        <p className="mt-2 text-[13px] text-text-sub">{t('notFoundBody')}</p>
      </main>
    )
  }

  const tq = await getTranslations('question')

  return (
    <main className="flex flex-col gap-5">
      <h1 className="text-lg font-black">{tq('title')}</h1>

      {/* 질문 */}
      <div className="rounded-2xl border-[1.5px] border-border-soft bg-surface p-4">
        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-text-sub">
          {tq('questionHeader')}
        </p>
        <p className="text-[14px] font-bold text-ink">{detail.question}</p>
      </div>

      {/* 상담 결과 — 채팅과 동일: content의 [[chart:...]] 마커를 인라인 ToolCard로 렌더 */}
      <div className="rounded-2xl border-2 border-teal bg-surface p-5 shadow-brutal">
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-text-sub">
          {tq('resultLabel')}
        </p>
        <p className="mb-2 text-[18px] font-black leading-snug text-ink">{detail.headline}</p>
        <div className="flex flex-col gap-3">
          {renderTextWithCharts(
            detail.content,
            Object.fromEntries((detail.charts ?? []).map((c) => [c.tool, c.payload])) as Record<string, Record<string, unknown>>,
            'sq',
            { renderText: (seg, key) => <Markdown key={key} className="text-[14px] text-ink">{seg}</Markdown> },
          )}
        </div>
        <span className="mt-4 inline-block rounded-full border-[1.5px] border-ink bg-orange px-3 py-0.5 text-[11px] font-extrabold text-white">
          {detail.category}
        </span>
      </div>

      {/* 나도 한줄상담 받기 CTA */}
      <div className="mt-2 rounded-2xl border-2 border-ink bg-surface p-4 shadow-brutal">
        <p className="mb-1 text-[14px] font-extrabold text-ink">{t('ctaTitle')}</p>
        <p className="mb-3 text-[13px] text-text-sub">{t('ctaBody')}</p>
        <a
          href="/question"
          className="block w-full rounded-xl border-2 border-ink bg-yellow py-3 text-center text-sm font-extrabold shadow-brutal"
        >
          {t('ctaButton')}
        </a>
      </div>
    </main>
  )
}
