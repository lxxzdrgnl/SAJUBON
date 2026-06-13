import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

/** 색 토큰 완전성 — check-colors.mjs가 컴포넌트(.tsx)의 Tailwind arbitrary hex가
 *  design.md §2 토큰 또는 허용목록(오행·칩·스토리·너구리색 등) 내인지 검증한다.
 *  --strict 모드에서 미허용 hex가 있으면 비정상 종료(1) → 테스트 실패.
 *  목업 raw hex 재유입에 대한 회귀 가드. */
describe('색 토큰 완전성', () => {
  it('check-colors --strict 통과 (토큰 외 임의 hex 없음)', () => {
    const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'check-colors.mjs')
    expect(() => execFileSync('node', [script, '--strict'], { stdio: 'pipe' })).not.toThrow()
  })
})
