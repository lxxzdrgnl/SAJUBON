import { useCallback, useState } from 'react'
import { Share } from 'react-native'

// 공유 공통 훅 — 웹 useShareModal 대응(RN은 네이티브 공유 시트 사용).
// 화면별로 재구현하지 않고 share(producer)에 "공유 URL을 만드는 비동기 함수"만 넘긴다.
//   const { sharing, share } = useShare()
//   share(() => shareReport(api, id, false).then(r => r.share_url))
export function useShare() {
  const [sharing, setSharing] = useState(false)

  const share = useCallback(async (produceUrl: () => Promise<string>) => {
    if (sharing) return
    setSharing(true)
    try {
      const url = await produceUrl()
      await Share.share({ message: url, url })
    } catch {
      /* 취소/실패는 무시 */
    } finally {
      setSharing(false)
    }
  }, [sharing])

  return { sharing, share }
}
