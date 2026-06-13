'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'

/** 헤더 코너용 컴팩트 언어 토글 (한 / EN) — 로그인 전에도 노출. */
export default function LanguageToggleCompact() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  function setLocale(next: 'ko' | 'en') {
    if (next === locale) return
    router.replace(pathname, { locale: next })
  }

  return (
    <div className="inline-flex shrink-0 items-center overflow-hidden rounded-full border-2 border-ink shadow-[2px_2px_0_#1A1A1A]">
      <Seg active={locale === 'ko'} onClick={() => setLocale('ko')} label="한국어">
        한
      </Seg>
      <span className="h-5 w-[2px] bg-ink" aria-hidden />
      <Seg active={locale === 'en'} onClick={() => setLocale('en')} label="English">
        EN
      </Seg>
    </div>
  )
}

function Seg({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={
        'px-2.5 py-1 text-[12px] font-extrabold leading-none transition-opacity ' +
        (active ? 'bg-yellow text-ink' : 'bg-surface text-text-sub hover:opacity-80')
      }
    >
      {children}
    </button>
  )
}
