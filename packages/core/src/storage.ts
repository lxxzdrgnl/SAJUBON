/**
 * 플랫폼 저장소 어댑터 — packages/*에서 localStorage/AsyncStorage 직접 호출 금지.
 * 웹: localStorage 구현은 apps/web에서, RN: AsyncStorage 구현은 apps/native에서 주입.
 * (비동기 시그니처인 이유: RN AsyncStorage가 비동기)
 */
export interface StorageAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

/** 테스트·SSR 폴백용 인메모리 구현 */
export function createMemoryStorage(): StorageAdapter {
  const m = new Map<string, string>()
  return {
    async get(key) { return m.get(key) ?? null },
    async set(key, value) { m.set(key, value) },
    async remove(key) { m.delete(key) },
  }
}
