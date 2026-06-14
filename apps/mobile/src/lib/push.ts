import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { registerDeviceToken, type ApiClient } from '@sajuguri/api-client'

// 푸시 알림 — 백엔드는 job 완료 시 Expo push로 { type, result_id }를 보낸다.
// 실제 토큰 발급은 EAS 프로젝트 + 개발 빌드(Expo Go 아님) + APNs 자격이 필요하다.
// 환경이 안 갖춰지면 조용히 건너뛴다(앱 크래시 방지). 탭 라우팅 배선은 항상 동작.

/** 포그라운드에서도 알림 배너를 띄운다. 앱 1회 호출. */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
}

/** 권한 요청 + Expo 푸시 토큰 발급 + 백엔드 등록. 실패해도 throw하지 않는다. */
export async function registerPushToken(api: ApiClient): Promise<void> {
  try {
    if (!Device.isDevice) return // 시뮬레이터는 푸시 토큰 불가
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    if (!projectId) return // EAS 미설정 — 개발 빌드 전까지 스킵

    const { status: existing } = await Notifications.getPermissionsAsync()
    let status = existing
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync()
      status = req.status
    }
    if (status !== 'granted') return

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
    const platform = Platform.OS === 'ios' ? 'ios' : 'android'
    await registerDeviceToken(api, { platform, token })
  } catch {
    /* 토큰 발급/등록 실패는 무시 — 푸시는 부가 기능 */
  }
}

/** 알림 탭 시 결과 화면으로 라우팅. 루트에서 1회 사용. */
export function useNotificationTapRouter() {
  const router = useRouter()
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        type?: string
        result_id?: number
      }
      if (!data?.result_id) return
      const id = String(data.result_id)
      if (data.type === 'saju_report') router.push({ pathname: '/report/[id]', params: { id } })
      else if (data.type === 'compatibility')
        router.push({ pathname: '/compatibility/[id]', params: { id } })
    })
    return () => sub.remove()
  }, [router])
}
