import { describe, it, expect } from 'vitest'
import { mergeFeed, filterFeed } from './feed'
import type { RecordItem } from './registry'

function item(id: number, createdAt: string): RecordItem {
  return { id, createdAt, payload: {} }
}

const records: Record<string, RecordItem[]> = {
  saju: [item(1, '2026-06-01T00:00:00Z'), item(2, '2026-06-10T00:00:00Z')],
  fortune: [item(3, '2026-06-05')],
  consultation: [item(4, '2026-06-12T00:00:00Z')],
  compatibility: [item(5, '2026-06-08T00:00:00Z')],
}
const order = ['saju', 'fortune', 'consultation', 'compatibility']

describe('mergeFeed', () => {
  it('모든 종류를 병합해 최신순으로 정렬한다', () => {
    const feed = mergeFeed(records, order)
    expect(feed.map((e) => e.item.id)).toEqual([4, 2, 5, 3, 1])
    expect(feed.map((e) => e.typeKey)).toEqual([
      'consultation',
      'saju',
      'compatibility',
      'fortune',
      'saju',
    ])
  })

  it('누락된 타입 키는 빈 배열로 취급한다', () => {
    const feed = mergeFeed({ saju: [item(1, '2026-06-01')] }, order)
    expect(feed).toHaveLength(1)
    expect(feed[0].typeKey).toBe('saju')
  })

  it('compatibility 항목이 피드에 포함된다', () => {
    const feed = mergeFeed(records, order)
    expect(feed.some((e) => e.typeKey === 'compatibility')).toBe(true)
  })
})

describe('filterFeed', () => {
  const feed = mergeFeed(records, order)

  it('all은 전체를 반환한다', () => {
    expect(filterFeed(feed, 'all')).toHaveLength(5)
  })

  it('타입 키로 거른다', () => {
    const onlySaju = filterFeed(feed, 'saju')
    expect(onlySaju).toHaveLength(2)
    expect(onlySaju.every((e) => e.typeKey === 'saju')).toBe(true)
  })

  it('compatibility만 거른다', () => {
    const only = filterFeed(feed, 'compatibility')
    expect(only).toHaveLength(1)
    expect(only[0].item.id).toBe(5)
  })
})
