'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 바텀시트 마운트 전환 — open이 true가 되면 즉시 마운트하되 "닫힌 위치"로 첫 페인트를 하고,
 * 다음 프레임에 visible을 켜서 transition이 실제로 발생하게 한다.
 * 닫을 때는 opacity 전환이 끝난 뒤에 언마운트한다.
 *
 * transform이 아니라 opacity의 transitionend를 기준으로 삼는 이유:
 * prefers-reduced-motion에서 이동 지속시간(--motion-duration-sheet)은 1ms로 죽지만
 * 페이드(--motion-duration-fade)는 살아있으므로, 페이드가 언마운트 타이밍의 기준이어야 한다.
 */
export function useSheetTransition(open: boolean) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const visibleRef = useRef(false)

  useEffect(() => {
    visibleRef.current = visible
  }, [visible])

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    // 열린 상태로 한 번도 페인트되기 전에 닫히면(더블 rAF 완료 전) opacity 전환이 아예
    // 발생하지 않아 transitionend도 오지 않는다. 그대로 두면 투명해진 백드롭이
    // fixed inset-0 으로 화면 전체 클릭을 삼키므로, 그 경우엔 즉시 언마운트한다.
    if (!visibleRef.current) {
      setMounted(false)
      return
    }
    setVisible(false)
  }, [open])

  useEffect(() => {
    if (!mounted || !open) return
    // 더블 rAF — 닫힌 상태가 한 번 페인트된 뒤에 열린 상태로 바꿔야 전환이 보인다.
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setVisible(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [mounted, open])

  const onTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLElement>) => {
      // 자식 버튼들의 transition-opacity가 버블링으로 올라오므로 자기 자신만 받는다.
      if (e.target !== e.currentTarget) return
      if (e.propertyName !== 'opacity') return
      if (!open) setMounted(false)
    },
    [open],
  )

  return { mounted, visible, onTransitionEnd }
}
