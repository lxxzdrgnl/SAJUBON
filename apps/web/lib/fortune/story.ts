/**
 * 운세 스토리 애니메이션·레이아웃 순수 로직 (브라우저 API 없음).
 * - 세그먼트 프로그레스 바 채움 비율
 * - 카드 전환 방향
 * - 점수 카운트업 스텝
 * - 카테고리 → 오행색 매핑 (배경 그라디언트 오버레이용)
 */
import { ohaeng } from '@sajuguri/design'

/** 인스타식 세그먼트 채움 상태 — 지난 카드=1, 현재=1(즉시 꽉 참), 이후=0. */
export function calcSegmentFills(total: number, currentIndex: number): number[] {
  if (total <= 0) return []
  const safe = Math.min(Math.max(currentIndex, 0), total - 1)
  return Array.from({ length: total }, (_, i) => (i <= safe ? 1 : 0))
}

export type SlideDirection = 'next' | 'prev' | 'none'

/** 이전 인덱스 대비 전환 방향 — 카드 슬라이드 인 방향 결정. */
export function slideDirection(prevIndex: number, nextIndex: number): SlideDirection {
  if (nextIndex > prevIndex) return 'next'
  if (nextIndex < prevIndex) return 'prev'
  return 'none'
}

/**
 * 카운트업 한 프레임 값 — eased(0..1) 진행도에서 정수 점수.
 * @param target  최종 점수
 * @param progress 0..1 진행도
 */
export function countUpValue(target: number, progress: number): number {
  const p = Math.min(Math.max(progress, 0), 1)
  // easeOutCubic
  const eased = 1 - Math.pow(1 - p, 3)
  return Math.round(target * eased)
}

/** 카테고리 키 → 오행 5색 (배경 오버레이·강조 톤). 테마적 연상 매핑. */
const CATEGORY_OHAENG: Record<string, keyof typeof ohaeng> = {
  exam:   '수', // 학업 — 지혜의 수
  money:  '금', // 금전 — 재물의 금
  love:   '화', // 연애 — 정열의 화
  career: '목', // 직업 — 성장의 목
  health: '토', // 건강 — 안정의 토
  social: '화', // 사교 — 활기의 화
}

/** 카테고리 키에 대응하는 오행색 hex. 미지정·intro 등은 null. */
export function categoryColor(categoryKey: string | undefined): string | null {
  if (!categoryKey) return null
  const el = CATEGORY_OHAENG[categoryKey]
  return el ? ohaeng[el] : null
}

/** hex(#RRGGBB) → rgba 문자열 (그라디언트 오버레이 투명도 적용용). */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return `rgba(0,0,0,${alpha})`
  const int = parseInt(m[1], 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r},${g},${b},${alpha})`
}
