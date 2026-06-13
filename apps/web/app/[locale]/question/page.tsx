'use client'

/**
 * /question — 한줄 상담 페이지.
 * 흐름: 만세력 선택 모달(시트) → 질문 입력 → POST /api/question → 결과 카드.
 * - 진입 시 시트 자동 오픈 (미선택 상태)
 * - 선택 완료 후 질문 입력 textarea + 제출 노출
 * - 선택된 만세력 카드에서 "다시 선택" 버튼으로 시트 재오픈
 */
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ProfileResponse, QuestionRequest, ToolChartItem } from '@sajuguri/api-client'
import { askQuestion, shareConsultation } from '@sajuguri/api-client'
import { api } from '@/lib/api'
import MascotTinted from '@/components/ui/MascotTinted'
import MansePickerSheet, { type MansePick } from '@/components/manse/MansePickerSheet'
import ToolCard from '@/components/chat/ToolCard'
import Markdown from '@/components/ui/Markdown'

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function QuestionPage() {
  const t = useTranslations('question')
  const tToolCard = useTranslations('chat.toolCard')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedInput, setSelectedInput] = useState<MansePick | null>(null)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ id: number; headline: string; content: string; category: string; charts?: ToolChartItem[]; more?: ToolChartItem[] } | null>(null)
  const [openMore, setOpenMore] = useState<Set<number>>(new Set())
  const [sharing, setSharing] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  // 프로필 목록 — 클라이언트에서 로드 (SSR 없음, 게스트 허용 페이지)
  const [profiles, setProfiles] = useState<ProfileResponse[]>([])

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((user) => {
        if (!user) return
        return fetch('/api/profiles', { credentials: 'include' })
          .then((r) => r.ok ? r.json() : [])
          .then(setProfiles)
      })
      .catch(() => {})
  }, [])

  // 진입 시 만세력 미선택이면 시트 자동 오픈
  useEffect(() => {
    if (!selectedInput) {
      setSheetOpen(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePick(pick: MansePick) {
    setSelectedInput(pick)
    setSelectedLabel(pick.name)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedInput) {
      setSheetOpen(true)
      return
    }
    const q = question.trim()
    if (q.length < 10) {
      setError(t('errorQuestionShort'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const body: QuestionRequest = {
        birth_date: selectedInput.birth_date,
        birth_time: selectedInput.birth_time,
        gender: selectedInput.gender,
        calendar: selectedInput.calendar,
        is_leap_month: selectedInput.is_leap_month,
        ...(selectedInput.birth_longitude != null
          ? { birth_longitude: selectedInput.birth_longitude }
          : {}),
        name: selectedInput.name || undefined,
        question: q,
      }
      const res = await askQuestion(api, body)
      setResult(res)
    } catch {
      setError(t('errorFallback'))
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!result || sharing) return
    setSharing(true)
    setShareMsg('')
    try {
      const { share_url } = await shareConsultation(api, result.id)
      if (navigator.share) {
        await navigator.share({ title: result.headline, url: share_url })
      } else {
        await navigator.clipboard.writeText(share_url)
        setShareMsg(t('shareCopied'))
      }
    } catch {
      setShareMsg(t('shareFailed'))
    } finally {
      setSharing(false)
    }
  }

  function toggleMore(idx: number) {
    setOpenMore((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  // 결과 화면
  if (result) {
    const charts = result.charts ?? []
    const more = result.more ?? []
    const hasChartArea = charts.length > 0 || more.length > 0

    return (
      <main className="flex flex-col gap-5">
        <h1 className="text-lg font-black">{t('title')}</h1>

        <div className="rounded-2xl border-2 border-ink bg-surface p-5 shadow-[4px_4px_0_#1A1A1A]">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-text-sub">
            {t('resultLabel')}
          </p>
          <p className="mb-2 text-[18px] font-black leading-snug text-ink">{result.headline}</p>
          <Markdown className="text-[14px] text-ink">{result.content}</Markdown>
          <span className="mt-4 inline-block rounded-full border-[1.5px] border-ink bg-orange px-3 py-0.5 text-[11px] font-extrabold text-white">
            {result.category}
          </span>
        </div>

        {hasChartArea && (
          <div className="flex flex-col gap-3">
            {charts.map((item, i) => (
              <ToolCard key={i} tool={item.tool} payload={item.payload} />
            ))}

            {more.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {more.map((item, i) => {
                    const isOpen = openMore.has(i)
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleMore(i)}
                        className={`rounded-full border-2 px-3 py-1 text-[12px] font-extrabold transition-colors ${
                          isOpen
                            ? 'border-teal bg-teal-tint text-teal-deep'
                            : 'border-border-soft bg-surface text-text-sub hover:border-ink hover:text-ink'
                        }`}
                      >
                        {tToolCard.has(`labels.${item.tool}`) ? tToolCard(`labels.${item.tool}`) : item.tool}
                      </button>
                    )
                  })}
                </div>
                {more.map((item, i) =>
                  openMore.has(i) ? (
                    <ToolCard key={i} tool={item.tool} payload={item.payload} />
                  ) : null
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="w-full rounded-xl border-2 border-ink bg-teal py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_#1A1A1A] transition-opacity disabled:opacity-60 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1A1A1A]"
          >
            {sharing ? t('sharing') : t('share')}
          </button>
          {shareMsg && (
            <p className="text-center text-[12px] font-bold text-text-sub">{shareMsg}</p>
          )}
          <button
            className="w-full rounded-xl border-2 border-ink bg-yellow py-3 text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1A1A1A]"
            onClick={() => { setResult(null); setQuestion(''); setOpenMore(new Set()); setShareMsg('') }}
          >
            {t('askAgain')}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-5">
      <h1 className="text-lg font-black">{t('title')}</h1>
      <p className="text-[13px] text-text-sub">{t('desc')}</p>

      <MansePickerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles}
        title={t('pickSheet.title')}
        onPick={handlePick}
      />

      {/* 선택된 만세력 카드 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-extrabold">{t('birthLabel')}</p>
        {selectedInput ? (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#1A1A1A]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface overflow-hidden">
              <MascotTinted stem={selectedInput.day_stem ?? null} width={38} height={38} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-extrabold">{selectedLabel}</span>
              <span className="block text-xs text-text-sub">{selectedInput.birth_date}</span>
            </span>
            <button
              type="button"
              className="shrink-0 rounded-lg border-[1.5px] border-border-soft px-3 py-1.5 text-[12px] font-extrabold text-text-sub hover:border-ink hover:text-ink transition-colors"
              onClick={() => setSheetOpen(true)}
            >
              {t('changeBirth')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-yellow p-4 text-left shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80"
            onClick={() => setSheetOpen(true)}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface text-lg font-extrabold">
              +
            </span>
            <span className="text-[14px] font-extrabold">{t('selectBirth')}</span>
          </button>
        )}
      </div>

      {/* 질문 입력 — 만세력 선택 후에만 활성 */}
      {selectedInput && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="question" className="text-[13px] font-extrabold">
              {t('questionLabel')}
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('questionPlaceholder')}
              className="w-full resize-none rounded-xl border-2 border-ink bg-surface px-4 py-3 text-sm leading-relaxed outline-none shadow-[4px_4px_0_#1A1A1A]"
              rows={3}
              minLength={10}
              maxLength={200}
            />
            <p className="text-right text-[11px] text-text-sub">{question.length}/200</p>
          </div>

          {error && (
            <p className="rounded-xl border-[1.5px] border-orange bg-orange-tint px-4 py-3 text-[13px] font-bold text-orange">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border-2 border-ink bg-orange py-3.5 text-sm font-extrabold text-white shadow-[4px_4px_0_#1A1A1A] transition-opacity disabled:opacity-60 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1A1A1A]"
          >
            {loading ? t('submitting') : t('submit')}
          </button>
        </form>
      )}
    </main>
  )
}
