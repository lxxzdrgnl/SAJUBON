/**
 * 운세 스토리 애니메이션·레이아웃 순수 로직 (브라우저 API 없음).
 * - 세그먼트 프로그레스 바 채움 비율
 * - 카드 전환 방향
 * - 점수 카운트업 스텝
 * - 카테고리 → 오행색 매핑 (배경 그라디언트 오버레이용)
 * - 카드 종류별 풀스크린 비비드 배경 그라디언트 (Wrapped식)
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

/**
 * 색 이름(한글/영문) → hex 스와치.
 * color 카드 headline·body에서 추천 색을 추출해 실제 색 칩으로 렌더.
 */
const COLOR_SWATCHES: { names: string[]; hex: string }[] = [
  { names: ['빨강', '빨간', '적색', '레드', 'red'], hex: '#E23B3B' },
  { names: ['주황', '오렌지', 'orange'], hex: '#FF7A1A' },
  { names: ['노랑', '노란', '황색', '옐로', 'yellow'], hex: '#FFD900' },
  { names: ['초록', '녹색', '그린', 'green'], hex: '#2EA86B' },
  { names: ['파랑', '파란', '청색', '블루', 'blue'], hex: '#2F7DE2' },
  { names: ['남색', '네이비', 'navy'], hex: '#1E3A8A' },
  { names: ['하늘', '하늘색', '스카이', 'sky'], hex: '#6EC5FF' },
  { names: ['보라', '보라색', '자주', '퍼플', 'purple'], hex: '#8A4DD6' },
  { names: ['분홍', '핑크', 'pink'], hex: '#F06BA8' },
  { names: ['갈색', '브라운', 'brown'], hex: '#8A5A2B' },
  { names: ['검정', '검은', '흑색', '블랙', 'black'], hex: '#2A2A2A' },
  { names: ['하양', '흰', '흰색', '백색', '화이트', 'white'], hex: '#F5F5F5' },
  { names: ['회색', '그레이', 'gray', 'grey'], hex: '#9A9A9A' },
  { names: ['금색', '골드', 'gold'], hex: '#D9A400' },
  { names: ['은색', '실버', 'silver'], hex: '#C0C4CC' },
]

/** 텍스트에서 알려진 색 이름을 찾아 hex 목록(중복 제거)을 반환. 최대 3개. */
export function extractColorSwatches(text: string): string[] {
  if (!text) return []
  const found: string[] = []
  for (const { names, hex } of COLOR_SWATCHES) {
    if (found.includes(hex)) continue
    if (names.some((n) => text.includes(n))) found.push(hex)
    if (found.length >= 3) break
  }
  return found
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

/**
 * Wrapped식 카드 풀스크린 배경 그라디언트.
 * 딥틸 베이스 위 미묘한 radial 대신 화면 전체를 뚜렷하게 채우는 색.
 * 카드 넘길 때 확연히 바뀌도록 오행 5색 + 경고 오렌지 + 요약 골드 계열.
 */
export function cardBgGradient(kind: string, categoryKey?: string, stemColor?: string): string {
  // intro — 천간 오행색 기반 (밝은 쪽으로 시작 → 깊은 틸로)
  if (kind === 'intro') {
    const base = stemColor ?? ohaeng['토']
    return `linear-gradient(145deg, ${darken(base, 0.35)} 0%, #04332F 100%)`
  }
  // overall — 오렌지 점수 색 강렬하게
  if (kind === 'overall') {
    return 'linear-gradient(145deg, #6B3200 0%, #3A1800 50%, #04332F 100%)'
  }
  // category — 오행색 기반 풀컬러
  if (kind === 'category' && categoryKey) {
    const col = categoryColor(categoryKey)
    if (col) return `linear-gradient(145deg, ${darken(col, 0.3)} 0%, ${darken(col, 0.55)} 50%, #04332F 100%)`
  }
  // caution — 깊은 붉은 경고
  if (kind === 'caution') {
    return 'linear-gradient(145deg, #5A1800 0%, #2E0E00 50%, #04332F 100%)'
  }
  // color — 보라/골드 계열 드리밍
  if (kind === 'color') {
    return 'linear-gradient(145deg, #2A1A4E 0%, #1A0E35 50%, #04332F 100%)'
  }
  // summary — 골드 상단 브랜드 느낌
  if (kind === 'summary') {
    return 'linear-gradient(145deg, #3A2800 0%, #1E1600 50%, #04332F 100%)'
  }
  // fallback
  return 'linear-gradient(180deg, #00857D 0%, #04332F 100%)'
}

/**
 * hex 색상을 어둡게 (amount 0..1 — 0은 원색, 1은 검정).
 * Wrapped 비비드 배경: 너무 밝으면 흰 텍스트 가독성 ↓ → 중간 어두운 채도로.
 */
function darken(hex: string, amount: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return hex
  const int = parseInt(m[1], 16)
  const r = Math.round(((int >> 16) & 255) * (1 - amount))
  const g = Math.round(((int >> 8) & 255) * (1 - amount))
  const b = Math.round((int & 255) * (1 - amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
