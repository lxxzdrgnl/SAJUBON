import { getTranslations } from 'next-intl/server'
import { currentUser, serverAuthApi } from '@/lib/serverAuth'
import { listSessions, listProfiles } from '@sajuguri/api-client'
import type { ChatSession, ProfileResponse } from '@sajuguri/api-client'
import BrutalCard from '@/components/ui/BrutalCard'
import ChatListClient from '@/components/chat/ChatListClient'
import PageHeading from '@/components/ui/PageHeading'

// 백엔드 직결 URL — 서버 컴포넌트는 next.config rewrites를 안 탄다
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const GOOGLE_LOGIN_URL = `${API_URL}/api/auth/google?client=web`

export default async function ChatPage() {
  const t = await getTranslations('chat')
  const user = await currentUser()

  if (!user) {
    return (
      <main>
        <div className="mb-4">
          <PageHeading title={t('title')} accent="teal" />
        </div>
        <BrutalCard className="flex flex-col items-center gap-4 py-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.svg" alt="" width={72} height={72} />
          <p className="text-[15px] font-extrabold">{t('loginRequired')}</p>
          <p className="text-sm text-text-sub">{t('loginDesc')}</p>
          <a
            href={GOOGLE_LOGIN_URL}
            className="w-full rounded-xl border-2 border-ink bg-yellow py-3 text-sm font-extrabold shadow-brutal text-center block"
          >
            {t('loginWithGoogle')}
          </a>
        </BrutalCard>
      </main>
    )
  }

  const authApi = await serverAuthApi()

  // 세션 목록 + 저장 만세력 (백엔드 미가동 시 빈 배열 fallback)
  let sessions: ChatSession[] = []
  let profiles: ProfileResponse[] = []

  await Promise.allSettled([
    listSessions(authApi).then((r) => { sessions = r }),
    listProfiles(authApi).then((r) => { profiles = r }),
  ])

  return (
    <main>
      <ChatListClient sessions={sessions} profiles={profiles} />
    </main>
  )
}
