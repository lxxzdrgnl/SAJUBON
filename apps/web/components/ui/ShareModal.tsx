'use client'

/**
 * ShareModal — 공유 URL을 보여주고 복사/네이티브 공유를 제공하는 범용 모달.
 * iOS Safari 제약 대응:
 *   - 링크 생성(await) 이후 모달 오픈 → 복사/공유는 각 버튼의 새 제스처에서 실행.
 *   - navigator.clipboard.writeText 불가 시 hidden input + execCommand('copy') 폴백.
 * 브루탈 디자인: border-2 border-ink, shadow-[4px_4px_0_#1A1A1A].
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

interface ShareModalProps {
  open: boolean
  url: string
  title?: string
  onClose: () => void
}

export default function ShareModal({ open, url, title, onClose }: ShareModalProps) {
  const t = useTranslations('ui.shareModal')
  const [copied, setCopied] = useState(false)
  const fallbackInputRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const handleCopy = useCallback(async () => {
    let success = false

    // 1순위: Clipboard API (모던 브라우저 / iOS 15.4+)
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url)
        success = true
      } catch {
        // 권한 거부 등 → fallback 으로
      }
    }

    // 2순위: execCommand 폴백 (구형 Safari, WebView 등)
    if (!success && fallbackInputRef.current) {
      const input = fallbackInputRef.current
      input.value = url
      input.style.display = 'block'
      input.select()
      input.setSelectionRange(0, url.length)
      try {
        success = document.execCommand('copy')
      } catch {
        // 완전 실패 — 그냥 모달에 URL이 보이므로 수동 복사 가능
      }
      input.style.display = 'none'
    }

    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [url])

  // 모달 열릴 때 자동 복사 시도 (실패 시 모달의 복사 버튼으로 폴백)
  useEffect(() => {
    if (open) {
      setCopied(false)
      void handleCopy()
    }
  }, [open, handleCopy])

  const handleNativeShare = useCallback(() => {
    if (typeof navigator.share !== 'function') return
    navigator.share({ title: title ?? url, url }).catch(() => {/* 사용자 취소 무시 */})
  }, [url, title])

  // 모달 내부 클릭이 부모(예: 운세 스토리의 좌/우 탭=뒤로/다음)로 버블링되지 않게 차단.
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (e.target === backdropRef.current) onClose()
  }, [onClose])

  if (!open) return null

  const hasNativeShare = typeof window !== 'undefined' && typeof navigator.share === 'function'

  return (
    // 오버레이 배경
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: 'rgba(26,26,26,0.55)' }}
      onClick={handleBackdropClick}
    >
      {/* 모달 패널 — 브루탈 */}
      <div
        className="w-full max-w-sm rounded-2xl border-2 border-ink bg-surface shadow-[4px_4px_0_#1A1A1A]"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? t('title')}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b-2 border-ink px-4 py-3">
          <span className="text-[14px] font-black tracking-wide text-ink">
            {title ?? t('title')}
          </span>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-full text-[18px] font-black leading-none text-ink transition-opacity active:opacity-50"
            onClick={onClose}
            aria-label={t('close')}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* 자동 복사 완료 배너 — 모달 열리는 순간 복사됐음을 명확히 알림 */}
        {copied && (
          <div className="mx-4 mt-3 flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-yellow py-2 text-[13px] font-black text-ink">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {t('copiedBanner')}
          </div>
        )}

        {/* URL 표시 필드 */}
        <div className="px-4 pt-3 pb-3">
          <div className="rounded-xl border-2 border-ink bg-[#F5F5F0] px-3 py-2.5">
            <p
              className="break-all text-[12px] font-mono leading-relaxed text-ink"
              style={{ wordBreak: 'break-all' }}
            >
              {url}
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className={`flex gap-2 px-4 pb-4 ${hasNativeShare ? '' : ''}`}>
          {/* 복사 버튼 */}
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-ink py-3 text-[14px] font-black transition-all duration-100 active:translate-y-[1px]"
            style={{
              background: copied ? '#1A1A1A' : 'transparent',
              color: copied ? '#FFFBF0' : '#1A1A1A',
            }}
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t('copied')}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                {t('copy')}
              </>
            )}
          </button>

          {/* 네이티브 공유 버튼 (navigator.share 있을 때만) */}
          {hasNativeShare && (
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-ink py-3 text-[14px] font-black text-surface transition-all duration-100 active:translate-y-[1px] active:opacity-80"
              onClick={handleNativeShare}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              {t('share')}
            </button>
          )}
        </div>
      </div>

      {/* execCommand 폴백용 숨김 input */}
      <input
        ref={fallbackInputRef}
        type="text"
        readOnly
        aria-hidden="true"
        tabIndex={-1}
        style={{
          display: 'none',
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          opacity: 0,
        }}
      />
    </div>
  )
}
