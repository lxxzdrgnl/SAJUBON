import { ApiClient } from '@sajuguri/api-client'

/**
 * 클라이언트 컴포넌트용: '' → 상대경로 /api → next.config rewrites가 백엔드로 프록시.
 * 서버 컴포넌트(SSR)용: rewrites를 안 타므로 백엔드 직결 URL 사용.
 */
export const api = new ApiClient('')
export const serverApi = new ApiClient(process.env.API_BASE ?? 'http://localhost:8000')
