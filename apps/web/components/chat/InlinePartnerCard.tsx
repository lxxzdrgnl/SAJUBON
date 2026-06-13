'use client'

/**
 * 인라인 상대 만세력 선택/입력 카드 (B5).
 * `request_partner` SSE 이벤트 수신 시 대화 흐름 내에 표시.
 * mode: 'collapsed' → 'list' (저장 목록) → 'form' (직접 입력) 전환.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ProfileResponse, PartnerAttachRequest } from '@sajuguri/api-client'
import PartnerBirthForm from './PartnerBirthForm'

interface Props {
  profiles: ProfileResponse[]
  onSelect: (p: ProfileResponse) => void
  onSubmitBirth: (body: PartnerAttachRequest) => Promise<void>
}

type Mode = 'collapsed' | 'list' | 'form'

export default function InlinePartnerCard({ profiles, onSelect, onSubmitBirth }: Props) {
  const t = useTranslations('chat')
  const [mode, setMode] = useState<Mode>('collapsed')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleFormSubmit(body: PartnerAttachRequest) {
    setSubmitting(true)
    setFormError(null)
    try {
      await onSubmitBirth(body)
      // 성공 시 부모가 카드를 언마운트하거나 상태를 갱신하므로 별도 처리 불필요
    } catch {
      setFormError(t('partnerForm.errorSubmit'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
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
              className="flex w-full items-center gap-2 rounded-xl border-2 border-ink bg-surface p-2.5 text-left shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
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
          <button
            className="mt-1 flex items-center gap-2 rounded-xl border-2 border-ink bg-yellow p-2.5 text-left shadow-[2px_2px_0_#1A1A1A] transition-opacity hover:opacity-80"
            onClick={() => setMode('form')}
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

      {mode === 'form' && (
        <PartnerBirthForm
          onSubmit={handleFormSubmit}
          onCancel={() => setMode('list')}
          submitting={submitting}
          errorMsg={formError}
        />
      )}
    </div>
  )
}
