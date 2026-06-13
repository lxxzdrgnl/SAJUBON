/**
 * 운세 스토리 애니메이션·레이아웃 순수 로직 (브라우저 API 없음).
 * - 세그먼트 프로그레스 바 채움 비율
 * - 카드 전환 방향
 * - 점수 카운트업 스텝
 * - 카테고리 → 오행색 매핑 (강조 톤용)
 * - 카드 종류/카테고리별 Wrapped식 비비드 단색 팔레트 (배경·잉크·악센트)
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

/** 카테고리 키 → 오행 5색 (강조 톤). 테마적 연상 매핑. */
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

/** hex(#RRGGBB) → rgba 문자열 (오버레이 투명도 적용용). */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return `rgba(0,0,0,${alpha})`
  const int = parseInt(m[1], 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r},${g},${b},${alpha})`
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrapped 비비드 팔레트
// 슬라이드마다 "강렬한 단색 비비드 배경 + 고대비 잉크". 다크/뭉갠 그라데이션 금지.
// inline style={{}} 로만 적용 (check-colors 통과). 카드(kind/카테고리)별로 색이 확 바뀐다.
// ─────────────────────────────────────────────────────────────────────────────

/** 한 슬라이드의 비비드 스킨. bg=배경 단색, ink=고대비 본문색, accent=포인트(번호/언더라인) */
export interface CardPalette {
  /** 슬라이드 풀스크린 배경 (비비드 단색 또는 같은 색조의 미세 2색 grad) */
  bg: string
  /** 헤드라인·점수·본문 메인 텍스트색 (배경 대비 최우선) */
  ink: string
  /** 본문 보조 텍스트색 (ink의 약화 버전) */
  inkSoft: string
  /** 포인트 색 — 랭킹 번호·언더라인·키워드 (배경 위 또렷) */
  accent: string
  /** 잉크가 밝은지(흰 계열) — 그래픽 악센트 명암 결정 */
  inkLight: boolean
}

const INK_DARK = '#15233A'   // 진한 네이비 잉크 (밝은 배경용)
const INK_WHITE = '#FFFFFF'  // 흰 잉크 (어두운/채도 높은 배경용)

/** 비비드 단색 팔레트 — 핫핑크·민트/teal·퍼플·라임·옐로·오렌지·네이비. */
export const VIVID = {
  pink:   '#FF2D78',
  teal:   '#00C2B8',
  purple: '#7B3FE4',
  lime:   '#C6F432',
  yellow: '#FFD900',
  orange: '#FF6B00',
  navy:   '#1B2A6B',
  coral:  '#FF5A4D',
  sky:    '#3DA5FF',
} as const

/** 카테고리 키 → 비비드 배경색. 6개 카테고리가 서로 또렷이 구분되도록 분산 배치. */
const CATEGORY_VIVID: Record<string, keyof typeof VIVID> = {
  exam:   'sky',     // 학업 — 푸른 집중
  money:  'lime',    // 금전 — 라임 잭팟
  love:   'pink',    // 연애 — 핫핑크
  career: 'purple',  // 직업 — 퍼플 야망
  health: 'teal',    // 건강 — 민트 활력
  social: 'orange',  // 사교 — 오렌지 에너지
}

/** 배경색 위에서 가독성 높은 잉크색을 고른다 (상대 휘도 기반). */
function inkFor(bgHex: string): { ink: string; inkLight: boolean } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(bgHex.trim())
  if (!m) return { ink: INK_WHITE, inkLight: true }
  const int = parseInt(m[1], 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  // sRGB 상대 휘도 근사
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  // 밝은 배경(라임·옐로 등)은 네이비 잉크, 그 외엔 흰 잉크
  return lum > 0.62 ? { ink: INK_DARK, inkLight: false } : { ink: INK_WHITE, inkLight: true }
}

/** ink hex + alpha → rgba (보조 텍스트색). */
function softInk(ink: string): string {
  return ink === INK_WHITE ? 'rgba(255,255,255,0.82)' : 'rgba(21,35,58,0.74)'
}

/** 같은 색조로 살짝만 밝게 — 단색 배경에 깊이를 주는 미세 grad 상단색. */
function lighten(hex: string, amount: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return hex
  const int = parseInt(m[1], 16)
  const r = Math.round(((int >> 16) & 255) + (255 - ((int >> 16) & 255)) * amount)
  const g = Math.round(((int >> 8) & 255) + (255 - ((int >> 8) & 255)) * amount)
  const b = Math.round((int & 255) + (255 - (int & 255)) * amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/** 단색 비비드 배경 — 같은 색조로 위가 살짝 밝은 미세 grad (뭉갠 다크 grad 아님). */
function vividBg(base: string): string {
  return `linear-gradient(160deg, ${lighten(base, 0.12)} 0%, ${base} 55%, ${base} 100%)`
}

/** 카드 종류/카테고리 → Wrapped 비비드 스킨. */
export function cardPalette(kind: string, categoryKey?: string): CardPalette {
  let base: string

  if (kind === 'intro') {
    base = VIVID.purple
  } else if (kind === 'overall') {
    base = VIVID.orange
  } else if (kind === 'category' && categoryKey && CATEGORY_VIVID[categoryKey]) {
    base = VIVID[CATEGORY_VIVID[categoryKey]]
  } else if (kind === 'caution') {
    base = VIVID.coral
  } else if (kind === 'color') {
    base = VIVID.navy
  } else if (kind === 'summary') {
    base = VIVID.yellow
  } else {
    base = VIVID.teal
  }

  const { ink, inkLight } = inkFor(base)
  // 포인트 색 — 밝은 잉크면 옐로/배경 자체보다 또렷한 흰, 어두운 잉크면 강한 단색
  const accent = inkLight ? VIVID.yellow : VIVID.navy

  return {
    bg: vividBg(base),
    ink,
    inkSoft: softInk(ink),
    accent,
    inkLight,
  }
}

/**
 * 0..1 진행도에서 그래픽 악센트(흩뿌린 점) 좌표 — 결정적(deterministic) 생성.
 * 인덱스 기반 의사난수로 매 렌더 동일 위치. SSR/CSR 불일치 없음.
 */
export function scatterDots(count: number): { x: number; y: number; r: number }[] {
  const out: { x: number; y: number; r: number }[] = []
  let seed = 1337
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  for (let i = 0; i < count; i++) {
    out.push({
      x: Math.round(rnd() * 100),
      y: Math.round(rnd() * 100),
      r: 2 + Math.round(rnd() * 4),
    })
  }
  return out
}
