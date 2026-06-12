import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { currentUser, serverAuthApi } from '@/lib/serverAuth'
import { maskEmail } from '@/lib/mask'
import BrutalCard from '@/components/ui/BrutalCard'
import LogoutButton from '@/components/my/LogoutButton'
import { listReports } from '@sajuguri/api-client'
import type { ReportSummary } from '@sajuguri/api-client'

// 브라우저가 직접 여는 풀 URL — next.config rewrites를 타지 않도록 백엔드 절대 주소 사용.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const GOOGLE_LOGIN_URL = `${API_URL}/api/auth/google?client=web`

export default async function MyPage() {
  const t = await getTranslations('my')
  const tr = await getTranslations('report')
  const user = await currentUser()

  if (!user) {
    return (
      <main>
        <h1 className="mb-4 text-lg font-black">{t('title')}</h1>
        <BrutalCard className="flex flex-col items-center gap-4 py-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.svg" alt="" width={72} height={72} />
          <p className="text-[15px] font-extrabold">{t('loginRequired')}</p>
          <a
            href={GOOGLE_LOGIN_URL}
            className="w-full rounded-xl border-2 border-ink bg-yellow py-3 text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A]"
          >
            {t('loginWithGoogle')}
          </a>
        </BrutalCard>
      </main>
    )
  }

  // 내 리포트 목록 (백엔드 미완성 시 빈 배열 fallback)
  let reports: ReportSummary[] = []
  try {
    const api = await serverAuthApi()
    reports = await listReports(api)
  } catch {
    reports = []
  }

  const menu = [
    { key: 'fortuneHistory', soon: true },
    { key: 'shares', soon: true },
    { key: 'settings', soon: true },
  ] as const

  return (
    <main>
      <h1 className="mb-4 text-lg font-black">{t('title')}</h1>

      <BrutalCard className="mb-5 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot.svg" alt="" width={48} height={48} className="shrink-0" />
        <span className="block text-[15px] font-extrabold">{maskEmail(user.email)}</span>
      </BrutalCard>

      {/* 내 리포트 목록 */}
      <section className="mb-4">
        <h2 className="mb-2 text-[13px] font-extrabold text-text-sub">{t('menu.reports')}</h2>
        {reports.length === 0 ? (
          <BrutalCard intensity="soft" className="flex flex-col gap-2 py-4 text-center">
            <p className="text-[13px] text-text-sub">{tr('list.empty')}</p>
            <Link
              href="/manse"
              className="mx-auto text-[13px] font-extrabold text-orange underline underline-offset-2"
            >
              {tr('list.generate')}
            </Link>
          </BrutalCard>
        ) : (
          <ul className="flex flex-col gap-2">
            {reports.map(r => (
              <li key={r.id}>
                <Link href={`/report/${r.id}`}>
                  <BrutalCard intensity="soft" className="flex flex-col gap-1 hover:border-border-soft">
                    <p className="text-[14px] font-extrabold leading-snug text-ink">
                      {r.first_headline}
                    </p>
                    <p className="text-[12px] text-text-sub">
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      {' · '}
                      <span className="font-bold text-teal">{r.profile_name}</span>
                      {r.request_topics && (
                        <span className="ml-1 text-text-sub">· {r.request_topics}</span>
                      )}
                    </p>
                  </BrutalCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ul className="mb-5 flex flex-col gap-2">
        {menu.map(({ key, soon }) => (
          <li key={key}>
            <BrutalCard
              intensity="soft"
              className="flex items-center justify-between"
            >
              <span className="text-sm font-extrabold text-text-sub">{t(`menu.${key}`)}</span>
              {soon && (
                <span className="rounded-full border-[1.5px] border-border-soft px-2 py-0.5 text-[10px] font-extrabold text-text-sub">
                  {t('soon')}
                </span>
              )}
            </BrutalCard>
          </li>
        ))}
      </ul>

      <LogoutButton />
    </main>
  )
}
