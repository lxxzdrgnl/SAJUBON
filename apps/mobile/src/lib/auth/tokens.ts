import * as SecureStore from 'expo-secure-store'

// 토큰 보관 — Keychain/Keystore 기반 expo-secure-store (AsyncStorage 금지).
const ACCESS_KEY = 'sajuguri.access_token'
const REFRESH_KEY = 'sajuguri.refresh_token'

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY)
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY)
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, access)
  await SecureStore.setItemAsync(REFRESH_KEY, refresh)
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY)
  await SecureStore.deleteItemAsync(REFRESH_KEY)
}
