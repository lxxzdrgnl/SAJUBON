import type { ReactNode } from 'react'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { Noto_Serif_KR } from 'next/font/google'
import { routing } from '@/i18n/routing'
import TabBar from '@/components/TabBar'
import '../globals.css'

// 간지(천간·지지) 명조체 — font-serif(--font-serif)에 한글·한자 세리프 글리프를 공급한다.
// 기본 ui-serif 스택은 CJK 글리프가 없어 고딕으로 폴백되므로 명시적으로 로드한다.
const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-serif-kr',
  display: 'swap',
})

export const metadata = { title: '사주구리' }

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
          <div className="mx-auto min-h-dvh max-w-[640px] px-4 pb-24 pt-5 md:pb-8 md:pt-24">
            {children}
          </div>
          <TabBar />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
