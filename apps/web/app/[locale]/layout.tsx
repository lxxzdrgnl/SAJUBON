import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { Noto_Serif_KR } from 'next/font/google'
import { routing } from '@/i18n/routing'
import TabBar from '@/components/TabBar'
import LocaleBoot from '@/components/LocaleBoot'
import '../globals.css'

// 간지(천간·지지) 명조체 — font-serif(--font-serif)에 한글·한자 세리프 글리프를 공급한다.
// subsets:['latin']은 라틴 글리프만 받아 한글·한자가 고딕으로 폴백됐다.
// 한국어 폰트는 'korean' 서브셋을 직접 못 받으므로 subsets를 비우고 preload:false로 둔다
// (거대한 CJK 글리프를 preload하진 않되 모든 unicode-range @font-face를 포함해 필요 시 로드).
const notoSerifKR = Noto_Serif_KR({
  weight: ['700', '900'],
  variable: '--font-serif-kr',
  display: 'swap',
  preload: false,
})

// metadataBase — og:image(공유 카드 미리보기)·트위터 이미지가 절대 URL로 해석되도록.
// 미설정 시 Next가 localhost:3000으로 해석해 카카오/트위터가 이미지를 못 불러와 미리보기가 깨진다.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sajuguri.rheon.kr'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: '사주구리',
}

// viewport-fit=cover — iOS 세이프에어리어(노치·홈인디케이터)까지 페이지가 칠해지게.
// 이게 없으면 풀스크린 오버레이(운세 스토리)가 상하 세이프에어리어를 못 덮어
// 기본 배경(청록)이 띠로 남는다. env(safe-area-inset-*)도 이 설정이 있어야 동작.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // SSR HTML에 theme-color 메타를 항상 심는다. iOS Safari는 JS로 '새로 생성'한
  // theme-color는 크롬 틴트에 반영하지 않지만, '기존' 메타의 content 갱신은 반영한다.
  // 운세 스토리(SPA 진입)가 이 메타를 카드 색으로 갱신해 상하 크롬을 맞춘다.
  // 기본값은 앱 배경(크림) — 다른 페이지의 상태바/툴바를 청록 샘플링 대신 일관되게 한다.
  themeColor: 'var(--bg-base)',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  return (
    <html lang={locale} className={notoSerifKR.variable}>
      <body>
        <NextIntlClientProvider>
          {/* 저장된 언어 선택을 부팅 시 강제 (영어 기기여도 한국어 유지) */}
          <LocaleBoot />
          {/* 모바일 단일 컬럼 — design.md §7 */}
          <div className="mx-auto min-h-dvh max-w-[640px] px-4 pb-24 pt-[calc(1.25rem+env(safe-area-inset-top))] md:pb-8 md:pt-24">
            {children}
          </div>
          <TabBar />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
