import { colors, ohaeng, ohaengTint } from '@sajuguri/design'

/** 엔진이 주는 한글 오행명('목'|'화'|'토'|'금'|'수')을 색으로 — 미지정 값은 잉크/서피스 폴백 */
export function ohaengColor(element: string): string {
  return (ohaeng as Record<string, string>)[element] ?? colors.ink
}

export function ohaengTintColor(element: string): string {
  return (ohaengTint as Record<string, string>)[element] ?? colors.surface
}
