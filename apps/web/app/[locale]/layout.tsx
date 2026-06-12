import type { ReactNode } from 'react'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import TabBar from '@/components/TabBar'
import '../globals.css'

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
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          {/* 모바일 단일 컬럼 — design.md §7 */}
          <div className="mx-auto min-h-dvh max-w-[640px] px-4 pb-24 pt-5">
            {children}
          </div>
          <TabBar />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
