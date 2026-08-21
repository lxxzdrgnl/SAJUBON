/**
 * 진태양시 보정 + 시시(時辰) 미리보기 순수 로직.
 * 이식: frontend/utils/citySearch.ts (보정) + frontend InputForm.vue (SISI / correctedPreview).
 *
 * 보정 공식: round(longitude × 4) − utcOffsetMinutes
 *   서울: round(126.97 × 4) − 540 = 508 − 540 = −32분
 */

/** 진태양시 보정값 계산 (분) */
export function calcSolarCorrection(longitude: number, utcOffsetMinutes: number): number {
  return Math.round(longitude * 4) - utcOffsetMinutes
}

/** 보정값을 부호 포함 문자열로 (+12분 / -32분) */
export function formatCorrection(minutes: number): string {
  const sign = minutes >= 0 ? '+' : ''
  return `${sign}${minutes}`
}

/** 서울 기본 보정 (-32분) */
export const SEOUL_CORRECTION = -32

export interface Sisi {
  /** i18n 키 (자시~해시) */
  key: SisiKey
  hanja: string
  /** 시작 분 (0~1439, 자정 기준) */
  start: number
  /** 종료 분 */
  end: number
  /** 표시 범위 (예: 23:30~01:30) */
  range: string
}

export type SisiKey =
  | 'ja' | 'chuk' | 'in' | 'myo' | 'jin' | 'sa'
  | 'o' | 'mi' | 'sin' | 'yu' | 'sul' | 'hae'

/** 12시진 — 시작/종료 분 기준 (frontend SISI 이식) */
export const SISI: Sisi[] = [
  { key: 'ja',   hanja: '子時', start: 23 * 60 + 30, end: 25 * 60 + 30, range: '23:30~01:30' },
  { key: 'chuk', hanja: '丑時', start: 1 * 60 + 30,  end: 3 * 60 + 30,  range: '01:30~03:30' },
  { key: 'in',   hanja: '寅時', start: 3 * 60 + 30,  end: 5 * 60 + 30,  range: '03:30~05:30' },
  { key: 'myo',  hanja: '卯時', start: 5 * 60 + 30,  end: 7 * 60 + 30,  range: '05:30~07:30' },
  { key: 'jin',  hanja: '辰時', start: 7 * 60 + 30,  end: 9 * 60 + 30,  range: '07:30~09:30' },
  { key: 'sa',   hanja: '巳時', start: 9 * 60 + 30,  end: 11 * 60 + 30, range: '09:30~11:30' },
  { key: 'o',    hanja: '午時', start: 11 * 60 + 30, end: 13 * 60 + 30, range: '11:30~13:30' },
  { key: 'mi',   hanja: '未時', start: 13 * 60 + 30, end: 15 * 60 + 30, range: '13:30~15:30' },
  { key: 'sin',  hanja: '申時', start: 15 * 60 + 30, end: 17 * 60 + 30, range: '15:30~17:30' },
  { key: 'yu',   hanja: '酉時', start: 17 * 60 + 30, end: 19 * 60 + 30, range: '17:30~19:30' },
  { key: 'sul',  hanja: '戌時', start: 19 * 60 + 30, end: 21 * 60 + 30, range: '19:30~21:30' },
  { key: 'hae',  hanja: '亥時', start: 21 * 60 + 30, end: 23 * 60 + 30, range: '21:30~23:30' },
]

/** 분(자정 기준)으로 시시 판정 (frontend getSisi 이식) */
export function getSisi(totalMin: number): Sisi | null {
  const t = ((totalMin % 1440) + 1440) % 1440
  if (t >= 23 * 60 + 30 || t < 1 * 60 + 30) return SISI[0]
  return SISI.find((s) => t >= s.start && t < s.end) ?? null
}

/** 분을 HH:MM 으로 (자정 wrap 처리) */
export function formatMinutes(min: number): string {
  const t = ((min % 1440) + 1440) % 1440
  const h = String(Math.floor(t / 60)).padStart(2, '0')
  const m = String(t % 60).padStart(2, '0')
  return `${h}:${m}`
}

export interface CorrectedPreview {
  /** 보정값 (분) */
  correction: number
  /** 보정 적용 후 HH:MM */
  applied: string
  /** 적용 후 시시 */
  sisi: Sisi | null
}

/**
 * 입력 시·분 + 보정값으로 보정 미리보기 계산 (frontend correctedPreview 이식).
 * 시·분 둘 다 비어있으면 null.
 */
export function calcCorrectedPreview(
  hourStr: string,
  minuteStr: string,
  correction: number,
): CorrectedPreview | null {
  if (hourStr === '' && minuteStr === '') return null
  const h = parseInt(hourStr || '0', 10)
  const m = parseInt(minuteStr || '0', 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const appliedMin = h * 60 + m + correction
  return {
    correction,
    applied: formatMinutes(appliedMin),
    sisi: getSisi(appliedMin),
  }
}
