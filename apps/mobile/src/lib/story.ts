/**
 * 운세 스토리 순수 로직 — apps/web/lib/fortune/story.ts 포팅 (RN/브라우저 API 제거).
 * - 세그먼트 프로그레스 바 채움 비율
 * - 카드 전환 방향
 * - 점수 카운트업(easeOutCubic)
 * - 카드 종류/카테고리별 Wrapped식 비비드 팔레트
 * - 그래픽 악센트 좌표 생성
 */

// ── 세그먼트 프로그레스 ───────────────────────────────────────────────────────

/** 인스타식 세그먼트 채움 상태 — 지난 카드=1, 현재=1(즉시), 이후=0. */
export function calcSegmentFills(total: number, currentIndex: number): number[] {
  if (total <= 0) return []
  const safe = Math.min(Math.max(currentIndex, 0), total - 1)
  return Array.from({ length: total }, (_, i) => (i <= safe ? 1 : 0))
}

// ── 슬라이드 방향 ─────────────────────────────────────────────────────────────

export type SlideDirection = 'next' | 'prev' | 'none'

export function slideDirection(prevIndex: number, nextIndex: number): SlideDirection {
  if (nextIndex > prevIndex) return 'next'
  if (nextIndex < prevIndex) return 'prev'
  return 'none'
}

// ── 카운트업 ──────────────────────────────────────────────────────────────────

/** easeOutCubic 카운트업 한 프레임 값 (progress 0..1). */
export function countUpValue(target: number, progress: number): number {
  const p = Math.min(Math.max(progress, 0), 1)
  const eased = 1 - Math.pow(1 - p, 3)
  return Math.round(target * eased)
}

// ── 색 추출 ───────────────────────────────────────────────────────────────────

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

// ── hex 유틸 ──────────────────────────────────────────────────────────────────

/** hex(#RRGGBB) → rgba 문자열. */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return `rgba(0,0,0,${alpha})`
  const int = parseInt(m[1], 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r},${g},${b},${alpha})`
}

/** hex → {r,g,b,a} 숫자 객체 (RN StyleSheet 색상용). */
export function hexToRgbaObj(hex: string, alpha: number): { r: number; g: number; b: number; a: number } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return { r: 0, g: 0, b: 0, a: alpha }
  const int = parseInt(m[1], 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255, a: alpha }
}

// ── Wrapped 비비드 팔레트 ─────────────────────────────────────────────────────

/** 한 슬라이드의 비비드 스킨. */
export interface CardPalette {
  /** 슬라이드 배경 단색 hex */
  bg: string
  /** 배경 단색 hex (bg와 동일 — RN은 grad 없음) */
  base: string
  /** 헤드라인·점수·본문 메인 텍스트색 */
  ink: string
  /** 보조 텍스트색 */
  inkSoft: string
  /** 포인트 색 — 랭킹 번호·키워드 */
  accent: string
  /** 잉크가 밝은지(흰 계열) */
  inkLight: boolean
}

const INK_DARK = '#15233A'
const INK_WHITE = '#FFFFFF'

/** 비비드 색 풀 20색 */
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

/** 카테고리 키 → 풀 인덱스 */
const CATEGORY_SLOT: Record<string, number> = {
  exam: 8, money: 3, love: 0, career: 11, health: 1, social: 7,
}

function slotIndex(kind: string, categoryKey?: string): number {
  if (kind === 'intro') return 2
  if (kind === 'overall') return 5
  if (kind === 'category' && categoryKey && categoryKey in CATEGORY_SLOT) return CATEGORY_SLOT[categoryKey]
  if (kind === 'caution') return 9
  if (kind === 'action' || kind === 'color') return 6
  if (kind === 'summary') return 4
  return 10
}

/** hex → sRGB 상대 휘도 근사(0~1). */
function lum(hex: string): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return 1
  const int = parseInt(m[1], 16)
  return (0.299 * ((int >> 16) & 255) + 0.587 * ((int >> 8) & 255) + 0.114 * (int & 255)) / 255
}

function inkFor(bgHex: string): { ink: string; inkLight: boolean } {
  return lum(bgHex) > 0.62 ? { ink: INK_DARK, inkLight: false } : { ink: INK_WHITE, inkLight: true }
}

function softInk(ink: string): string {
  return ink === INK_WHITE ? 'rgba(255,255,255,0.82)' : 'rgba(21,35,58,0.74)'
}

// 배경색 → 포인트 악센트 큐레이트 (보색 로직 대신 손으로 정한 고대비 조합)
const ACCENT_FOR: Record<string, string> = {
  '#FF2D78': '#C6F432',
  '#00C2B8': '#FF2D78',
  '#7B3FE4': '#FFD900',
  '#C6F432': '#7B3FE4',
  '#FFD900': '#FF2D78',
  '#FF6B00': '#1FA2C9',
  '#1B2A6B': '#FF8A1E',
  '#FF5A4D': '#3DA5FF',
  '#3DA5FF': '#FF6B00',
  '#E8489B': '#C6F432',
  '#2EA86B': '#FF2D78',
  '#3B49B0': '#FFD900',
  '#00A3A3': '#FF8A1E',
  '#F25C2A': '#3DA5FF',
  '#9D4EDD': '#C6F432',
  '#2BB673': '#FF2D78',
  '#FF8A1E': '#7B3FE4',
  '#E63946': '#FFD900',
  '#1FA2C9': '#FF6B00',
  '#6A4FE0': '#C6F432',
}

function popAccent(base: string): string {
  return ACCENT_FOR[base.toUpperCase()] ?? (inkFor(base).inkLight ? '#FFD900' : '#14224D')
}

/** 문자열 → 결정론 시드(0~). FNV-1a. */
export function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/** 시드 기반 풀 셔플(Fisher–Yates, mulberry-LCG). */
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

/** 단일 베이스색 → 비비드 스킨. */
export function paletteFromBase(base: string, accent?: string): CardPalette {
  const { ink, inkLight } = inkFor(base)
  const acc = accent ?? popAccent(base)
  return { bg: base, base, ink, inkSoft: softInk(ink), accent: acc, inkLight }
}

/** 카드 종류/카테고리 → Wrapped 비비드 스킨. seed로 사람·날짜마다 색 셔플. */
export function cardPalette(kind: string, categoryKey?: string, seed = 0): CardPalette {
  const idx = slotIndex(kind, categoryKey)
  const bgPool = shuffledPool(seed)
  const base = bgPool[idx % bgPool.length]
  return paletteFromBase(base)
}

// ── 그래픽 악센트 좌표 ────────────────────────────────────────────────────────

/** 결정적(deterministic) 흩뿌린 점 좌표 (퍼센트 0~100 + 반지름). */
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

export const SCATTER_DOTS = scatterDots(14)
