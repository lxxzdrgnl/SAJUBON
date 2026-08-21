'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'

const ICONS: Record<string, string> = {
  home: 'M3 11 L12 3.5 L21 11 M5.5 9.5 V20 H10 V14.5 H14 V20 H18.5 V9.5',
  manse: 'M4 4 h7 v7 h-7 Z M13 4 h7 v7 h-7 Z M4 13 h7 v7 h-7 Z M13 13 h7 v7 h-7 Z',
  chat: 'M4 6 a3 3 0 0 1 3-3 h10 a3 3 0 0 1 3 3 v7 a3 3 0 0 1-3 3 H10 l-4.5 4 v-4 H7 a3 3 0 0 1-3-3 Z',
  my: 'M12 4 a4 4 0 1 1 0 8 a4 4 0 0 1 0-8 M4 20 a8 8 0 0 1 16 0',
}
const TABS = [
  { key: 'home', href: '/' },
  { key: 'manse', href: '/manse' },
  { key: 'chat', href: '/chat' },
  { key: 'my', href: '/my' },
] as const

export default function TabBar() {
  const t = useTranslations('tab')
  const pathname = usePathname()
  const activeIndex = TABS.findIndex(({ href }) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href),
  )
  // 모바일=하단, 데스크탑(md+)=상단 고정 (사용자 확정)
  return (
    <nav className="fixed bottom-[calc(0.875rem+env(safe-area-inset-bottom))] left-1/2 flex w-[calc(100%-28px)] max-w-[612px] -translate-x-1/2 overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-brutal md:bottom-auto md:top-3.5">
      {/* 활성 탭 인디케이터 — 탭마다 bg를 켜고 끄는 대신 알약 하나를 옮긴다.
          탭이 어느 방향으로 이동했는지 설명해주는 게 목적이라 transform만 애니메이트한다. */}
      {activeIndex >= 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-yellow"
          style={{
            width: `${100 / TABS.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
            transitionProperty: 'transform',
            transitionDuration: 'var(--motion-duration-base)',
            transitionTimingFunction: 'var(--motion-ease-out)',
            willChange: 'transform',
          }}
        />
      )}
      {TABS.map(({ key, href }, i) => {
        const active = i === activeIndex
        return (
          <Link
            key={key}
            href={href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-extrabold transition-colors ${
              active ? 'text-ink' : 'text-text-sub'
            }`}
            style={{ transitionDuration: 'var(--motion-duration-fade)' }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={ICONS[key]} />
            </svg>
            {t(key)}
          </Link>
        )
      })}
    </nav>
  )
}
