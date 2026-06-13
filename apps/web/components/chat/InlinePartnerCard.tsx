'use client'

/**
 * 인라인 상대 만세력 선택/입력 카드 (B5).
 * `request_partner` SSE 이벤트 수신 시 대화 흐름 내에 표시.
 * mode: 'collapsed' → 'list' (저장 목록) 전환.
 * 직접 입력은 바텀시트(BirthInputForm 전체 폼)로 표시.
 */
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { ProfileResponse, PartnerAttachRequest } from '@sajuguri/api-client'
import type { RecentBirthInput } from '@sajuguri/core'
import { loadRecentInputs } from '@sajuguri/core'
import { webStorage } from '@/lib/storage'
import BirthInputForm, { type ManseBirthInput } from '@/components/manse/BirthInputForm'

interface Props {
  profiles: ProfileResponse[]
  onSelect: (p: ProfileResponse) => void
  onSubmitBirth: (body: PartnerAttachRequest) => Promise<void>
}

type Mode = 'collapsed' | 'list'

export default function InlinePartnerCard({ profiles, onSelect, onSubmitBirth }: Props) {
  const t = useTranslations('chat')
  const [mode, setMode] = useState<Mode>('collapsed')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [recentInputs, setRecentInputs] = useState<RecentBirthInput[]>([])

  // 목록 모드 진입 시 최근 본 만세력 로드
  useEffect(() => {
    if (mode === 'list') {
      loadRecentInputs(webStorage).then(setRecentInputs)
    }
  }, [mode])

  // 저장된 만세력과 중복되는 최근 입력은 숨김 (ChatEntrySheet filteredRecent와 동일 패턴)
  const savedKeys = new Set(
    profiles.map((p) => `${p.birth_date}|${p.birth_time ?? ''}|${p.gender}`),
  )
  const filteredRecent = recentInputs.filter(
    (r) => !savedKeys.has(`${r.birth_date}|${r.birth_time ?? ''}|${r.gender}`),
  )

  async function handleFormSubmit(input: ManseBirthInput) {
    setSubmitting(true)
    setFormError(null)
    try {
      const body: PartnerAttachRequest = {
        birth_date: input.birth_date,
        gender: input.gender,
        calendar: input.calendar,
        is_leap_month: input.is_leap_month,
        ...(input.birth_time ? { birth_time: input.birth_time } : {}),
        ...(input.name ? { name: input.name } : {}),
      }
      await onSubmitBirth(body)
      setSheetOpen(false)
    } catch {
      setFormError(t('inlinePartner.errorSubmit'))
    } finally {
      setSubmitting(false)
    }
  }

  // 최근 본 만세력 선택 → 생년월일 정보를 PartnerAttachRequest로 매핑해 첨부
  async function handleRecentSelect(r: RecentBirthInput) {
    setSubmitting(true)
    setFormError(null)
    try {
      await onSubmitBirth({
        birth_date: r.birth_date,
        gender: r.gender,
        calendar: r.calendar ?? 'solar',
        is_leap_month: r.is_leap_month ?? false,
        ...(r.name?.trim() ? { name: r.name.trim() } : {}),
        ...(r.birth_time ? { birth_time: r.birth_time } : {}),
      })
    } catch {
      setFormError(t('inlinePartner.errorSubmit'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="w-full rounded-2xl border-2 border-orange bg-yellow-tint px-3 py-3">
        <p className="mb-2 text-[13px] font-extrabold text-ink">{t('inlinePartner.prompt')}</p>

        {mode === 'collapsed' && (
          <button
            className="rounded-xl border-2 border-ink bg-yellow px-4 py-2 text-[13px] font-extrabold shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
            onClick={() => setMode('list')}
          >
            {t('inlinePartner.action')}
          </button>
        )}

        {mode === 'list' && (
          <div className="flex flex-col gap-1.5">
            {profiles.map((p) => (
              <button
                key={p.id}
                className="flex w-full items-center gap-2 rounded-xl border-2 border-ink bg-surface p-2.5 text-left shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80 disabled:opacity-50"
                disabled={submitting}
                onClick={() => onSelect(p)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink bg-yellow text-xs font-extrabold">
                  {p.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-extrabold">{p.name}</span>
                  <span className="block text-[11px] text-text-sub">{p.birth_date}</span>
                </span>
              </button>
            ))}

            {/* 최근 본 만세력 */}
            {filteredRecent.length > 0 && (
              <>
                <p className="mt-1 px-0.5 text-[10px] font-extrabold uppercase tracking-widest text-text-sub">
                  {t('pickSheet.recentTitle')}
                </p>
                {filteredRecent.map((r) => (
                  <button
                    key={`${r.birth_date}|${r.birth_time ?? ''}|${r.gender}`}
                    className="flex w-full items-center gap-2 rounded-xl border-[1.5px] border-border-soft bg-surface p-2.5 text-left transition-all hover:border-ink hover:shadow-[2px_2px_0_#1A1A1A] disabled:opacity-50"
                    disabled={submitting}
                    onClick={() => handleRecentSelect(r)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink bg-yellow-tint text-xs font-extrabold">
                      {r.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-extrabold">{r.name}</span>
                      <span className="block text-[11px] text-text-sub">
                        {r.birth_date}
                        {r.birth_time ? ` · ${r.birth_time}` : ''}
                      </span>
                    </span>
                  </button>
                ))}
              </>
            )}

            <button
              disabled={submitting}
              className="mt-1 flex items-center gap-2 rounded-xl border-2 border-ink bg-yellow p-2.5 text-left shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
              onClick={() => setSheetOpen(true)}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink bg-surface">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              <span className="text-[12px] font-extrabold">{t('inlinePartner.directInput')}</span>
            </button>
          </div>
        )}
      </div>

      {/* 바텀시트 — 전체 만세력 입력 폼 */}
      {sheetOpen && (
        <>
          {/* 백드롭 */}
          <div
            className="fixed inset-0 z-40 bg-ink/40"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          {/* 시트 */}
          <div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[640px] rounded-t-[22px] border-2 border-ink bg-surface shadow-[0_-4px_0_#1A1A1A]"
            role="dialog"
            aria-modal="true"
          >
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border-soft" />
            </div>
            <div className="max-h-[75dvh] overflow-y-auto px-5 pb-8 pt-3">
              <h2 className="mb-4 text-[17px] font-extrabold text-ink">
                {t('inlinePartner.sheetTitle')}
              </h2>
              {formError && (
                <p className="mb-3 text-[12px] font-bold text-orange">{formError}</p>
              )}
              <BirthInputForm
                onSubmit={handleFormSubmit}
                submitLabel={t('inlinePartner.sheetSubmit')}
                busy={submitting}
                nameOptional
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
