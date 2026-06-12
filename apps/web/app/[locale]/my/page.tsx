import { getTranslations } from 'next-intl/server'
import { currentUser } from '@/lib/serverAuth'
import { maskEmail } from '@/lib/mask'
import BrutalCard from '@/components/ui/BrutalCard'
import LogoutButton from '@/components/my/LogoutButton'

// 브라우저가 직접 여는 풀 URL — next.config rewrites를 타지 않도록 백엔드 절대 주소 사용.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const GOOGLE_LOGIN_URL = `${API_URL}/api/auth/google?client=web`

export default async function MyPage() {
  const t = await getTranslations('my')
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

  const menu = [
    { key: 'reports', soon: true },
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
