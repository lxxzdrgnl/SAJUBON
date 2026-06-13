import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

/** 로케일 내 404 — 브랜드 톤(브루탈 캔디 + 너구리). */
export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <main className="flex min-h-[62vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-ink bg-yellow shadow-[4px_4px_0_#1A1A1A]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot.svg" alt="" width={64} height={64} />
      </div>
      <p className="text-[64px] font-black leading-none text-ink">404</p>
      <div>
        <p className="text-lg font-extrabold">{t('title')}</p>
        <p className="mt-1 text-sm text-text-sub">{t('desc')}</p>
      </div>
      <Link
        href="/"
        className="rounded-xl border-2 border-ink bg-yellow px-6 py-3 text-sm font-black shadow-[4px_4px_0_#1A1A1A]"
      >
        {t('home')}
      </Link>
    </main>
  )
}
