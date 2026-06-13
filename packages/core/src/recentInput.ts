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
  /** 일간(천간) 한글 한 글자 — 너구리 아바타 틴팅용. 결과 페이지 마운트 시 보강된다. */
  day_stem?: string | null
}

const KEY = 'sajuguri.recentInputs'
const MAX = 5

/** 중복 판정 키 — 동일 입력(생일·시각·성별·양/음력)이면 같은 항목으로 본다. */
const dedupKey = (i: Pick<RecentBirthInput, 'birth_date' | 'birth_time' | 'gender' | 'calendar'>) =>
  `${i.birth_date}|${i.birth_time}|${i.gender}|${i.calendar}`

export async function loadRecentInputs(s: StorageAdapter): Promise<RecentBirthInput[]> {
  const raw = await s.get(KEY)
  if (!raw) return []
  try { return JSON.parse(raw) as RecentBirthInput[] } catch { return [] }
}

export async function saveRecentInput(s: StorageAdapter, input: RecentBirthInput): Promise<void> {
  const list = await loadRecentInputs(s)
  const dedup = [input, ...list.filter((i) => dedupKey(i) !== dedupKey(input))]
  await s.set(KEY, JSON.stringify(dedup.slice(0, MAX)))
}

/**
 * 기존 최근 항목에 일간(day_stem)을 보강한다 — 결과 페이지에서 사주 계산 후 호출.
 * 입력 키(생일·시각·성별·양/음력)가 일치하는 항목에만 써넣으며, 이미 같은 값이면 쓰지 않는다.
 * @returns 실제로 갱신했으면 true (불필요한 쓰기 방지용)
 */
export async function enrichRecentInputDayStem(
  s: StorageAdapter,
  match: Pick<RecentBirthInput, 'birth_date' | 'birth_time' | 'gender' | 'calendar'>,
  dayStem: string,
): Promise<boolean> {
  const list = await loadRecentInputs(s)
  const k = dedupKey(match)
  let changed = false
  const next = list.map((i) => {
    if (dedupKey(i) === k && i.day_stem !== dayStem) {
      changed = true
      return { ...i, day_stem: dayStem }
    }
    return i
  })
  if (changed) await s.set(KEY, JSON.stringify(next))
  return changed
}
