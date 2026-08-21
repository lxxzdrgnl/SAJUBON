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
  // soft도 회색 테두리 금지 — 잉크 보더(그림자 없음)로 저강도 표현
  const style =
    intensity === 'full'
      ? 'border-2 border-ink shadow-brutal'
      : 'border-2 border-ink'
  return <div className={`${base} ${style} ${className}`}>{children}</div>
}
