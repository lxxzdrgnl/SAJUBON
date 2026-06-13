/**
 * ScoreOverview — 정적 타입 계약 검증.
 * 런타임 DOM 렌더 없이 props 타입과 export가 올바른지만 확인한다.
 * (vitest glob이 lib/** 이므로 직접 실행되지 않지만 tsc --noEmit로 검증됨.)
 */
import type { ScoreOverviewProps, CompatibilityScore } from './ScoreOverview'

// ── 샘플 데이터 ───────────────────────────────────────────────────────────────

const sampleScore: CompatibilityScore = {
  total: 87,
  day_pillar: 90,
  element_harmony: 85,
  branch_relation: 80,
  ten_gods: 92,
}

// 최소 필수 props (score만)
const propsMinimal: ScoreOverviewProps = {
  score: sampleScore,
}

// 이름 포함
const propsWithNames: ScoreOverviewProps = {
  score: sampleScore,
  nameA: '이용재',
  nameB: '유다연',
}

// 점수 ≥ 90 (highBadge 표시)
const propsHighScore: ScoreOverviewProps = {
  score: { total: 97, day_pillar: 95, element_harmony: 98, branch_relation: 96, ten_gods: 99 },
  nameA: '철수',
  nameB: '영희',
}

// 점수 ≤ 35 (lowBadge 표시)
const propsLowScore: ScoreOverviewProps = {
  score: { total: 30, day_pillar: 25, element_harmony: 35, branch_relation: 28, ten_gods: 32 },
}

// 타입 단언 — 컴파일만 통과하면 됨
void propsMinimal
void propsWithNames
void propsHighScore
void propsLowScore
