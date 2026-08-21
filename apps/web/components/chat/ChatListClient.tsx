'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ApiClient, deleteSession } from '@sajuguri/api-client'
import type { ChatSession, ProfileResponse } from '@sajuguri/api-client'
import BrutalCard from '@/components/ui/BrutalCard'
import ChatEntrySheet from './ChatEntrySheet'
import PageHeading from '@/components/ui/PageHeading'

interface Props {
  sessions: ChatSession[]
  profiles: ProfileResponse[]
}

const SESSION_COLORS = ['var(--orange)', 'var(--yellow)', 'var(--sky)', 'var(--teal)']

function sessionColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return SESSION_COLORS[hash % SESSION_COLORS.length]
}

function formatDate(dt: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(dt))
}

interface DeleteModalProps {
  sessionTitle: string
  onConfirm: () => void
  onClose: () => void
  t: ReturnType<typeof useTranslations>
}

function DeleteModal({ sessionTitle, onConfirm, onClose, t }: DeleteModalProps) {
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
      <div className="w-full max-w-[480px] rounded-t-3xl border-2 border-ink bg-surface p-6 shadow-brutal-up sm:rounded-lg sm:shadow-brutal">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-ink">{t('deleteConfirm')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-border-soft text-text-sub"
            aria-label={t('deleteConfirmCancel')}
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="mb-6 truncate rounded-lg border-[1.5px] border-border-soft bg-surface px-4 py-3 text-[14px] font-bold text-ink">
          {sessionTitle}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border-2 border-ink bg-surface py-3 text-sm font-extrabold text-ink shadow-brutal-sm transition-opacity hover:opacity-80"
          >
            {t('deleteConfirmCancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg border-2 border-ink bg-ink py-3 text-sm font-extrabold text-surface shadow-brutal-sm transition-opacity hover:opacity-80"
          >
            {t('deleteConfirmYes')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ChatListClient({ sessions: initialSessions, profiles }: Props) {
  const t = useTranslations('chat')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sessions, setSessions] = useState(initialSessions)
  const [deletingSession, setDeletingSession] = useState<ChatSession | null>(null)
  const [editMode, setEditMode] = useState(false)

  async function handleDelete(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setDeletingSession(null)
    try {
      const api = new ApiClient('')
      await deleteSession(api, id)
    } catch {
      // 실패 시 롤백
      setSessions(initialSessions)
    }
  }

  return (
    <>
      <div className="mb-4 flex items-start justify-between">
        <PageHeading title={t('title')} accent="teal" />
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <button
              className="rounded-lg border-2 border-ink bg-surface px-3 py-1.5 text-sm font-extrabold text-ink shadow-brutal-sm transition-opacity hover:opacity-80"
              onClick={() => setEditMode((v) => !v)}
            >
              {editMode ? t('editDone') : t('editToggle')}
            </button>
          )}
          <button
            className="rounded-lg border-2 border-teal bg-surface px-4 py-1.5 text-sm font-extrabold text-teal shadow-brutal-sm transition-opacity hover:opacity-80"
            onClick={() => setSheetOpen(true)}
          >
            {t('newSession')}
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <BrutalCard className="flex flex-col items-center gap-3 py-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.svg" alt="" width={64} height={64} />
          <p className="text-[15px] font-extrabold">{t('empty')}</p>
          <p className="text-sm text-text-sub">{t('emptyHint')}</p>
          <button
            className="mt-1 rounded-lg border-2 border-teal bg-surface px-6 py-2.5 text-sm font-extrabold text-teal shadow-brutal transition-opacity hover:opacity-80"
            onClick={() => setSheetOpen(true)}
          >
            {t('newSession')}
          </button>
        </BrutalCard>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <div className="flex items-center gap-2">
                <Link href={`/chat/${s.id}`} className="min-w-0 flex-1">
                  <BrutalCard className="flex items-center gap-3 transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink"
                      style={{ backgroundColor: sessionColor(s.id) }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 6 a3 3 0 0 1 3-3 h10 a3 3 0 0 1 3 3 v7 a3 3 0 0 1-3 3 H10 l-4.5 4 v-4 H7 a3 3 0 0 1-3-3 Z" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ink">
                      {s.title || t('sessionFallback')}
                    </span>
                    <span className="ml-2 shrink-0 text-xs font-semibold text-text-sub">
                      {formatDate(s.last_message_at)}
                    </span>
                  </BrutalCard>
                </Link>
                {editMode && (
                  <button
                    className="shrink-0 rounded-lg border-2 border-ink bg-surface p-2 shadow-brutal-sm transition-opacity hover:opacity-70"
                    onClick={() => setDeletingSession(s)}
                    aria-label={t('deleteConfirm')}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ChatEntrySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles}
      />

      {deletingSession && (
        <DeleteModal
          sessionTitle={deletingSession.title || t('sessionFallback')}
          onConfirm={() => handleDelete(deletingSession.id)}
          onClose={() => setDeletingSession(null)}
          t={t}
        />
      )}
    </>
  )
}
