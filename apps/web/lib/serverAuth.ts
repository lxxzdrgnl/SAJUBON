// 서버 컴포넌트 전용 — 요청 쿠키를 백엔드로 포워딩하는 인증 헬퍼.
import { cookies } from 'next/headers'
import { ApiClient, getMe, type MeResponse } from '@sajuguri/api-client'

const base = process.env.API_BASE ?? 'http://localhost:8000'

/** 들어온 요청의 쿠키를 그대로 포워딩하는 서버용 ApiClient. */
export async function serverAuthApi(): Promise<ApiClient> {
  const jar = await cookies()
  const header = jar.toString()
  return new ApiClient(base, header ? { Cookie: header } : undefined)
}

/** 현재 로그인 유저 (비로그인 → null). */
export async function currentUser(): Promise<MeResponse | null> {
  return getMe(await serverAuthApi())
}
