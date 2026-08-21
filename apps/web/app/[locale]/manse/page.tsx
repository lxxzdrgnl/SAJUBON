import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import RecentList from '@/components/manse/RecentList'
import SavedList from '@/components/manse/SavedList'
import PageHeading from '@/components/ui/PageHeading'
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
      <div className="mb-4">
        <PageHeading title={t('title')} accent="yellow" />
      </div>
      <Link
        href="/manse/new"
        className="mb-4 block rounded-xl border-2 border-ink bg-yellow py-3.5 text-center text-[15px] font-black text-ink shadow-brutal"
      >
        {t('new')}
      </Link>

      {user && (
        <section className="mb-6">
          <h2 className="mb-3 text-[15px] font-extrabold">{ts('title')}</h2>
          <SavedList profiles={profiles} />
        </section>
      )}

      <RecentList
        isLoggedIn={!!user}
        savedKeys={profiles.map((p) => `${p.birth_date}|${p.birth_time ?? ''}|${p.gender}`)}
      />
    </main>
  )
}
