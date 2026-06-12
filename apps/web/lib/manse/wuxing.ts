/** 오행 분석 로직 — 레거시 WuxingBalanceTable.vue·WuxingPentagram.vue 가공 로직 보존 */

export const WUXING_ORDER = ['목', '화', '토', '금', '수'] as const
export type Wuxing = (typeof WUXING_ORDER)[number]
export type Verdict = '과다' | '부족' | '적정'

/** raw count 맵을 합계 100% 비율로 정규화 (정수 반올림) — wuxing_count_hap 등 입력 */
export function toPercent(counts: Record<string, number>): Record<Wuxing, number> {
  const total = WUXING_ORDER.reduce((a, el) => a + (counts[el] ?? 0), 0)
  const out = {} as Record<Wuxing, number>
  for (const el of WUXING_ORDER) {
    out[el] = total === 0 ? 0 : Math.round(((counts[el] ?? 0) / total) * 100)
  }
  return out
}

/** 판정: <10 부족, >30 과다, 그 외 적정 (WuxingBalanceTable.vue judge 보존) */
export function judge(pct: number): Verdict {
  if (pct < 10) return '부족'
  if (pct > 30) return '과다'
  return '적정'
}

/** 균형도 = 100 - 편차합/2 (각 오행 20% 기준). 0~100 (WuxingBalanceTable.vue 보존) */
export function balanceScore(pct: Record<string, number>): number {
  const total = WUXING_ORDER.reduce((a, el) => a + (pct[el] ?? 0), 0)
  if (total === 0) return 0
  const dev = WUXING_ORDER.reduce((s, el) => s + Math.abs((pct[el] ?? 0) - 20), 0)
  return Math.max(0, Math.round(100 - dev / 2))
}

/** 균형 라벨: ≥80 균형, ≥60 보통, 그 외 불균형 */
export function balanceLabel(score: number): { text: string; tone: 'good' | 'mid' | 'bad' } {
  if (score >= 80) return { text: '균형', tone: 'good' }
  if (score >= 60) return { text: '보통', tone: 'mid' }
  return { text: '불균형', tone: 'bad' }
}

/** 과다(>30)·부족(<10) 오행 요약 문장 데이터 */
export function balanceSummary(pct: Record<string, number>): { over: Wuxing[]; lack: Wuxing[] } {
  return {
    over: WUXING_ORDER.filter((el) => (pct[el] ?? 0) > 30),
    lack: WUXING_ORDER.filter((el) => (pct[el] ?? 0) < 10),
  }
}

// ── 펜타그램 기하 (WuxingPentagram.vue 보존) ──────────────────────────────────

const CX = 150
const CY = 150
const BASE_RADIUS = 90
const ANGLES_DEG = [-90, -18, 54, 126, 198] // 목·화·토·금·수 꼭짓점

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export interface Vertex {
  x: number
  y: number
}

export function pentagramVertices(): Vertex[] {
  return ANGLES_DEG.map((deg) => ({
    x: CX + BASE_RADIUS * Math.cos(toRad(deg)),
    y: CY + BASE_RADIUS * Math.sin(toRad(deg)),
  }))
}

/** 오행 비율(%) → 노드 반지름 14~32 (WuxingPentagram.vue circleRadius 보존) */
export function nodeRadius(pct: number): number {
  return Math.max(14, Math.min(32, 14 + (pct / 100) * 18))
}

export const SANG_SAENG_PAIRS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] as const
export const SANG_GEUK_PAIRS = [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]] as const

/** 상생 화살표 경로 — 노드 가장자리에서 가장자리로 (WuxingPentagram.vue arrowPath 보존) */
export function arrowPath(v: Vertex[], pct: Record<string, number>, fromIdx: number, toIdx: number): string {
  const from = v[fromIdx]
  const to = v[toIdx]
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const rFrom = nodeRadius(pct[WUXING_ORDER[fromIdx]] ?? 0)
  const rTo = nodeRadius(pct[WUXING_ORDER[toIdx]] ?? 0)
  const ux = dx / dist
  const uy = dy / dist
  return `M${(from.x + ux * (rFrom + 3)).toFixed(2)},${(from.y + uy * (rFrom + 3)).toFixed(2)} L${(to.x - ux * (rTo + 6)).toFixed(2)},${(to.y - uy * (rTo + 6)).toFixed(2)}`
}

export function linePath(v: Vertex[], fromIdx: number, toIdx: number): string {
  return `M${v[fromIdx].x.toFixed(2)},${v[fromIdx].y.toFixed(2)} L${v[toIdx].x.toFixed(2)},${v[toIdx].y.toFixed(2)}`
}

/** % 레이블 위치 — 노드 바깥쪽 (WuxingPentagram.vue pctLabelPos 보존) */
export function pctLabelPos(v: Vertex[], pct: Record<string, number>, i: number): Vertex {
  const node = v[i]
  const dx = node.x - CX
  const dy = node.y - CY
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const offset = nodeRadius(pct[WUXING_ORDER[i]] ?? 0) + 14
  return { x: node.x + (dx / dist) * offset, y: node.y + (dy / dist) * offset + 4 }
}

// ── 궁성 가중치·합화 반영 (레거시 ResultPanel.vue 토글 로직 보존 — G3) ──────────

/** 궁성(자리)별 가중치 — 월지 2.0·일간 1.5가 핵심 자리 */
export const PALACE_WEIGHTS: Record<string, Record<string, number>> = {
  year:  { stem: 1.0, branch: 1.0 },
  month: { stem: 1.0, branch: 2.0 },
  day:   { stem: 1.5, branch: 1.0 },
  hour:  { stem: 1.0, branch: 0.8 },
}

type WuxingChar = { pillar: string; type: string; element: string }
type HapContribution = {
  pillar: string; type: string; hap_type: string | null
  base_element: string; hap_element: string | null; hap_ratio: number
}

function normalize(counts: Record<Wuxing, number>): Record<Wuxing, number> {
  const total = WUXING_ORDER.reduce((a, el) => a + counts[el], 0)
  if (total === 0) return counts
  const out = {} as Record<Wuxing, number>
  for (const el of WUXING_ORDER) out[el] = Math.round((counts[el] / total) * 100)
  return out
}

/** 조후·궁성 보정만 적용 (합 미반영) */
export function applyPalaceWeights(chars: WuxingChar[]): Record<Wuxing, number> {
  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<Wuxing, number>
  for (const ch of chars) {
    if (!WUXING_ORDER.includes(ch.element as Wuxing)) continue
    counts[ch.element as Wuxing] += PALACE_WEIGHTS[ch.pillar]?.[ch.type] ?? 1
  }
  return normalize(counts)
}

/** 합화 ratio + 궁성 가중치 동시 적용 (이진 변환 방지) */
export function applyPalaceWeightsWithHap(contributions: HapContribution[]): Record<Wuxing, number> {
  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<Wuxing, number>
  for (const c of contributions) {
    const w = PALACE_WEIGHTS[c.pillar]?.[c.type] ?? 1
    if (c.hap_element && c.hap_ratio > 0) {
      if (WUXING_ORDER.includes(c.base_element as Wuxing)) counts[c.base_element as Wuxing] += w * (1 - c.hap_ratio)
      if (WUXING_ORDER.includes(c.hap_element as Wuxing)) counts[c.hap_element as Wuxing] += w * c.hap_ratio
    } else if (WUXING_ORDER.includes(c.base_element as Wuxing)) {
      counts[c.base_element as Wuxing] += w
    }
  }
  return normalize(counts)
}

/** 토글 상태 → 비율 선택 (레거시 wuxingPercent computed와 동일 분기) */
export function selectWuxingPercent(
  data: {
    wuxing_count: Record<string, number>
    wuxing_count_hap: Record<string, number>
    wuxing_chars: WuxingChar[]
    wuxing_hap_contributions: HapContribution[]
  },
  applyHap: boolean,
  applyJohu: boolean,
): Record<Wuxing, number> {
  if (applyJohu && applyHap) return applyPalaceWeightsWithHap(data.wuxing_hap_contributions)
  if (applyJohu) return applyPalaceWeights(data.wuxing_chars)
  return toPercent(applyHap ? (data.wuxing_count_hap ?? data.wuxing_count) : data.wuxing_count)
}
