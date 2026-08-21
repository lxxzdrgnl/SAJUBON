'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { persistLocale } from '@/components/LocaleBoot'

/** 마이 탭 하단 인라인 언어 전환 (한국어 / English) — 별도 설정 페이지 없이. */
export default function LanguageToggleInline() {
  const t = useTranslations('my.language')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  function setLocale(next: 'ko' | 'en') {
    if (next === locale) return
    persistLocale(next)
    router.replace(pathname, { locale: next, scroll: false })
  }

  return (
    <div className="mb-3">
      <p className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-ink">
        {t('title')}
      </p>
      <div className="flex gap-2">
        <LangButton active={locale === 'ko'} onClick={() => setLocale('ko')}>
          {t('ko')}
        </LangButton>
        <LangButton active={locale === 'en'} onClick={() => setLocale('en')}>
          {t('en')}
        </LangButton>
      </div>
    </div>
  )
}

function LangButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'flex-1 rounded-xl border-2 border-ink py-2.5 text-[13px] font-extrabold shadow-brutal-sm transition-opacity ' +
        (active ? 'bg-yellow text-ink' : 'bg-surface text-text-sub hover:opacity-80')
      }
    >
      {children}
    </button>
  )
}
