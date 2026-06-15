import type { SajuCalcResponse, Pillar, SinSal } from '@sajuguri/api-client'

/** 기둥 위치 키 — 시→일→월→연 (분석 화면 표시 순서, 좌→우) */
export type PillarLoc = 'hour' | 'day' | 'month' | 'year'

export interface PillarSlot {
  loc: PillarLoc
  label: string          // 시주·일주·월주·연주
  colLabel: string       // 생시·생일·생월·생년
  pillar: Pillar | null
}

const PILLAR_META: { loc: PillarLoc; key: keyof SajuCalcResponse; label: string; colLabel: string }[] = [
  { loc: 'hour',  key: 'hour_pillar',  label: '시주', colLabel: '생시' },
  { loc: 'day',   key: 'day_pillar',   label: '일주', colLabel: '생일' },
  { loc: 'month', key: 'month_pillar', label: '월주', colLabel: '생월' },
  { loc: 'year',  key: 'year_pillar',  label: '연주', colLabel: '생년' },
]

/** calc 응답을 시→일→월→연 순 4슬롯으로 — 시주 미입력은 pillar=null (Table.vue 순서 보존) */
export function pillarSlots(data: SajuCalcResponse): PillarSlot[] {
  return PILLAR_META.map((m) => ({
    loc: m.loc,
    label: m.label,
    colLabel: m.colLabel,
    pillar: (data[m.key] as Pillar | null) ?? null,
  }))
}

/** 특정 기둥에 걸린 신살 — location이 키와 정확히 같거나 그 키로 시작 (Table.vue pillarSinSals 보존) */
export function sinSalsForPillar(sinSals: SinSal[], loc: PillarLoc): SinSal[] {
  return (sinSals ?? []).filter((s) =>
    s.location?.some((l) => l === loc || l.startsWith(loc)),
  )
}

/** 기둥의 지장간 문자열 — ['병','기','경'] → '병기경' (Table.vue join 보존) */
export function jiJangGanText(jiJangGan: Record<string, string[]>, loc: PillarLoc): string {
  return (jiJangGan?.[loc] ?? []).join('')
}
