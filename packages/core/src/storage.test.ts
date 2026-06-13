import { describe, it, expect } from 'vitest'
import { createMemoryStorage, type StorageAdapter } from './storage'

describe('StorageAdapter', () => {
  it('메모리 구현이 get/set/remove 계약을 만족한다', async () => {
    const s: StorageAdapter = createMemoryStorage()
    expect(await s.get('k')).toBeNull()
    await s.set('k', 'v')
    expect(await s.get('k')).toBe('v')
    await s.remove('k')
    expect(await s.get('k')).toBeNull()
  })
})
