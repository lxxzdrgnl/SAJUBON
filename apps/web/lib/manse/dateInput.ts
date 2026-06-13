/**
 * 생년월일·시각 세그먼트 입력 순수 로직.
 * 이식: frontend/components/saju/InputForm.vue 의 makeSegInput / makeBackspace / dateError.
 *
 * 네이티브 date/time picker 대신 YYYY / MM / DD · HH : MM 개별 숫자 input을 쓰기 위한
 * 정규화·클램핑·자동전진 규칙을 UI 프레임워크와 무관한 순수 함수로 분리한다.
 */

export interface SegResult {
  /** 정규화된 세그먼트 값 (숫자만, 클램핑·패딩 적용) */
  value: string
  /** 다음 칸으로 포커스를 옮겨야 하면 true */
  advance: boolean
}

export interface SegConfig {
  maxLen: number
  maxVal?: number
  minVal?: number
  /** 한 자리에서 pad + 자동전진 (예: 월=1, 시=2 → 2 이상 입력 시 0n 패딩 후 전진) */
  eagerThreshold?: number
  /** 한 자리에서 pad만, 전진 없음 (예: 일=3 → 4~9는 0n 패딩) */
  padThreshold?: number
}

/**
 * 세그먼트 입력 1회 처리. 원시 입력 문자열을 받아 정규화된 값과 전진 여부를 반환한다.
 * (frontend makeSegInput 이식 — 부수효과 없는 순수 버전)
 */
export function processSegInput(raw: string, cfg: SegConfig): SegResult {
  let val = raw.replace(/\D/g, '').slice(0, cfg.maxLen)

  if (val.length === cfg.maxLen) {
    const n = parseInt(val, 10)
    if (cfg.maxVal !== undefined && n > cfg.maxVal) val = String(cfg.maxVal)
    if (cfg.minVal !== undefined && n < cfg.minVal) {
      val = String(cfg.minVal).padStart(cfg.maxLen, '0')
    }
  }

  // padThreshold: 한 자리에서 패딩만 (전진 없음)
  if (cfg.padThreshold !== undefined && val.length === 1 && parseInt(val, 10) > cfg.padThreshold) {
    return { value: `0${val}`, advance: false }
  }

  // 전진 판정: maxLen 도달, 또는 eagerThreshold 초과
  const eager =
    cfg.eagerThreshold !== undefined && val.length === 1 && parseInt(val, 10) > cfg.eagerThreshold
  const advance = val.length === cfg.maxLen || eager
  if (advance && val.length === 1) {
    return { value: `0${val}`, advance: true }
  }
  return { value: val, advance }
}

/** 세그먼트별 설정 (frontend 와 동일) */
export const YEAR_SEG: SegConfig = { maxLen: 4 }
export const MONTH_SEG: SegConfig = { maxLen: 2, maxVal: 12, minVal: 1, eagerThreshold: 1 }
export const DAY_SEG: SegConfig = { maxLen: 2, maxVal: 31, minVal: 1, padThreshold: 3 }
export const HOUR_SEG: SegConfig = { maxLen: 2, maxVal: 23, eagerThreshold: 2 }
export const MINUTE_SEG: SegConfig = { maxLen: 2, maxVal: 59 }

/**
 * 빈 칸에서 Backspace 시 이전 칸으로 이동해야 하는지 판정.
 * (frontend makeBackspace 이식)
 */
export function shouldBackspaceToPrev(key: string, currentValue: string): boolean {
  return key === 'Backspace' && currentValue === ''
}

/** YYYY-MM-DD 조립. 연도 4자리 + 월·일 채워졌을 때만 값을 만든다. */
export function buildBirthDate(year: string, month: string, day: string): string {
  if (year.length !== 4 || !month || !day) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/** HH:MM 조립. 시·분 모두 있을 때만 값을 만든다. */
export function buildBirthTime(hour: string, minute: string): string | null {
  if (hour === '' && minute === '') return null
  if (hour === '' || minute === '') return null
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

export type DateErrorCode = 'yearRange' | 'monthRange' | 'dayOverflow' | null

export interface DateValidation {
  code: DateErrorCode
  /** dayOverflow 메시지용 — 해당 연·월의 마지막 날 */
  maxDay?: number
  year?: number
  month?: number
}

/**
 * 날짜 유효성 검사 (frontend dateError computed 이식).
 * - 연도 1900~2100
 * - 해당 월의 실제 마지막 날 초과 검사 (윤년 포함, new Date(y, m, 0))
 * 미완성 입력(연도 4자리 미만, 빈 칸)은 에러 아님(null).
 */
export function validateDate(yearStr: string, monthStr: string, dayStr: string): DateValidation {
  if (!yearStr || !monthStr || !dayStr) return { code: null }
  if (yearStr.length < 4) return { code: null }

  const y = parseInt(yearStr, 10)
  const m = parseInt(monthStr, 10)
  const d = parseInt(dayStr, 10)

  if (y < 1900 || y > 2100) return { code: 'yearRange' }
  if (m < 1 || m > 12) return { code: 'monthRange' }

  const maxDay = new Date(y, m, 0).getDate() // m은 1-based; day 0 = 직전 달 마지막 날
  if (d > maxDay) return { code: 'dayOverflow', maxDay, year: y, month: m }

  return { code: null }
}

export type TimeErrorCode = 'minuteMissing' | 'hourMissing' | null

/**
 * 시각 유효성 검사 (frontend timeError computed 이식).
 * 시간 모름이면 검사 안 함. 시·분 중 하나만 입력된 경우 에러.
 */
export function validateTime(
  hour: string,
  minute: string,
  timeUnknown: boolean,
): TimeErrorCode {
  if (timeUnknown) return null
  const hasHour = hour !== ''
  const hasMinute = minute !== ''
  if (hasHour && !hasMinute) return 'minuteMissing'
  if (!hasHour && hasMinute) return 'hourMissing'
  return null
}
