import type { StorageAdapter } from '@sajuguri/core'
import { createMemoryStorage } from '@sajuguri/core'

/** localStorage 어댑터 — SSR/시크릿 모드 등 사용 불가 환경은 메모리 폴백 */
export function createWebStorage(): StorageAdapter {
  if (typeof window === 'undefined' || !('localStorage' in window)) return createMemoryStorage()
  return {
    async get(key) { return window.localStorage.getItem(key) },
    async set(key, value) { window.localStorage.setItem(key, value) },
    async remove(key) { window.localStorage.removeItem(key) },
  }
}

export const webStorage = createWebStorage()
