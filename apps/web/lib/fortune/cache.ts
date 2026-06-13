/**
 * 운세 스토리 localStorage 캐시 — 게스트 1일 1회 보장.
 * 브라우저 API는 StorageAdapter로 주입받아 G1(순수성) 준수.
 */
import type { StorageAdapter } from '@sajuguri/core'
import type { DailyStoryResponse } from '@sajuguri/api-client'

const KEY_PREFIX = 'sajuguri.fortune'

/** 캐시 키: birthKey(정규화된 생년월일시+성별) + 날짜. */
export function buildCacheKey(birthKey: string, date: string): string {
  return `${KEY_PREFIX}.${date}.${birthKey}`
}

/**
 * SajuCalcRequest 중 캐시 식별에 필요한 최소 필드로 birthKey 생성.
 * 순서가 정해져 있어야 동일 입력에 동일 키가 나옴.
 */
export function buildBirthKey(input: {
  birth_date: string
  birth_time: string | null
  gender: string
  calendar?: string
  is_leap_month?: boolean
}): string {
  return [
    input.birth_date,
    input.birth_time ?? 'null',
    input.gender,
    input.calendar ?? 'solar',
    String(input.is_leap_month ?? false),
  ].join('|')
}

/** 캐시에서 스토리 읽기. */
export async function loadCachedStory(
  storage: StorageAdapter,
  birthKey: string,
  date: string,
): Promise<DailyStoryResponse | null> {
  const raw = await storage.get(buildCacheKey(birthKey, date))
  if (!raw) return null
  try {
    return JSON.parse(raw) as DailyStoryResponse
  } catch {
    return null
  }
}

/** 스토리를 캐시에 저장. */
export async function saveCachedStory(
  storage: StorageAdapter,
  birthKey: string,
  date: string,
  story: DailyStoryResponse,
): Promise<void> {
  await storage.set(buildCacheKey(birthKey, date), JSON.stringify(story))
}
