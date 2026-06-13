'use client'

import { useRouter } from '@/i18n/navigation'

interface Props {
  fallback?: string
  label: string
}

export default function BackButton({ fallback = '/my', label }: Props) {
  const router = useRouter()

  function handleClick() {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-70"
      aria-label={label}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  )
}
