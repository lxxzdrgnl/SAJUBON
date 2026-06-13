/**
 * ElementFlowDiagram — 정적 타입 계약 검증.
 * 런타임 DOM 렌더 없이 props 타입과 export가 올바른지만 확인한다.
 * (vitest glob이 lib/** 이므로 직접 실행되지 않지만 tsc --noEmit로 검증됨.)
 */
import type { ElementFlowDiagramProps, CompatibilitySynastry } from './ElementFlowDiagram'

// ── 샘플 데이터 ───────────────────────────────────────────────────────────────

const fullSynastry: CompatibilitySynastry = {
  stem_hap: '수(水)',
  day_ten_god: '정재',
  element_synergy: '상생',
  clash_pairs: [['子', '午'], ['卯', '酉']],
  complement_a_to_b: ['수(水)', '목(木)'],
  complement_b_to_a: ['화(火)'],
  yongsin_help: 'a_helps_b',
  interaction_tags: ['천간합화', '상생', '지지충'],
}

// stem_hap이 null인 케이스
const synastryNoStemHap: CompatibilitySynastry = {
  stem_hap: null,
  day_ten_god: '편관',
  element_synergy: '상극',
  clash_pairs: [],
  complement_a_to_b: [],
  complement_b_to_a: ['토(土)'],
  yongsin_help: 'mutual',
  interaction_tags: ['상극'],
}

// 최소 케이스 (nullable 전부 null, 배열 전부 빈)
const synastryMinimal: CompatibilitySynastry = {
  stem_hap: null,
  day_ten_god: '비견',
  element_synergy: null,
  clash_pairs: [],
  complement_a_to_b: [],
  complement_b_to_a: [],
  yongsin_help: null,
  interaction_tags: [],
}

// props 구성 검증
const propsWithFull: ElementFlowDiagramProps = {
  synastry: fullSynastry,
  nameA: '이용재',
  nameB: '유다연',
}

const propsNoStemHap: ElementFlowDiagramProps = {
  synastry: synastryNoStemHap,
  nameA: '철수',
  nameB: '영희',
}

const propsMinimal: ElementFlowDiagramProps = {
  synastry: synastryMinimal,
  nameA: 'A',
  nameB: 'B',
}

// yongsin_help 유니온 타입 검증
const validYongsinValues: Array<CompatibilitySynastry['yongsin_help']> = [
  'a_helps_b',
  'b_helps_a',
  'mutual',
  null,
]

// 타입 단언 — 컴파일만 통과하면 됨
void propsWithFull
void propsNoStemHap
void propsMinimal
void validYongsinValues
