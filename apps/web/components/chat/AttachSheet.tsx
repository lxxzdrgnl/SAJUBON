'use client'

/**
 * 첨부 바텀시트 (B5) — + 버튼 클릭 시 표시.
 * - 내 만세력 교체 (ChatEntrySheet 재사용 방향)
 * - 상대 만세력 첨부 (저장 목록 + 직접 입력 → 중첩 바텀시트)
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ProfileResponse, PartnerAttachRequest } from '@sajuguri/api-client'
import BirthInputForm, { type ManseBirthInput } from '@/components/manse/BirthInputForm'

interface Props {
  open: boolean
  onClose: () => void
  profiles: ProfileResponse[]
  onAttachPartner: (p: ProfileResponse) => void
  onSubmitPartnerBirth: (body: PartnerAttachRequest) => Promise<void>
  sessionId: string
}

export default function AttachSheet({
  open,
  onClose,
  profiles,
  onAttachPartner,
  onSubmitPartnerBirth,
  sessionId: _sessionId,
}: Props) {
  const t = useTranslations('chat')
  const [formSheetOpen, setFormSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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
      await onSubmitPartnerBirth(body)
      setFormSheetOpen(false)
      onClose()
    } catch {
      setFormError(t('inlinePartner.errorSubmit'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* 백드롭 */}
      <div className="fixed inset-0 z-40 bg-ink/40" onClick={onClose} aria-hidden="true" />

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

        <div className="px-5 pb-8 pt-3">
          <h2 className="mb-4 text-[17px] font-extrabold text-ink">{t('attach.title')}</h2>

          {/* 상대 만세력 첨부 */}
          <section className="mb-4">
            <p className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-text-sub">
              {t('attach.attachPartner')}
            </p>
            {profiles.length > 0 ? (
              <ul className="flex flex-col gap-2 max-h-[40dvh] overflow-y-auto">
                {profiles.map((p) => (
                  <li key={p.id}>
                    <button
                      className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-3 text-left shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80"
                      onClick={() => onAttachPartner(p)}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-yellow-tint text-xs font-extrabold">
                        {p.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-extrabold">{p.name}</span>
                        <span className="block text-xs text-text-sub">
                          {p.birth_date}{p.birth_time ? ` · ${p.birth_time}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* 직접 입력 — 중첩 바텀시트 열기 */}
            <button
              className="mt-2 flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-yellow p-3 text-left shadow-[4px_4px_0_#1A1A1A] transition-opacity hover:opacity-80"
              onClick={() => setFormSheetOpen(true)}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface text-lg">
                +
              </span>
              <span className="text-[13px] font-extrabold">{t('pickSheet.directInput')}</span>
            </button>
          </section>
        </div>
      </div>

      {/* 중첩 바텀시트 — 전체 만세력 입력 폼 */}
      {formSheetOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-ink/40"
            onClick={() => setFormSheetOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[640px] rounded-t-[22px] border-2 border-ink bg-surface shadow-[0_-4px_0_#1A1A1A]"
            role="dialog"
            aria-modal="true"
          >
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
