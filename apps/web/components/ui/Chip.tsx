import type { ReactNode } from 'react'

const VARIANT = {
  default: 'bg-surface text-ink',
  lucky: 'bg-teal-tint text-[#00665F]',     // 길신
  unlucky: 'bg-orange-tint text-[#B34800]', // 흉살
  yellow: 'bg-yellow text-ink',
} as const

/** 통일 칩 — 잉크 보더 + 미니 오프셋 섀도 고정, 의미는 variant 틴트 (design.md §4.1) */
export default function Chip({
  variant = 'default',
  children,
}: {
  variant?: keyof typeof VARIANT
  children: ReactNode
}) {
  return (
    <span
      className={`mb-2 mr-1.5 inline-block rounded-[10px] border-2 border-ink px-2.5 py-1
        text-xs font-extrabold shadow-brutal-sm ${VARIANT[variant]}`}
    >
      {children}
    </span>
  )
}
