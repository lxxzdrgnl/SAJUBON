'use client'

/**
 * 챗 인라인 네비게이션 CTA.
 * 특정 툴 결과 직후 렌더되며, 클릭 시 기존 기능 페이지(href)로 이동한다.
 * (사주 풀 리포트 / 운세 등)
 */
import { useRouter } from 'next/navigation'

interface Props {
  title: string
  buttonLabel: string
  href: string
}

export default function ChatNavCTA({ title, buttonLabel, href }: Props) {
  const router = useRouter()

  return (
    <div className="rounded-2xl border-2 border-ink bg-teal-tint p-3 shadow-[2px_2px_0_#1A1A1A]">
      <p className="mb-2.5 text-[13px] font-extrabold text-ink leading-snug">
        {title}
      </p>
      <button
        className="w-full rounded-xl border-2 border-ink bg-ink py-2 text-sm font-extrabold text-surface shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
        onClick={() => router.push(href)}
      >
        {buttonLabel}
      </button>
    </div>
  )
}
