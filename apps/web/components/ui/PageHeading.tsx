import type { ReactNode } from 'react'

/**
 * 페이지 헤더 규칙 — 큼직한 제목 + 브랜드 액센트 바.
 * accent로 서비스별 포인트색 지정 (기본 orange).
 */
export default function PageHeading({
  title,
  accent = 'orange',
  children,
}: {
  title: ReactNode
  accent?: 'orange' | 'teal' | 'yellow'
  children?: ReactNode
}) {
  const bar =
    accent === 'teal' ? 'bg-teal' : accent === 'yellow' ? 'bg-yellow' : 'bg-orange'
  return (
    <div>
      <h1 className="text-[22px] font-black leading-tight text-ink">{title}</h1>
      <span className={`mt-2 block h-1.5 w-12 rounded-full ${bar}`} />
      {children}
    </div>
  )
}
