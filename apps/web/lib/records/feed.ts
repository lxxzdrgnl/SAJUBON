import type { RecordItem } from './registry'

export interface FeedEntry {
  typeKey: string
  item: RecordItem
}

/**
 * 타입별 레코드 맵을 단일 시간순(최신 우선) 피드로 병합한다.
 * `typeOrder`는 동률(같은 createdAt) 시 안정 정렬 보조 + 등록 순서 기준.
 */
export function mergeFeed(records: Record<string, RecordItem[]>, typeOrder: string[]): FeedEntry[] {
  const entries: FeedEntry[] = []
  for (const typeKey of typeOrder) {
    for (const item of records[typeKey] ?? []) entries.push({ typeKey, item })
  }
  entries.sort((a, b) => new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime())
  return entries
}

/** 필터 키('all' 또는 타입 key)로 피드를 거른다. */
export function filterFeed(feed: FeedEntry[], filter: string): FeedEntry[] {
  return filter === 'all' ? feed : feed.filter((e) => e.typeKey === filter)
}
