// RN 테마 — 색은 @sajuguri/design(단일 진실 원천)에서 가져오고,
// CSS 문자열(그림자 '4px 4px 0' 등)은 RN에 안 맞으므로 RN용 수치 토큰을 따로 둔다.
import { colors, ohaeng, ohaengTint, story } from '@sajuguri/design'

export { colors, ohaeng, ohaengTint, story }

/** 둥근 모서리 — px 수치 (디자인 토큰의 string 버전 대체) */
export const radii = {
  card: 16,
  button: 11,
  chip: 10,
  pill: 999,
  sheet: 22,
} as const

/** 브루탈 하드오프셋 그림자 — RN엔 blur 없는 오프셋 그림자가 없어 BrutalShadow 프리미티브로 구현.
 *  여기엔 그 오프셋/색 토큰만 둔다 (components/ui/BrutalShadow.tsx 참고). */
export const brutalShadow = {
  offset: 4,
  offsetSm: 2,
  ink: colors.ink,
  orange: colors.orange,
} as const

/** 단일 컬럼 최대 너비 (design.md §7) */
export const MAX_WIDTH = 640
