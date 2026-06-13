import type { IlJinEntry } from '@sajuguri/api-client'

export interface CalendarCell {
  date: string | null
  day: number | null
  entry: IlJinEntry | null
}

/** 'YYYY-MM-DD' (로컬) */
export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 월 달력 그리드 — 앞 빈칸(요일 오프셋) + 날짜 + 7배수 채움 (IlJinCalendar.vue calendarGrid 보존) */
export function calendarGrid(year: number, month: number, entries: IlJinEntry[]): CalendarCell[] {
  const map: Record<string, IlJinEntry> = {}
  for (const e of entries) map[e.date] = e

  const firstWeekday = new Date(year, month - 1, 1).getDay() // 0=일
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: CalendarCell[] = []

  for (let i = 0; i < firstWeekday; i++) cells.push({ date: null, day: null, entry: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(year, month, d)
    cells.push({ date: key, day: d, entry: map[key] ?? null })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null, entry: null })
  return cells
}

/** 이전 달 (1월 → 전년 12월) */
export function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

/** 다음 달 (12월 → 내년 1월) */
export function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}
