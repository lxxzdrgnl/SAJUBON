/** 사주구리 디자인 토큰 — 단일 진실 원천: docs/design.md */

export const colors = {
  bgBase: '#EEF1F6',
  ink: '#14161C',
  yellow: '#FFD900',
  yellowTint: '#FFF3B0',
  amber: '#FFB200',
  orange: '#FF6B00',
  orangeTint: '#FFE1CC',
  teal: '#00C2B8',
  tealDeep: '#00857D',
  tealTint: '#D7F7F4',
  surface: '#FFFFFF',
  borderSoft: '#C8D0DE',
  textSub: '#6B7488',
  sky: '#4DA8E8',
  skyTint: '#DCEFFB',
} as const

/** 오행 5색 — 전통 5색 대체, 팔레트 파생 (design.md §2.2) */
export const ohaeng = {
  목: '#00A86B',
  화: '#FF6B00',
  토: '#D9A400',
  금: '#7D7A70',
  수: '#0090A8',
} as const

/** 기둥 카드 배경 틴트 */
export const ohaengTint = {
  목: '#E9FAF1',
  화: '#FFF1E8',
  토: '#FBF3D9',
  금: '#F4F2EC',
  수: '#E8F7FA',
} as const

/** 스토리(오늘의 운세) 전용 */
export const story = {
  gradientFrom: '#00857D',
  gradientTo: '#04332F',
  score: '#FF8A2E',
  progressFill: '#FFD900',
} as const

export const radius = {
  card: '10px',
  button: '8px',
  chip: '8px',
  pill: '999px',
  sheet: '16px',
} as const

export const shadow = {
  brutal: '4px 4px 0 var(--ink)',
  brutalSm: '2px 2px 0 var(--ink)',
  brutalOrange: '4px 4px 0 var(--orange)',
} as const

/** Y2K 재료 — 크롬(금속 다단)·홀로그램(무지개 conic)·글로스(광택 inset) */
export const y2k = {
  chrome:
    'linear-gradient(158deg,#FDFEFF 0%,#CBD4E2 16%,#8E9BB0 32%,#EAEFF7 46%,' +
    '#6E7C93 60%,#AEBACB 74%,#F4F8FD 100%)',
  holo:
    'conic-gradient(from 210deg,#6EE7FF,#C6F432,#FFD900,#FF5FD2,#A78BFA,#6EE7FF)',
  gloss:
    'inset 0 1.5px 0 rgba(255,255,255,.9), inset 0 -3px 8px rgba(20,22,28,.10)',
  specular:
    'linear-gradient(102deg,transparent 34%,rgba(255,255,255,.85) 46%,transparent 56%)',
} as const

/** 차트 점수 색 의미: 피크=orange, 중간=yellow, 저점=tealTint */
export const chartScore = {
  peak: colors.orange,
  mid: colors.yellow,
  low: colors.tealTint,
} as const

export const layout = {
  maxWidth: '640px',
} as const

/** colors만 CSS 변수 :root 블록으로 변환 (radius·shadow 등은 대상 아님) — apps/web globals.css에서 사용 */
export function toCssVariables(): string {
  const entries: string[] = []
  for (const [k, v] of Object.entries(colors)) {
    entries.push(`--${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v};`)
  }
  return `:root {\n  ${entries.join('\n  ')}\n}`
}
