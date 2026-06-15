import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { serverApi } from '@/lib/api'
import { getSharedFortune } from '@sajuguri/api-client'
import type { DailyStoryResponse } from '@sajuguri/api-client'
import FortuneStoryPage from '@/components/fortune/FortuneStoryPage'

export const dynamic = 'force-dynamic'

// theme-color(상하 크롬)는 생성본과 동일하게 앱 기본 크림(흰색)으로 둔다 — 공유 페이지는
// 별도 viewport 오버라이드 없이 layout 기본값을 쓰고, 렌더는 동일 FortuneStoryPage 재사용.

/** 총점 — overall 카드 점수 또는 카테고리 평균 (SummaryCard와 동일 규칙). */
function overallScore(story: DailyStoryResponse): number | undefined {
  const fromCard = story.cards.find((c) => c.kind === 'overall')?.score
  if (fromCard !== undefined) return fromCard
  const keys = Object.keys(story.scores)
  if (keys.length === 0) return undefined
  return Math.round(keys.reduce((s, k) => s + (story.scores[k] ?? 0), 0) / keys.length)
}

// OG 메타 — 카카오/트위터 미리보기. og:image는 동일 경로 opengraph-image.tsx가 제공.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const t = await getTranslations('fortune.shared')

  let story: DailyStoryResponse | null = null
  try {
    story = await getSharedFortune(serverApi, token)
  } catch {
    story = null
  }

  if (!story) {
    return {
      title: t('metaTitleFallback'),
      description: t('metaDescriptionFallback'),
      robots: { index: false },
    }
  }

  const score = overallScore(story)
  // 이름이 있으면 "{이름}님의 오늘 운세", 없으면(게스트) "님의" 없는 익명 제목.
  // (이전엔 이름이 없을 때 fallback 문구를 이름 자리에 넣어 "사주구리 오늘의 운세님의…"가 됐다.)
  const hasName = Boolean(story.profile_name)
  const title = hasName
    ? t('metaTitle', { name: story.profile_name, keyword: story.keyword, score: score ?? '' })
    : t('metaTitleAnon', { keyword: story.keyword, score: score ?? '' })
  const description = hasName
    ? t('metaDescription', { name: story.profile_name, keyword: story.keyword })
    : t('metaDescriptionAnon', { keyword: story.keyword })

  return {
    title,
    description,
    robots: { index: false },
    openGraph: {
      title,
      description,
      siteName: '사주구리',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function SharedFortunePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  let story: DailyStoryResponse | null = null
  try {
    story = await getSharedFortune(serverApi, token)
  } catch {
    story = null
  }

  if (!story) {
    const t = await getTranslations('fortune.shared')
    return (
      <main className="pt-16 text-center">
        <p className="text-[15px] font-extrabold text-text-sub">{t('notFoundTitle')}</p>
        <p className="mt-2 text-[13px] text-text-sub">{t('notFoundBody')}</p>
      </main>
    )
  }

  // 읽기전용 공유 모드 — 미리 받은 스토리를 주입하면 fetch 스킵.
  // FortuneStoryPage는 useSearchParams를 쓰므로 Suspense로 감싼다.
  return (
    <Suspense>
      <FortuneStoryPage initialStory={story} />
    </Suspense>
  )
}
