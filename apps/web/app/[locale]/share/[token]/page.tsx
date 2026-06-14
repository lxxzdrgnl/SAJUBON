import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ApiClient } from '@sajuguri/api-client'
import { getSharedResult } from '@sajuguri/api-client'
import type { SharedResultResponse } from '@sajuguri/api-client'
import ResultView from '@/components/manse/ResultView'
import SaveToMyButton from '@/components/manse/SaveToMyButton'
import { currentUser } from '@/lib/serverAuth'

export const dynamic = 'force-dynamic'

// 인증 없는 공개 클라이언트 — 쿠키 포워딩 없이 백엔드 직결 (SSR).
const publicApi = new ApiClient(process.env.API_BASE ?? 'http://localhost:8000')

async function fetchShared(token: string): Promise<SharedResultResponse | null> {
  try {
    return await getSharedResult(publicApi, token)
  } catch {
    return null
  }
}

// OG 메타 — {이름}님의 만세력 · {일주}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const t = await getTranslations('manse.result.shared')

  const shared = await fetchShared(token)
  if (!shared) {
    return { title: t('metaTitleFallback'), robots: { index: false } }
  }

  // 이름이 있으면 "{이름}님의 만세력", 없으면(게스트) "님의" 없는 익명 제목.
  const name = shared.birth_input?.name
  const ilju = shared.calc_snapshot.day_pillar.ganji_name
  const title = name ? t('metaTitle', { name, ilju }) : t('metaTitleAnon', { ilju })
  const description = name ? t('metaDescription', { name }) : t('metaDescriptionAnon')

  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, siteName: '사주구리', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const GOOGLE_LOGIN_URL = `${API_URL}/api/auth/google?client=web`

export default async function SharedMansePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const t = await getTranslations('manse.result.shared')

  const [shared, user] = await Promise.all([fetchShared(token), currentUser()])

  if (!shared) {
    return (
      <main className="pt-16 text-center">
        <p className="text-[15px] font-extrabold text-text-sub">{t('notFoundTitle')}</p>
        <p className="mt-2 text-[13px] text-text-sub">{t('notFoundBody')}</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-3">
      <ResultView data={shared.calc_snapshot} />

      {/* 내 만세력에 추가하기 */}
      {shared.birth_input && (
        <SaveToMyButton
          birthInput={shared.birth_input}
          isLoggedIn={!!user}
          googleLoginUrl={GOOGLE_LOGIN_URL}
        />
      )}

      {/* 공유 모드 CTA — 나도 내 사주 보기 */}
      <div className="mt-2 rounded-2xl border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#1A1A1A]">
        <p className="mb-1 text-[14px] font-extrabold text-ink">{t('ctaTitle')}</p>
        <p className="mb-3 text-[13px] text-text-sub">{t('ctaBody')}</p>
        <Link
          href="/manse"
          className="block w-full rounded-xl border-2 border-ink bg-yellow py-3 text-center text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A]"
        >
          {t('ctaButton')}
        </Link>
      </div>
    </main>
  )
}
