/**
 * 운세 요약 카드 캔버스 레이아웃 계산 — 순수 로직 (브라우저 API 없음).
 * 1080×1920 (인스타 스토리 비율).
 */

export interface ScoreBarLayout {
  label: string
  score: number
  y: number
  barX: number
  barMaxWidth: number
  labelX: number
  valueX: number
}

export interface SummaryCardLayout {
  width: number
  height: number
  padding: number
  dateY: number
  titleY: number
  keywordY: number
  barsStartY: number
  barHeight: number
  barGap: number
  watermarkY: number
  scoreBars: Omit<ScoreBarLayout, 'barX' | 'barMaxWidth' | 'labelX' | 'valueX'>[]
}

const CANVAS_W = 1080
const CANVAS_H = 1920
const PAD = 80

const CATEGORY_LABELS: Record<string, string> = {
  exam:    '학업',
  money:   '금전',
  love:    '연애',
  career:  '직업',
  health:  '건강',
  social:  '사교',
}

/**
 * 점수 바 6개 레이아웃을 계산한다.
 * @param scores  { exam: 72, money: 80, ... }
 * @param startY  첫 번째 바의 Y 위치
 */
export function calcScoreBars(
  scores: Record<string, number>,
  startY: number,
): ScoreBarLayout[] {
  const barH = 36
  const gap = 28
  const barX = PAD + 140
  const barMaxWidth = CANVAS_W - barX - PAD
  const labelX = PAD
  const valueX = CANVAS_W - PAD

  const keys = Object.keys(CATEGORY_LABELS).filter((k) => k in scores)
  return keys.map((key, i) => ({
    label: CATEGORY_LABELS[key] ?? key,
    score: scores[key] ?? 0,
    y: startY + i * (barH + gap),
    barX,
    barMaxWidth,
    labelX,
    valueX,
  }))
}

/** 전체 요약 카드 레이아웃 계산. */
export function calcSummaryCardLayout(scores: Record<string, number>): SummaryCardLayout {
  const barsStartY = 680
  const bars = calcScoreBars(scores, 0) // Y 계산용
  const barsH = bars.length * (36 + 28)

  return {
    width: CANVAS_W,
    height: CANVAS_H,
    padding: PAD,
    dateY: PAD + 40,
    titleY: PAD + 110,
    keywordY: PAD + 200,
    barsStartY,
    barHeight: 36,
    barGap: 28,
    watermarkY: CANVAS_H - PAD - 40,
    scoreBars: Object.keys(CATEGORY_LABELS)
      .filter((k) => k in scores)
      .map((key, i) => ({
        label: CATEGORY_LABELS[key] ?? key,
        score: scores[key] ?? 0,
        y: barsStartY + i * (36 + 28),
      })),
  }
}
