import { useQuery } from '@tanstack/react-query'
import { listProfiles, type ProfileResponse } from '@sajuguri/api-client'
import { useAuth } from './auth/AuthContext'

// 공유 서버 상태 훅 — TanStack Query.

/** 내 저장 만세력 목록 (로그인 시에만 fetch). */
export function useProfiles() {
  const { api, status } = useAuth()
  return useQuery<ProfileResponse[]>({
    queryKey: ['profiles'],
    queryFn: () => listProfiles(api),
    enabled: status === 'authed',
  })
}
