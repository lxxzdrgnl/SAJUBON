'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ApiClient, deleteReport, deleteDailyRecord } from '@sajuguri/api-client'
import type { ReportSummary, DailyRecordSummary } from '@sajuguri/api-client'
import BrutalCard from '@/components/ui/BrutalCard'

interface Props {
  reports: ReportSummary[]
  fortuneRecords: DailyRecordSummary[]
  /** 대표 프로필 이름 — 더보기 그룹핑 시 맨 위로 올린다. */
  repProfileName: string | null
  /**
   * 탭당 표시할 최대 항목 수.
   * undefined = 전체 표시 (history 페이지용).
   * 기본값 3 (마이 페이지 프리뷰).
   */
  limit?: number
}

type Tab = 'reports' | 'fortune'

const PREVIEW_COUNT = 3

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ── 삭제 확인 모달 (ChatListClient DeleteModal 톤 재사용) ──────────────────────

interface DeleteModalProps {
  label: string
  onConfirm: () => void
  onClose: () => void
  t: ReturnType<typeof useTranslations>
}

function DeleteModal({ label, onConfirm, onClose, t }: DeleteModalProps) {
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = original
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[480px] rounded-t-3xl border-2 border-ink bg-surface p-6 shadow-[0_-4px_0_#1A1A1A] sm:rounded-3xl sm:shadow-[4px_4px_0_#1A1A1A]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-ink">{t('delete.confirm')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-border-soft text-text-sub"
            aria-label={t('delete.cancel')}
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="mb-6 truncate rounded-xl border-[1.5px] border-border-soft bg-surface px-4 py-3 text-[14px] font-bold text-ink">
          {label}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-ink bg-surface py-3 text-sm font-extrabold text-ink shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
          >
            {t('delete.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl border-2 border-ink bg-ink py-3 text-sm font-extrabold text-surface shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
          >
            {t('delete.yes')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 삭제 버튼 (휴지통 아이콘) ──────────────────────────────────────────────────

function DeleteIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="shrink-0 rounded-xl border-2 border-ink bg-surface p-2 shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-70"
      onClick={onClick}
      aria-label={label}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink"
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    </button>
  )
}

// ── 프로필별 그룹핑 ────────────────────────────────────────────────────────────

interface Group<T> {
  profileName: string
  items: T[]
}

function groupByProfile<T extends { profile_name: string }>(
  items: T[],
  repProfileName: string | null,
): Group<T>[] {
  const order: string[] = []
  const map = new Map<string, T[]>()
  for (const it of items) {
    const key = it.profile_name || ''
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key)!.push(it)
  }
  // 대표 프로필 그룹을 맨 위로
  if (repProfileName && map.has(repProfileName)) {
    const idx = order.indexOf(repProfileName)
    if (idx > 0) {
      order.splice(idx, 1)
      order.unshift(repProfileName)
    }
  }
  return order.map((name) => ({ profileName: name, items: map.get(name)! }))
}

// ── 메인 ───────────────────────────────────────────────────────────────────────

type Pending =
  | { kind: 'report'; id: number; label: string }
  | { kind: 'fortune'; id: number; label: string }

export default function MyRecordsClient({
  reports: initialReports,
  fortuneRecords: initialFortune,
  repProfileName,
  limit = PREVIEW_COUNT,
}: Props) {
  const t = useTranslations('my.records')
  const [tab, setTab] = useState<Tab>('reports')
  const [reports, setReports] = useState(initialReports)
  const [fortune, setFortune] = useState(initialFortune)
  const [pending, setPending] = useState<Pending | null>(null)

  const reportGroups = useMemo(
    () => groupByProfile(reports, repProfileName),
    [reports, repProfileName],
  )
  const fortuneGroups = useMemo(
    () => groupByProfile(fortune, repProfileName),
    [fortune, repProfileName],
  )

  async function confirmDelete() {
    if (!pending) return
    const target = pending
    setPending(null)
    if (target.kind === 'report') {
      const prev = reports
      setReports((rs) => rs.filter((r) => r.id !== target.id))
      try {
        await deleteReport(new ApiClient(''), target.id)
      } catch {
        setReports(prev)
      }
    } else {
      const prev = fortune
      setFortune((fs) => fs.filter((f) => f.id !== target.id))
      try {
        await deleteDailyRecord(new ApiClient(''), target.id)
      } catch {
        setFortune(prev)
      }
    }
  }

  const activeList = tab === 'reports' ? reports : fortune
  // limit undefined = 전체; 숫자면 슬라이스
  const isLimited = limit !== undefined && limit < activeList.length
  const hasMore = isLimited

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide text-text-sub">
        {t('title')}
      </h2>

      {/* 탭 */}
      <div className="mb-3 flex gap-2">
        <TabButton active={tab === 'reports'} onClick={() => setTab('reports')}>
          {t('tabReports')}
        </TabButton>
        <TabButton active={tab === 'fortune'} onClick={() => setTab('fortune')}>
          {t('tabFortune')}
        </TabButton>
      </div>

      {/* 본문 */}
      {tab === 'reports'
        ? (
            reports.length === 0
              ? <EmptyState message={t('emptyReports')} ctaHref="/manse" ctaLabel={t('goReport')} ctaTone="orange" />
              : limit !== undefined
                ? <PreviewReports items={reports.slice(0, limit)} onDelete={(r) => setPending({ kind: 'report', id: r.id, label: r.first_headline })} t={t} />
                : <GroupedReports groups={reportGroups} onDelete={(r) => setPending({ kind: 'report', id: r.id, label: r.first_headline })} t={t} />
          )
        : (
            fortune.length === 0
              ? <EmptyState message={t('emptyFortune')} ctaHref="/" ctaLabel={t('goFortune')} ctaTone="teal" />
              : limit !== undefined
                ? <PreviewFortune items={fortune.slice(0, limit)} onDelete={(f) => setPending({ kind: 'fortune', id: f.id, label: f.keyword })} t={t} />
                : <GroupedFortune groups={fortuneGroups} onDelete={(f) => setPending({ kind: 'fortune', id: f.id, label: f.keyword })} t={t} />
          )}

      {/* 더보기 → /my/history 링크 */}
      {activeList.length > 0 && hasMore && (
        <Link
          href="/my/history"
          className="mt-2 block w-full rounded-xl border-2 border-ink bg-surface py-2.5 text-center text-[13px] font-extrabold text-orange shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
        >
          {t('viewAllHistory')}
        </Link>
      )}

      {pending && (
        <DeleteModal
          label={pending.label}
          onConfirm={confirmDelete}
          onClose={() => setPending(null)}
          t={t}
        />
      )}
    </section>
  )
}

// ── 하위 프레젠테이션 ──────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex-1 rounded-xl border-2 border-ink py-2 text-[13px] font-extrabold shadow-[2px_2px_0_#1A1A1A] transition-opacity ' +
        (active ? 'bg-yellow text-ink' : 'bg-surface text-text-sub hover:opacity-80')
      }
    >
      {children}
    </button>
  )
}

function EmptyState({ message, ctaHref, ctaLabel, ctaTone }: { message: string; ctaHref: string; ctaLabel: string; ctaTone: 'orange' | 'teal' }) {
  return (
    <BrutalCard intensity="soft" className="flex flex-col gap-2 py-5 text-center">
      <p className="text-[13px] text-text-sub">{message}</p>
      <Link
        href={ctaHref}
        className={`mx-auto text-[13px] font-extrabold underline underline-offset-2 ${ctaTone === 'orange' ? 'text-orange' : 'text-teal'}`}
      >
        {ctaLabel}
      </Link>
    </BrutalCard>
  )
}

function ReportRow({ r, onDelete, t }: { r: ReportSummary; onDelete: () => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={`/report/${r.id}`} className="min-w-0 flex-1">
        <BrutalCard intensity="soft" className="flex flex-col gap-1 hover:border-border-soft">
          <p className="truncate text-[14px] font-extrabold leading-snug text-ink">{r.first_headline}</p>
          <p className="text-[12px] text-text-sub">
            {new Date(r.created_at).toLocaleDateString('ko-KR')}
            {r.request_topics && <span className="ml-1">· {r.request_topics}</span>}
          </p>
        </BrutalCard>
      </Link>
      <DeleteIconButton label={t('delete.confirm')} onClick={onDelete} />
    </div>
  )
}

function FortuneRow({ f, onDelete, t }: { f: DailyRecordSummary; onDelete: () => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={`/fortune?record=${f.id}`} className="min-w-0 flex-1">
        <BrutalCard intensity="soft" className="flex flex-col gap-1 hover:border-border-soft">
          <p className="truncate text-[14px] font-extrabold leading-snug text-ink">{f.keyword}</p>
          <p className="text-[12px] text-text-sub">{new Date(f.date).toLocaleDateString('ko-KR')}</p>
        </BrutalCard>
      </Link>
      <DeleteIconButton label={t('delete.confirm')} onClick={onDelete} />
    </div>
  )
}

function PreviewReports({ items, onDelete, t }: { items: ReportSummary[]; onDelete: (r: ReportSummary) => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((r) => (
        <li key={r.id}><ReportRow r={r} onDelete={() => onDelete(r)} t={t} /></li>
      ))}
    </ul>
  )
}

function PreviewFortune({ items, onDelete, t }: { items: DailyRecordSummary[]; onDelete: (f: DailyRecordSummary) => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((f) => (
        <li key={f.id}><FortuneRow f={f} onDelete={() => onDelete(f)} t={t} /></li>
      ))}
    </ul>
  )
}

function GroupHeader({ name }: { name: string }) {
  return (
    <p className="mb-1.5 mt-3 text-[12px] font-extrabold text-teal first:mt-0">
      {name || '—'}
    </p>
  )
}

function GroupedReports({ groups, onDelete, t }: { groups: Group<ReportSummary>[]; onDelete: (r: ReportSummary) => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col">
      {groups.map((g) => (
        <div key={g.profileName || '—'}>
          <GroupHeader name={g.profileName} />
          <ul className="flex flex-col gap-2">
            {g.items.map((r) => (
              <li key={r.id}><ReportRow r={r} onDelete={() => onDelete(r)} t={t} /></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function GroupedFortune({ groups, onDelete, t }: { groups: Group<DailyRecordSummary>[]; onDelete: (f: DailyRecordSummary) => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col">
      {groups.map((g) => (
        <div key={g.profileName || '—'}>
          <GroupHeader name={g.profileName} />
          <ul className="flex flex-col gap-2">
            {g.items.map((f) => (
              <li key={f.id}><FortuneRow f={f} onDelete={() => onDelete(f)} t={t} /></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
