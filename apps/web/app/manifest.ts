import type { MetadataRoute } from 'next'

// PWA(홈 화면 추가) 매니페스트 — 안드로이드/크롬 설치 시 아이콘·이름.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '사주구리',
    short_name: '사주구리',
    description: 'AI 사주·궁합·오늘의 운세',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF7EC',
    theme_color: '#FFD900',
    icons: [
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
