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
import type { Translate } from './registry'

// ── 타입 뱃지 ──────────────────────────────────────────────────────────────────

function TypeBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-block shrink-0 self-start rounded-full border-[1.5px] border-ink px-2 py-0.5 text-[10px] font-extrabold ${tone}`}>
      {label}
    </span>
  )
}

// ── 카드 셸 (브루탈 잉크 테두리, 회색 금지) ──────────────────────────────────────

function CardShell({ badge, children }: { badge: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border-2 border-ink bg-surface px-4 py-3 shadow-[3px_3px_0_#1A1A1A] transition-opacity hover:opacity-80">
      {badge}
      {children}
    </div>
  )
}

export function SajuCard({ r, t }: { r: ReportSummary; t: Translate }) {
  return (
    <Link href={`/report/${r.id}`} className="block min-w-0">
      <CardShell badge={<TypeBadge label={t('tabReports')} tone="bg-orange text-white" />}>
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
  // "이용재 오늘의 운세" 형태로 표시 (키워드만 단독 표시는 무엇인지 알기 어려움)
  const title = f.profile_name ? `${f.profile_name} ${t('fortuneCardTitle')}` : t('fortuneCardTitle')
  return (
    <Link href={`/fortune?record=${f.id}`} className="block min-w-0">
      <CardShell badge={<TypeBadge label={t('tabFortune')} tone="bg-yellow text-ink" />}>
        <p className="truncate text-[14px] font-extrabold leading-snug text-ink">{title}</p>
        <p className="text-[12px] text-text-sub">
          {new Date(f.date).toLocaleDateString('ko-KR')}
          {f.keyword && <span className="ml-1">· {f.keyword}</span>}
        </p>
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
      <CardShell badge={<TypeBadge label={t('tabQuestion')} tone="bg-teal text-white" />}>
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
      <CardShell badge={<TypeBadge label={t('tabCompatibility')} tone="bg-sky text-white" />}>
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
