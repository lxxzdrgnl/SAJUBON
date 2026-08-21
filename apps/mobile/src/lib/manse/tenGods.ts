/** 십성 분석 로직 — 레거시 SipseongDonutChart.vue 가공 로직 보존 */

/** 십성 → 오행 매핑 (편/정 같은 오행) */
export const TG_ELEMENT: Record<string, string> = {
  비견: '목', 겁재: '목',
  식신: '화', 상관: '화',
  편재: '토', 정재: '토',
  편관: '금', 정관: '금',
  편인: '수', 정인: '수',
}

/** 도넛 표시 순서 */
export const TG_ORDER = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const

/** 십성 → 5그룹 */
export const TG_GROUP: Record<string, string> = {
  비견: '비겁', 겁재: '비겁',
  식신: '식상', 상관: '식상',
  편재: '재성', 정재: '재성',
  편관: '관성', 정관: '관성',
  편인: '인성', 정인: '인성',
}

export const GROUP_ORDER = ['비겁', '식상', '재성', '관성', '인성'] as const

export const GROUP_LABEL: Record<string, string> = {
  비겁: '자아·독립', 식상: '표현·창의',
  재성: '재물·현실', 관성: '명예·규범', 인성: '학문·보호',
}

export interface GroupSummaryItem {
  group: string
  label: string
  pct: number
}

/** 그룹 합산 후 비율 내림차순 (값 0 제외) — SipseongDonutChart.vue groupSummary 보존 */
export function groupSummary(dist: Record<string, number>): GroupSummaryItem[] {
  const groups: Record<string, number> = {}
  for (const [ss, pct] of Object.entries(dist)) {
    const g = TG_GROUP[ss]
    if (g) groups[g] = (groups[g] ?? 0) + pct
  }
  return GROUP_ORDER
    .filter((g) => (groups[g] ?? 0) > 0)
    .map((g) => ({ group: g, label: GROUP_LABEL[g], pct: groups[g] ?? 0 }))
    .sort((a, b) => b.pct - a.pct)
}

/** 상위 2개 그룹 = 핵심 구조 (SipseongDonutChart.vue dominantGroups 보존) */
export function dominantGroups(dist: Record<string, number>): string[] {
  return groupSummary(dist).slice(0, 2).map((g) => g.group)
}

export interface DonutArc {
  ss: string
  pct: number
  color: string
  /** SVG path d — 도넛 세그먼트 (반지름 고정) */
  d: string
}

const R_OUTER = 52
const R_INNER = 33
const CX = 60
const CY = 60

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

/** 십성 분포 → 도넛 아크 배열 (12시 방향 시작, 시계방향). 색은 colorOf 주입 */
export function donutArcs(dist: Record<string, number>, colorOf: (ss: string) => string): DonutArc[] {
  const items = TG_ORDER.map((ss) => ({ ss, pct: dist[ss] ?? 0 })).filter((x) => x.pct > 0)
  const total = items.reduce((a, x) => a + x.pct, 0)
  if (total === 0) return []
  let angle = 0
  return items.map(({ ss, pct }) => {
    const sweep = (pct / total) * 360
    const start = angle
    const end = angle + sweep
    angle = end
    const [x0o, y0o] = polar(CX, CY, R_OUTER, start)
    const [x1o, y1o] = polar(CX, CY, R_OUTER, end)
    const [x1i, y1i] = polar(CX, CY, R_INNER, end)
    const [x0i, y0i] = polar(CX, CY, R_INNER, start)
    const large = sweep > 180 ? 1 : 0
    const d = `M${x0o.toFixed(2)},${y0o.toFixed(2)} A${R_OUTER},${R_OUTER} 0 ${large} 1 ${x1o.toFixed(2)},${y1o.toFixed(2)} L${x1i.toFixed(2)},${y1i.toFixed(2)} A${R_INNER},${R_INNER} 0 ${large} 0 ${x0i.toFixed(2)},${y0i.toFixed(2)} Z`
    return { ss, pct, color: colorOf(ss), d }
  })
}

export const DONUT_GEOMETRY = { CX, CY, R_INNER, R_OUTER }
