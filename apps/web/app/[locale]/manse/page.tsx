import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import RecentList from '@/components/manse/RecentList'
import SavedList from '@/components/manse/SavedList'
import { currentUser, serverAuthApi } from '@/lib/serverAuth'
import { listProfiles, type ProfileResponse } from '@sajuguri/api-client'

// 브라우저가 직접 여는 풀 URL — next.config rewrites를 타지 않도록 백엔드 절대 주소 사용.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const GOOGLE_LOGIN_URL = `${API_URL}/api/auth/google?client=web`

export default async function ManseIndex() {
  const t = await getTranslations('manse.index')
  const ts = await getTranslations('manse.saved')
  const user = await currentUser()

  let profiles: ProfileResponse[] = []
  if (user) {
    try {
      profiles = await listProfiles(await serverAuthApi())
    } catch {
      profiles = []
    }
  }

  return (
    <main>
      <h1 className="mb-4 text-lg font-black">{t('title')}</h1>
      <Link
        href="/manse/new"
        className="mb-4 block rounded-xl border-2 border-ink bg-[#4DA8E8] py-3 text-center text-sm font-extrabold text-white shadow-[4px_4px_0_#1A1A1A]"
      >
        {t('new')}
      </Link>

      {user && (
        <section className="mb-6">
          <h2 className="mb-3 text-[15px] font-extrabold">{ts('title')}</h2>
          <SavedList profiles={profiles} />
        </section>
      )}

      <h2 className="mb-3 text-[15px] font-extrabold">{t('recent')}</h2>
      <RecentList isLoggedIn={!!user} />

      {!user && (
        <Link
          href="/my"
          className="mt-5 block rounded-xl border-2 border-ink bg-surface py-3 text-center text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A]"
        >
          {ts('loginPrompt')}
        </Link>
      )}
    </main>
  )
}
