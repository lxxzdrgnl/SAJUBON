import { getTranslations } from 'next-intl/server'
import { currentUser, serverAuthApi } from '@/lib/serverAuth'
import BrutalCard from '@/components/ui/BrutalCard'
import MascotTinted from '@/components/ui/MascotTinted'
import HistoryFeedClient from '@/components/my/HistoryFeedClient'
import BackButton from '@/components/my/BackButton'
import PageHeading from '@/components/ui/PageHeading'
import { fetchAllRecords } from '@/lib/records/registry'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const GOOGLE_LOGIN_URL = `${API_URL}/api/auth/google?client=web`

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const t = await getTranslations('my')
  const user = await currentUser()
  const { type } = await searchParams

  if (!user) {
    return (
      <main>
        <div className="mb-4 flex items-start gap-2">
          <BackButton fallback="/my" label={t('history.back')} />
          <PageHeading title={t('history.title')} accent="orange" />
        </div>
        <BrutalCard className="flex flex-col items-center gap-4 py-8 text-center">
          <MascotTinted width={72} height={72} />
          <p className="text-[15px] font-extrabold">{t('history.loginRequired')}</p>
          <a
            href={GOOGLE_LOGIN_URL}
            className="w-full rounded-xl border-2 border-ink bg-yellow py-3 text-sm font-extrabold shadow-brutal"
          >
            {t('history.loginWithGoogle')}
          </a>
        </BrutalCard>
      </main>
    )
  }

  const authApi = await serverAuthApi()
  const records = await fetchAllRecords(authApi)

  return (
    <main>
      <div className="mb-4 flex items-center gap-2">
        <BackButton fallback="/my" label={t('history.back')} />
        <h1 className="text-lg font-black">{t('history.title')}</h1>
      </div>

      <HistoryFeedClient records={records} initialType={type} />
    </main>
  )
}
