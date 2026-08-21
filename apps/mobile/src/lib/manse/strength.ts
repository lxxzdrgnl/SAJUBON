// 일간 강약 — 8단계 레벨과 실제 사주 분포(신강/신약지수) 헬퍼.
// 레거시 StrengthBar.vue·StrengthChart.vue 데이터 보존.

/** 약 → 강 순 8단계 */
export const LEVELS_8 = ['극약', '태약', '신약', '중화신약', '중화신강', '신강', '태강', '극왕'] as const

const LEVEL_IDX: Record<string, number> = Object.fromEntries(LEVELS_8.map((l, i) => [l, i]))

/** 실제 사주 10,000건 시뮬레이션 분포(%) — scripts/compute_strength_dist.py */
export const STRENGTH_DIST = [22.4, 15.7, 20.6, 9.2, 15.7, 25.0, 9.1, 0.8]

/** level_8 → 인덱스 (미지정은 중앙=4) */
export function levelIndex(level8: string): number {
  return LEVEL_IDX[level8] ?? 4
}

/** 해당 레벨에 속하는 인구 비율(%) — 소수 1자리 문자열 */
export function levelPercentile(level8: string): string {
  const total = STRENGTH_DIST.reduce((a, b) => a + b, 0)
  return ((STRENGTH_DIST[levelIndex(level8)] / total) * 100).toFixed(1)
}

/** 0~100 클램프 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score))
}
