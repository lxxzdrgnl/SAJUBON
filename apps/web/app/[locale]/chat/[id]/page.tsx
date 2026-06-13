import { notFound } from 'next/navigation'
import { currentUser, serverAuthApi } from '@/lib/serverAuth'
import { listSessions, listProfiles } from '@sajuguri/api-client'
import type { ChatSession, ProfileResponse } from '@sajuguri/api-client'
import ChatView from '@/components/chat/ChatView'

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export default async function ChatSessionPage({ params }: Props) {
  const { id } = await params

  const user = await currentUser()
  // 비로그인 → 목록으로 리다이렉트 (SSR notFound 또는 로그인 유도)
  if (!user) notFound()

  const authApi = await serverAuthApi()

  let sessions: ChatSession[] = []
  let profiles: ProfileResponse[] = []

  await Promise.allSettled([
    listSessions(authApi).then((r) => { sessions = r }),
    listProfiles(authApi).then((r) => { profiles = r }),
  ])

  const session = sessions.find((s) => s.id === id)
  // 세션이 없거나 목록 로드 실패 → notFound (백엔드 오류 시에는 null 허용)

  return (
    <ChatView
      sessionId={id}
      initialTitle={session?.title ?? null}
      profiles={profiles}
      partnerName={null}
    />
  )
}
