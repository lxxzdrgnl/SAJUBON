'use client'

import { useState, type ReactNode } from 'react'

/** 접이식 카드 — 닫힘=저강도, 펼침=오렌지 보더·섀도 (design.md §3·§5.3). 이모지 금지, SVG 셰브론 */
export default function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-surface ${
        open
          ? 'border-2 border-orange shadow-[4px_4px_0_#FF6B00]'
          : 'border-2 border-ink'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-extrabold text-text-sub"
      >
        {title}
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="border-t-[1.5px] border-dashed border-ink px-4 py-3">{children}</div>}
    </div>
  )
}
