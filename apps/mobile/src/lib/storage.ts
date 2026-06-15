/**
 * AsyncStorage 기반 StorageAdapter — @sajuguri/core의 StorageAdapter 인터페이스 구현.
 * loadRecentInputs / saveRecentInput 등 core 헬퍼에 주입해 사용한다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { StorageAdapter } from '@sajuguri/core'

export const rnStorage: StorageAdapter = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key)
    } catch {
      return null
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value)
    } catch {
      // 저장 실패는 무시 (UX 보호)
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key)
    } catch {
      // 무시
    }
  },
}
