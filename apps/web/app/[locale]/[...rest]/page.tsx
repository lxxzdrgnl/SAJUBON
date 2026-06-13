import { notFound } from 'next/navigation'

/**
 * 캐치올 — 매칭되지 않는 모든 경로를 [locale]/not-found.tsx(브랜드 404)로 보낸다.
 * 루트 레이아웃이 없는 [locale] 전용 구조라 루트 not-found 대신 이 방식을 쓴다.
 */
export default function CatchAllNotFound() {
  notFound()
}
