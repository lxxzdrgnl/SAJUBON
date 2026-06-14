'use client'
import { useCallback, useRef, useState } from 'react'

export function useShareModal() {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const preparedRef = useRef<string | null>(null)

  // Optionally pre-generate the URL so the share tap can copy synchronously (iOS gesture).
  const prepare = useCallback((create: () => Promise<string>) => {
    let cancelled = false
    create().then((url) => { if (!cancelled) preparedRef.current = url }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Open the modal. If a URL was prepared, copy it synchronously (in the tap gesture) and open.
  // Otherwise create the token then open (the modal auto-copies on open).
  const share = useCallback((create: () => Promise<string>) => {
    const prepared = preparedRef.current
    if (prepared) {
      try { void navigator.clipboard?.writeText(prepared) } catch { /* modal copy button fallback */ }
      setShareUrl(prepared)
      return
    }
    setSharing(true)
    create().then(setShareUrl).catch(() => {}).finally(() => setSharing(false))
  }, [])

  const close = useCallback(() => setShareUrl(null), [])
  return { shareUrl, sharing, share, prepare, close }
}
