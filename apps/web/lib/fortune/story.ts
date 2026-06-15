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
  /** 배경 단색 hex — 캔버스(이미지 저장)처럼 그라데이션을 못 쓰는 곳에서 사용 */
  base: string
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

/** 비비드 색 풀 — 한 운세 11카드를 서로 다른 색에 배정(무충돌) + 시드 셔플 변주. 검토용 /palette 페이지에서 확인. */
export const POOL = [
  '#FF2D78', // 0 핫핑크
  '#00C2B8', // 1 민트틸
  '#7B3FE4', // 2 퍼플
  '#C6F432', // 3 라임
  '#FFD900', // 4 옐로
  '#FF6B00', // 5 오렌지
  '#1B2A6B', // 6 네이비
  '#FF5A4D', // 7 코랄
  '#3DA5FF', // 8 스카이
  '#E8489B', // 9 마젠타
  '#2EA86B', // 10 그래스
  '#3B49B0', // 11 인디고
  '#00A3A3', // 12 틸딥
  '#F25C2A', // 13 탠저린
  '#9D4EDD', // 14 바이올렛
  '#2BB673', // 15 에메랄드
  '#FF8A1E', // 16 앰버
  '#E63946', // 17 레드
  '#1FA2C9', // 18 시안블루
  '#6A4FE0', // 19 인디고바이올렛
] as const

/** 카테고리 키 → 풀 인덱스 (모두 서로 다름). */
const CATEGORY_SLOT: Record<string, number> = {
  exam: 8, money: 3, love: 0, career: 11, health: 1, social: 7,
}

/** 카드 종류/카테고리 → 풀 인덱스. 11개 슬롯이 모두 distinct → 한 운세 내 색 무충돌. */
function slotIndex(kind: string, categoryKey?: string): number {
  if (kind === 'intro') return 2
  if (kind === 'overall') return 5
  if (kind === 'category' && categoryKey && categoryKey in CATEGORY_SLOT) return CATEGORY_SLOT[categoryKey]
  if (kind === 'caution') return 9
  if (kind === 'color') return 6
  if (kind === 'summary') return 4
  return 10 // fallback
}

/** hex → sRGB 상대 휘도 근사(0~1). */
function lum(hex: string): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return 1
  const int = parseInt(m[1], 16)
  return (0.299 * ((int >> 16) & 255) + 0.587 * ((int >> 8) & 255) + 0.114 * (int & 255)) / 255
}

/** 배경색 위에서 가독성 높은 잉크색을 고른다 (상대 휘도 기반). */
function inkFor(bgHex: string): { ink: string; inkLight: boolean } {
  // 밝은 배경(라임·옐로 등)은 네이비 잉크, 그 외엔 흰 잉크
  return lum(bgHex) > 0.62 ? { ink: INK_DARK, inkLight: false } : { ink: INK_WHITE, inkLight: true }
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

// 배경색 → 포인트 악센트(랭킹 번호·키워드·바). Spotify Wrapped식으로 색마다 직접 페어를 큐레이트.
// 보색 로직 대신 손으로 정한 고대비 조합 — 노랑/라임/핑크/퍼플/네이비 팝.
const ACCENT_FOR: Record<string, string> = {
  '#FF2D78': '#C6F432', // 핫핑크 → 라임
  '#00C2B8': '#FF2D78', // 민트틸 → 핫핑크
  '#7B3FE4': '#FFD900', // 퍼플 → 옐로
  '#C6F432': '#7B3FE4', // 라임 → 퍼플
  '#FFD900': '#FF2D78', // 옐로 → 핫핑크
  '#FF6B00': '#1FA2C9', // 오렌지 → 시안블루
  '#1B2A6B': '#FF8A1E', // 네이비 → 앰버
  '#FF5A4D': '#3DA5FF', // 코랄 → 스카이
  '#3DA5FF': '#FF6B00', // 스카이 → 오렌지
  '#E8489B': '#C6F432', // 마젠타 → 라임
  '#2EA86B': '#FF2D78', // 그래스 → 핫핑크
  '#3B49B0': '#FFD900', // 인디고 → 옐로
  '#00A3A3': '#FF8A1E', // 틸딥 → 앰버
  '#F25C2A': '#3DA5FF', // 탠저린 → 스카이
  '#9D4EDD': '#C6F432', // 바이올렛 → 라임
  '#2BB673': '#FF2D78', // 에메랄드 → 핫핑크
  '#FF8A1E': '#7B3FE4', // 앰버 → 퍼플
  '#E63946': '#FFD900', // 레드 → 옐로
  '#1FA2C9': '#FF6B00', // 시안블루 → 오렌지
  '#6A4FE0': '#C6F432', // 인디고바이올렛 → 라임
}
function popAccent(base: string): string {
  return ACCENT_FOR[base.toUpperCase()] ?? (inkFor(base).inkLight ? '#FFD900' : '#14224D')
}

/** 단색 비비드 배경 — 같은 색조로 위가 살짝 밝은 미세 grad (뭉갠 다크 grad 아님). */
function vividBg(base: string): string {
  return `linear-gradient(160deg, ${lighten(base, 0.12)} 0%, ${base} 55%, ${base} 100%)`
}

/** 문자열 → 결정론 시드(0~). 운세별(날짜+간지+이름) 색 복원·사람/날짜별 변주에 사용. */
export function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * 운세 색 시드 — 날짜+이름+점수로 사람·날짜별 색을 결정론적으로 복원한다.
 * scores는 키 순서에 무관하게(정렬) 직렬화 — 공유본은 DB(JSONB)를 거치며 키 순서가
 * 바뀌므로, 정렬하지 않으면 생성본과 색이 어긋난다. 생성(FortuneStoryPage)·공유 페이지가
 * 동일 시드를 쓰도록 이 헬퍼를 공유한다.
 */
export function storyColorSeed(story: {
  date: string
  profile_name?: string | null
  scores: Record<string, number>
}): number {
  const scoresSeed = Object.keys(story.scores)
    .sort()
    .map((k) => `${k}:${story.scores[k]}`)
    .join(',')
  return hashSeed(`${story.date}|${story.profile_name ?? ''}|${scoresSeed}`)
}

/** 시드 기반 풀 셔플(Fisher–Yates, mulberry-LCG) — 회전이 아닌 진짜 순열이라 사람·날짜마다 배열이 달라진다. */
function shuffledPool(seed: number): readonly string[] {
  const arr = [...POOL]
  let s = (seed >>> 0) || 1
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** 단일 베이스색 → 비비드 스킨(배경·잉크·악센트). 검토용 /palette 페이지에서도 사용.
 *  accent 미지정 시 잉크 밝기 기반 기본값(옐로/네이비). */
export function paletteFromBase(base: string, accent?: string): CardPalette {
  const { ink, inkLight } = inkFor(base)
  // 기본 악센트 = 고대비 팝색(보라→옐로, 노랑→핫핑크 식). 명시 지정 시 그 값 사용.
  const acc = accent ?? popAccent(base)
  return { bg: vividBg(base), base, ink, inkSoft: softInk(ink), accent: acc, inkLight }
}

/** 카드 종류/카테고리 → Wrapped 비비드 스킨. seed로 사람·날짜마다 색이 셔플(결정론·무충돌). */
export function cardPalette(kind: string, categoryKey?: string, seed = 0): CardPalette {
  // 슬롯 인덱스(모두 distinct)를 시드 셔플된 풀에 매핑 → 한 운세 내 무충돌 + 시드별 변주.
  const idx = slotIndex(kind, categoryKey)
  // 배경: 시드 셔플 풀에서 슬롯 인덱스로 — 한 운세 내 슬롯마다 서로 다른 색.
  const bgPool = shuffledPool(seed)
  const base = bgPool[idx % bgPool.length]

  // 악센트는 paletteFromBase 기본값(보색)을 사용 — 확 대비되는 포인트, 배경마다 자동 변주.
  return paletteFromBase(base)
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
