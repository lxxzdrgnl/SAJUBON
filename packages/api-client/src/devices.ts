import type { ApiClient } from './client'

export interface DeviceRegisterBody {
  platform: 'ios' | 'android'
  token: string
}

/** POST /api/devices — Expo 푸시 토큰 등록 (앱에서 호출). 204 */
export function registerDeviceToken(api: ApiClient, body: DeviceRegisterBody): Promise<void> {
  return api.post('/api/devices', body)
}
