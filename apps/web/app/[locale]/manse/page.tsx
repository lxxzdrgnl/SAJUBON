import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import RecentList from '@/components/manse/RecentList'

export default function ManseIndex() {
  const t = useTranslations('manse.index')
  return (
    <main>
      <h1 className="mb-4 text-lg font-black">{t('title')}</h1>
      <Link href="/manse/new"
        className="mb-4 block rounded-xl border-2 border-ink bg-yellow py-3 text-center text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A]">
        {t('new')}
      </Link>
      <h2 className="mb-3 text-[15px] font-extrabold">{t('recent')}</h2>
      <RecentList />
      <p className="mt-4 text-center text-[11px] text-text-sub">{t('loginHint')}</p>
    </main>
  )
}
