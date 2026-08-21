'use client'

/**
 * 이 상담의 만세력 시트 — 헤더 "내 만세력" 칩을 누르면 열린다.
 *
 * 예전엔 이 칩이 상대 첨부 시트를 열어서, 저장된 만세력을 고르면 내 사주가 아니라
 * 상대로 붙어버렸다. 여기서는 "지금 누구 사주로 상담 중인지"를 보여주고 교체만 한다.
 *
 * 정체성은 이름이 아니라 일주(日柱)로 연다. 명리에서 일주가 곧 그 사람이고,
 * 마스코트·홈 배너가 이미 일간 오행색을 쓰고 있어 "이 색 = 이 사람"이 이어진다.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ProfileResponse, SessionProfileRequest } from '@sajuguri/api-client'
import { useSheetTransition } from '@/lib/hooks/useSheetTransition'
import MascotTinted from '@/components/ui/MascotTinted'
import MansePickerSheet, { type MansePick } from '@/components/manse/MansePickerSheet'

/** 일간(천간) → 오행 크롬 토큰. 홈 배너와 같은 매핑을 쓴다. */
const STEM_CHROME: Record<string, string> = {
  갑: 'var(--chrome-mok)', 을: 'var(--chrome-mok)',
  병: 'var(--chrome-hwa)', 정: 'var(--chrome-hwa)',
  무: 'var(--chrome-to)', 기: 'var(--chrome-to)',
  경: 'var(--chrome-geum)', 신: 'var(--chrome-geum)',
  임: 'var(--chrome-su)', 계: 'var(--chrome-su)',
}

export interface SessionManse {
  name?: string | null
  birth_date?: string | null
  birth_time?: string | null
  gender?: string | null
  calendar?: string | null
  /** 일주 간지 (예: "임자") — 있으면 정체 블록에 크게 표시 */
  ilju?: string | null
  day_stem?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  manse: SessionManse
  profiles: ProfileResponse[]
  /** 교체 실행 — 성공하면 시트가 닫힌다 */
  onReplace: (body: SessionProfileRequest) => Promise<void>
  /** 만세력 상세 보기로 이동 */
  detailHref?: string
}

export default function MyManseSheet({
  open,
  onClose,
  manse,
  profiles,
  onReplace,
  detailHref,
}: Props) {
  const t = useTranslations('chat.myManse')
  const { mounted, visible, onTransitionEnd } = useSheetTransition(open)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!mounted) return null

  const chrome = (manse.day_stem && STEM_CHROME[manse.day_stem]) || 'var(--chrome-default)'
  const timeText = manse.birth_time ?? t('timeUnknown')
  const genderText =
    manse.gender === 'female' ? t('female') : manse.gender === 'male' ? t('male') : null
  const calendarText = manse.calendar === 'lunar' ? t('lunar') : t('solar')

  async function handlePick(pick: MansePick) {
    setBusy(true)
    setError(null)
    try {
      await onReplace(
        pick.profile_id != null
          ? { profile_id: pick.profile_id, name: pick.name }
          : {
              birth_date: pick.birth_date,
              gender: pick.gender,
              calendar: pick.calendar,
              is_leap_month: pick.is_leap_month,
              ...(pick.birth_time ? { birth_time: pick.birth_time } : {}),
              ...(pick.name ? { name: pick.name } : {}),
            },
      )
      setPickerOpen(false)
      onClose()
    } catch {
      setError(t('replaceError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink/40"
        style={{
          opacity: visible ? 1 : 0,
          transitionProperty: 'opacity',
          transitionDuration: 'var(--motion-duration-fade)',
          transitionTimingFunction: 'var(--motion-ease-out)',
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[640px] overflow-hidden rounded-t-lg border-2 border-ink bg-surface shadow-brutal-up"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          opacity: visible ? 1 : 0,
          transitionProperty: 'transform, opacity',
          transitionDuration: 'var(--motion-duration-sheet), var(--motion-duration-fade)',
          transitionTimingFunction: 'var(--motion-ease-drawer), var(--motion-ease-out)',
          willChange: 'transform, opacity',
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {/* 정체 블록 — 일간 오행 크롬 위에 마스코트 + 이름 + 일주 */}
        <div className="relative border-b-2 border-ink px-4 py-4" style={{ background: chrome }}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            style={{ background: 'var(--specular)' }}
          />
          <p className="relative mb-2.5 text-[11px] font-extrabold uppercase tracking-wider text-ink/70">
            {t('title')}
          </p>
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface shadow-gloss">
              <MascotTinted stem={manse.day_stem ?? null} width={30} height={30} />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[17px] font-black leading-tight text-ink"
                style={{ textShadow: '0 1px 0 rgba(255,255,255,.6)' }}
              >
                {manse.name || t('unnamed')}
              </p>
              {manse.ilju && (
                <p className="mt-0.5 font-mono text-[13px] font-bold tabular-nums text-ink/75">
                  {t('ilju', { ganji: manse.ilju })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 정보 행 */}
        <dl className="divide-y divide-border-soft border-b-2 border-ink bg-bg-base">
          <div className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-[12px] font-bold text-text-sub">{t('birth')}</dt>
            <dd className="font-mono text-[13px] font-bold tabular-nums text-ink">
              {manse.birth_date} · {timeText}
            </dd>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-[12px] font-bold text-text-sub">{t('detail')}</dt>
            <dd className="text-[13px] font-bold text-ink">
              {[genderText, calendarText].filter(Boolean).join(' · ')}
            </dd>
          </div>
        </dl>

        {/* 행동 */}
        <div className="flex flex-col gap-2 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {error && (
            <p role="alert" className="text-[12px] font-bold text-orange">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-full border-2 border-ink bg-yellow py-3 text-sm font-extrabold text-ink shadow-brutal-sm disabled:opacity-50"
          >
            {busy ? t('replacing') : t('replace')}
          </button>
          {/* 교체하면 앞선 답변은 이전 사람 사주 기준으로 남는다. 눌리기 전에 알려준다. */}
          <p className="text-center text-[11.5px] leading-snug text-text-sub">
            {t('replaceNote')}
          </p>
          {detailHref && (
            <a
              href={detailHref}
              className="mt-1 w-full rounded-full border-2 border-ink bg-surface py-2.5 text-center text-sm font-extrabold text-ink shadow-brutal-sm"
            >
              {t('viewDetail')}
            </a>
          )}
        </div>
      </div>

      <MansePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        profiles={profiles}
        title={t('pickerTitle')}
        onPick={handlePick}
      />
    </>
  )
}
