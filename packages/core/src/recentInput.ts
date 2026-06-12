import type { StorageAdapter } from './storage'

/** 게스트 최근 입력 — 만세력 입력폼 자동완성용 (spec §7.3) */
export interface RecentBirthInput {
  name: string
  birth_date: string
  birth_time: string | null
  gender: 'male' | 'female'
  calendar: 'solar' | 'lunar'
  is_leap_month: boolean
  birth_longitude?: number
  birth_utc_offset?: number
  city?: string
}

const KEY = 'sajuguri.recentInputs'
const MAX = 5

export async function loadRecentInputs(s: StorageAdapter): Promise<RecentBirthInput[]> {
  const raw = await s.get(KEY)
  if (!raw) return []
  try { return JSON.parse(raw) as RecentBirthInput[] } catch { return [] }
}

export async function saveRecentInput(s: StorageAdapter, input: RecentBirthInput): Promise<void> {
  const list = await loadRecentInputs(s)
  const key = (i: RecentBirthInput) => `${i.birth_date}|${i.birth_time}|${i.gender}|${i.calendar}`
  const dedup = [input, ...list.filter((i) => key(i) !== key(input))]
  await s.set(KEY, JSON.stringify(dedup.slice(0, MAX)))
}
