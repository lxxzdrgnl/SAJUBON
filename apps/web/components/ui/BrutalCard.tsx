import type { ReactNode } from 'react'

/** 브루탈 강도 2단계 카드 (design.md §3). full=잉크 보더+오프셋 섀도, soft=저강도 */
export default function BrutalCard({
  intensity = 'full',
  className = '',
  children,
}: {
  intensity?: 'full' | 'soft'
  className?: string
  children: ReactNode
}) {
  const base = 'rounded-2xl bg-surface p-4'
  const style =
    intensity === 'full'
      ? 'border-2 border-ink shadow-[4px_4px_0_#1A1A1A]'
      : 'border-[1.5px] border-border-soft'
  return <div className={`${base} ${style} ${className}`}>{children}</div>
}
