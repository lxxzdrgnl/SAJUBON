'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { ApiClient, shareConsultation } from '@sajuguri/api-client'
import type {
  ReportSummary,
  DailyRecordSummary,
  ConsultationHistoryItem,
  CompatibilityReportSummary,
} from '@sajuguri/api-client'
import BrutalCard from '@/components/ui/BrutalCard'
import type { Translate } from './registry'

function CardShell({ children }: { children: ReactNode }) {
  return (
    <BrutalCard intensity="soft" className="flex flex-col gap-1 hover:border-border-soft">
      {children}
    </BrutalCard>
  )
}

export function SajuCard({ r, t }: { r: ReportSummary; t: Translate }) {
  return (
    <Link href={`/report/${r.id}`} className="block min-w-0">
      <CardShell>
        <p className="truncate text-[14px] font-extrabold leading-snug text-ink">{r.first_headline}</p>
        <p className="text-[12px] text-text-sub">
          {new Date(r.created_at).toLocaleDateString('ko-KR')}
          {r.request_topics && <span className="ml-1">· {r.request_topics}</span>}
        </p>
      </CardShell>
    </Link>
  )
}

export function FortuneCard({ f, t }: { f: DailyRecordSummary; t: Translate }) {
  return (
    <Link href={`/fortune?record=${f.id}`} className="block min-w-0">
      <CardShell>
        <p className="truncate text-[14px] font-extrabold leading-snug text-ink">{f.keyword}</p>
        <p className="text-[12px] text-text-sub">{new Date(f.date).toLocaleDateString('ko-KR')}</p>
      </CardShell>
    </Link>
  )
}

export function ConsultationCard({ c, t }: { c: ConsultationHistoryItem; t: Translate }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  // 상담은 공유 페이지로 연다. 토큰 없으면 먼저 발급한 뒤 이동.
  async function open() {
    if (busy) return
    let token = c.share_token
    if (!token) {
      setBusy(true)
      try {
        const res = await shareConsultation(new ApiClient(''), c.id)
        token = res.share_token
      } catch {
        setBusy(false)
        return
      }
      setBusy(false)
    }
    router.push(`/share/question/${token}`)
  }

  return (
    <button type="button" onClick={open} disabled={busy} className="block w-full min-w-0 text-left disabled:opacity-60">
      <CardShell>
        <p className="truncate text-[14px] font-extrabold leading-snug text-ink">{c.headline}</p>
        <p className="truncate text-[12px] text-text-sub">{c.question}</p>
        <p className="text-[12px] text-text-sub">{new Date(c.created_at).toLocaleDateString('ko-KR')}</p>
      </CardShell>
    </button>
  )
}

export function CompatibilityCard({ r, t }: { r: CompatibilityReportSummary; t: Translate }) {
  const nameA = r.person_a_name || t('compatAnon')
  const nameB = r.person_b_name || t('compatAnon')
  return (
    <Link href={`/compatibility/${r.id}`} className="block min-w-0">
      <CardShell>
        <p className="truncate text-[14px] font-extrabold leading-snug text-ink">
          {nameA} <span className="text-orange">♥</span> {nameB}
          <span className="ml-1 text-text-sub">· {r.total_score}</span>
        </p>
        <p className="text-[12px] text-text-sub">
          {new Date(r.created_at).toLocaleDateString('ko-KR')}
          {r.request_topics && <span className="ml-1">· {r.request_topics}</span>}
        </p>
      </CardShell>
    </Link>
  )
}
