import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

/** i18n 키 완전성 — check-i18n.mjs가 ko/en 키 일치 + 컴포넌트 t() 키 존재를 검증.
 *  누락 시 스크립트가 비정상 종료(1)하므로 execFileSync가 throw → 테스트 실패. */
describe('i18n 키 완전성', () => {
  it('check-i18n 스크립트 통과 (누락 키 없음)', () => {
    const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'check-i18n.mjs')
    expect(() => execFileSync('node', [script], { stdio: 'pipe' })).not.toThrow()
  })
})
