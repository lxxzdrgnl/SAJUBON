import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { Noto_Serif_KR } from 'next/font/google'
import { routing } from '@/i18n/routing'
import TabBar from '@/components/TabBar'
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

export const metadata = { title: '사주구리' }

// viewport-fit=cover — iOS 세이프에어리어(노치·홈인디케이터)까지 페이지가 칠해지게.
// 이게 없으면 풀스크린 오버레이(운세 스토리)가 상하 세이프에어리어를 못 덮어
// 기본 배경(청록)이 띠로 남는다. env(safe-area-inset-*)도 이 설정이 있어야 동작.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
