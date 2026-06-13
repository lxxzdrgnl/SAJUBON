/** 진태양시 보정 (이식: frontend/utils/citySearch.ts) — round(경도×4) − UTC오프셋(분) */
export function calcSolarCorrection(longitude: number, utcOffsetMinutes: number): number {
  return Math.round(longitude * 4) - utcOffsetMinutes
}

export function formatCorrection(minutes: number): string {
  return `${minutes >= 0 ? '+' : ''}${minutes}분`
}

/** 서울 기본 보정 (출생지 미입력 시) */
export const SEOUL_CORRECTION = calcSolarCorrection(126.97, 540)
