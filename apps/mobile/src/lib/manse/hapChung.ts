import type { SajuCalcResponse } from '@sajuguri/api-client'

/** 합충 분석 로직 — 레거시 HapChungPanel.vue 가공 로직 보존 (branch_relations·gong_mang 해석) */

export type PillarKey = 'year' | 'month' | 'day' | 'hour'
export const PKEYS: PillarKey[] = ['year', 'month', 'day', 'hour']
export const PLABEL: Record<PillarKey, string> = { year: '연', month: '월', day: '일', hour: '시' }

export type TabKey =
  | 'gung_seong' | 'cheon_gan_hap' | 'yuk_hap' | 'sam_hap' | 'bang_hap'
  | 'cheon_gan_chung' | 'chung' | 'gong_mang' | 'sam_hyeong' | 'pa' | 'yuk_hae' | 'won_jin'

export const ALL_TABS: { key: TabKey; label: string }[] = [
  { key: 'gung_seong', label: '궁성' },
  { key: 'cheon_gan_hap', label: '천간합' },
  { key: 'yuk_hap', label: '지지육합' },
  { key: 'sam_hap', label: '지지삼합' },
  { key: 'bang_hap', label: '지지방합' },
  { key: 'cheon_gan_chung', label: '천간충' },
  { key: 'chung', label: '지지충' },
  { key: 'gong_mang', label: '공망' },
  { key: 'sam_hyeong', label: '형' },
  { key: 'pa', label: '파' },
  { key: 'yuk_hae', label: '해' },
  { key: 'won_jin', label: '원진' },
]

const SAM_HYEONG: Record<string, string[]> = {
  인사신형: ['인', '사', '신'],
  축술미형: ['축', '술', '미'],
  자형: ['자'],
  오형: ['오'],
}

export interface Entry {
  text: string
  stems: PillarKey[]
  branches: PillarKey[]
  resultEl?: string
  broken?: boolean
}

interface PillarLike { stem: string; branch: string }

function pillarOf(saju: SajuCalcResponse, p: PillarKey): PillarLike | null {
  return (saju[`${p}_pillar`] as PillarLike | null) ?? null
}

export function activePillars(saju: SajuCalcResponse): PillarKey[] {
  return PKEYS.filter((p) => pillarOf(saju, p) !== null)
}

function findBranch(saju: SajuCalcResponse, b: string): PillarKey[] {
  return activePillars(saju).filter((p) => pillarOf(saju, p)!.branch === b)
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function buildPairEntries(saju: SajuCalcResponse, val: any[], textFn: (pair: string[], desc: string) => string): Entry[] {
  return val.map((v) => {
    const pair: string[] = v.pair ?? v
    const pillars: PillarKey[] = (v.pillars as string[] | undefined)?.map((p) => p as PillarKey) ?? pair.flatMap((b) => findBranch(saju, b))
    const desc = v.pillars ? `(${pillars.map((p) => PLABEL[p] + '주').join('-')}) ` : ''
    return { text: textFn(pair, desc), stems: [], branches: pillars }
  })
}

function buildStemEntries(val: any[], textFn: (v: any) => string, extra: (v: any) => Partial<Entry> = () => ({})): Entry[] {
  return val.map((v) => ({ text: textFn(v), stems: (v.pillars as string[]).map((p) => p as PillarKey), branches: [], ...extra(v) }))
}

function buildGroupHap(saju: SajuCalcResponse, val: any): Entry[] {
  return (Array.isArray(val) ? val : [val]).map((item) => ({
    text: `지지에 <b>${item.name ?? item.label ?? ''}</b>이 있어요.`,
    stems: [],
    branches: (item.branches ?? []).flatMap((b: string) => findBranch(saju, b)),
    resultEl: item.element,
  }))
}

/** 탭별 엔트리 빌드 (HapChungPanel.vue ENTRY_BUILDERS·entries 보존) */
export function buildEntries(saju: SajuCalcResponse, key: TabKey): Entry[] {
  if (key === 'gung_seong') return []
  const br = (saju.branch_relations ?? {}) as Record<string, any>
  const gm = saju.gong_mang ?? { vacant_branches: [], affected_pillars: [] }

  if (key === 'gong_mang') {
    const vacant = gm.vacant_branches
    return gm.affected_pillars.map((p) => {
      const pk = p as PillarKey
      return {
        text: `<b>${PLABEL[pk]}주 지지 ${pillarOf(saju, pk)?.branch}</b>가 공망이에요. (공망 지지: ${vacant.join(', ')})`,
        stems: [],
        branches: [pk],
      }
    })
  }

  const val = br[key]
  if (!val) return []

  switch (key) {
    case 'cheon_gan_hap':
      return buildStemEntries(val, (x) => `천간에 <b>${x.name ?? x.stems?.join('')}</b>이 있어요.`, (x) => ({ resultEl: x.result_element }))
    case 'cheon_gan_chung':
      return buildStemEntries(val, (x) => `천간에 <b>${x.name}</b>이 있어요.`)
    case 'yuk_hap':
      return (val as any[]).map((v) => {
        const pair: string[] = v.pair ?? []
        const pillars: PillarKey[] = (v.pillars as string[] | undefined)?.map((p) => p as PillarKey) ?? pair.flatMap((b) => findBranch(saju, b))
        const desc = pillars.length ? `(${pillars.map((p) => PLABEL[p] + '주').join('-')}) ` : ''
        return { text: `${desc}지지에 <b>${pair.join('')}육합</b>이 있어요.`, stems: [], branches: pillars, resultEl: v.element, broken: v.is_effective === false }
      })
    case 'sam_hap':
    case 'bang_hap':
      return buildGroupHap(saju, val)
    case 'sam_hyeong':
      return (val as string[]).map((name) => ({ text: `지지에 <b>${name}</b>이 있어요.`, stems: [], branches: (SAM_HYEONG[name] ?? []).flatMap((b) => findBranch(saju, b)) }))
    case 'chung':
      return buildPairEntries(saju, val, (p, d) => `${d}지지에 <b>${p.join('충')}</b>이 있어요.`)
    case 'yuk_hae':
      return buildPairEntries(saju, val, (p, d) => `${d}지지에 <b>${p.join('·')}해</b>가 있어요.`)
    case 'pa':
      return buildPairEntries(saju, val, (p, d) => `${d}지지에 <b>${p.join('·')}파</b>가 있어요.`)
    case 'won_jin':
      return buildPairEntries(saju, val, (p, d) => `${d}지지에 <b>${p.join('·')}원진</b>이 있어요.`)
    default:
      return []
  }
}

/** 탭에 표시할 데이터가 있는지 (HapChungPanel.vue hasData 보존) */
export function hasData(saju: SajuCalcResponse, key: TabKey): boolean {
  if (key === 'gung_seong') return true
  if (key === 'gong_mang') return (saju.gong_mang?.affected_pillars.length ?? 0) > 0
  const val = (saju.branch_relations as Record<string, any>)?.[key]
  if (!val) return false
  if (Array.isArray(val)) return val.length > 0
  if (typeof val === 'object') return Object.keys(val).length > 0
  return Boolean(val)
}
