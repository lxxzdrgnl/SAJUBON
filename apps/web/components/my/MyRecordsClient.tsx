'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ApiClient } from '@sajuguri/api-client'
import BrutalCard from '@/components/ui/BrutalCard'
import { RECORD_TYPES, type RecordItem, type RecordType, type Translate } from '@/lib/records/registry'

interface Props {
  /** 타입 key → 레코드 목록 (서버에서 레지스트리 fetch로 채워 전달) */
  records: Record<string, RecordItem[]>
  /** 대표 프로필 이름 — 그룹핑 시 맨 위로 (현재 섹션 프리뷰에선 미사용, 호환용) */
  repProfileName?: string | null
  /** 섹션당 미리보기 카드 수 */
  previewCount?: number
}

const PREVIEW_COUNT = 3

// ── 편집 토글 버튼 ─────────────────────────────────────────────────────────────

function EditToggleButton({ editMode, onToggle, t }: { editMode: boolean; onToggle: () => void; t: Translate }) {
  return (
    <button
      type="button"
      className="rounded-xl border-2 border-ink bg-surface px-3 py-1 text-[12px] font-extrabold text-ink shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
      onClick={onToggle}
    >
      {editMode ? t('editDone') : t('editToggle')}
    </button>
  )
}

// ── 삭제 확인 모달 ─────────────────────────────────────────────────────────────

interface DeleteModalProps {
  label: string
  onConfirm: () => void
  onClose: () => void
  t: Translate
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    </button>
  )
}

// ── 빈 상태 ────────────────────────────────────────────────────────────────────

function EmptyState({ message, ctaHref, ctaLabel }: { message: string; ctaHref: string; ctaLabel: string }) {
  return (
    <BrutalCard intensity="soft" className="flex flex-col gap-2 py-5 text-center">
      <p className="text-[13px] text-text-sub">{message}</p>
      <Link href={ctaHref} className="mx-auto text-[13px] font-extrabold text-orange underline underline-offset-2">
        {ctaLabel}
      </Link>
    </BrutalCard>
  )
}

// ── 카드 행 (카드 + 편집 시 삭제) ──────────────────────────────────────────────

function CardRow({
  type,
  item,
  editMode,
  onDelete,
  t,
}: {
  type: RecordType
  item: RecordItem
  editMode: boolean
  onDelete: () => void
  t: Translate
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">{type.renderCard(item, t)}</div>
      {editMode && type.remove && <DeleteIconButton label={t('delete.confirm')} onClick={onDelete} />}
    </div>
  )
}

// ── 종류별 섹션 미리보기 ────────────────────────────────────────────────────────

function TypeSection({
  type,
  items,
  editMode,
  previewCount,
  onDelete,
  t,
}: {
  type: RecordType
  items: RecordItem[]
  editMode: boolean
  previewCount: number
  onDelete: (type: RecordType, item: RecordItem) => void
  t: Translate
}) {
  const label = type.label(t)
  const preview = items.slice(0, previewCount)

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-extrabold text-ink">
          {label}
          {items.length > 0 && <span className="ml-1.5 text-[12px] text-text-sub">{items.length}</span>}
        </h3>
        {items.length > previewCount && (
          <Link
            href={{ pathname: '/my/history', query: { type: type.key } }}
            className="text-[12px] font-extrabold text-orange transition-opacity hover:opacity-80"
          >
            {t('viewAllHistory')} →
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState message={type.empty.message(t)} ctaHref={type.empty.ctaHref} ctaLabel={type.empty.ctaLabel(t)} />
      ) : (
        <ul className="flex flex-col gap-2">
          {preview.map((item) => (
            <li key={item.id}>
              <CardRow type={type} item={item} editMode={editMode} onDelete={() => onDelete(type, item)} t={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── 메인 ───────────────────────────────────────────────────────────────────────

interface Pending {
  type: RecordType
  item: RecordItem
  label: string
}

export default function MyRecordsClient({ records: initial, previewCount = PREVIEW_COUNT }: Props) {
  const t = useTranslations('my.records') as unknown as Translate
  const [records, setRecords] = useState(initial)
  const [editMode, setEditMode] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)

  const totalCount = useMemo(
    () => Object.values(records).reduce((sum, list) => sum + list.length, 0),
    [records],
  )

  function requestDelete(type: RecordType, item: RecordItem) {
    if (!type.remove) return
    setPending({ type, item, label: type.remove.label(item) })
  }

  async function confirmDelete() {
    if (!pending) return
    const { type, item } = pending
    setPending(null)
    if (!type.remove) return
    const prev = records[type.key] ?? []
    setRecords((r) => ({ ...r, [type.key]: prev.filter((x) => x.id !== item.id) }))
    try {
      await type.remove.fn(new ApiClient(''), item.id)
    } catch {
      setRecords((r) => ({ ...r, [type.key]: prev }))
    }
  }

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-text-sub">{t('title')}</h2>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <EditToggleButton editMode={editMode} onToggle={() => setEditMode((v) => !v)} t={t} />
          )}
          {totalCount > 0 && (
            <Link href="/my/history" className="text-[12px] font-extrabold text-orange transition-opacity hover:opacity-80">
              {t('viewAllHistory')} →
            </Link>
          )}
        </div>
      </div>

      {RECORD_TYPES.map((type) => (
        <TypeSection
          key={type.key}
          type={type}
          items={records[type.key] ?? []}
          editMode={editMode}
          previewCount={previewCount}
          onDelete={requestDelete}
          t={t}
        />
      ))}

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
