#!/usr/bin/env node
/**
 * en.json 미번역 한글 가드.
 *
 * en.json의 모든 문자열 값을 재귀 스캔해 한글([가-힣])이 포함된 값을 찾는다.
 * allowlist에 등재된 키 경로는 의도적인 한글이므로 통과시킨다.
 * 위반 발견 시 경로+값을 출력하고 process.exit(1).
 *
 * 사용: node apps/web/scripts/check-en-untranslated.mjs
 *       (CWD = apps/web 또는 repo root)
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const enPath = join(webRoot, 'messages/en.json')

/**
 * 의도적으로 한글을 포함하는 키 경로 (allowlist).
 * 추가 시 이유를 주석으로 달 것.
 */
const ALLOWLIST = new Set([
  // 언어 토글의 '한국어' 라벨 — 언어명 자체가 한국어로 표기되어야 함
  'my.language.ko',
  'settings.langKo',
  // 명리 용어 병기 라벨 — 영문 제목 뒤에 한자어를 괄호로 보조 표기 (의도된 bilingual)
  'manse.charts.daeUn.title',   // "Great Luck (대운)"
  'manse.charts.ilJin.title',   // "Daily Almanac (일진)"
])

const HANGUL = /[가-힣]/

function walk(obj, prefix = '') {
  const violations = []
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    const path = prefix ? `${prefix}.${key}` : key
    if (val && typeof val === 'object') {
      violations.push(...walk(val, path))
    } else if (typeof val === 'string') {
      if (HANGUL.test(val) && !ALLOWLIST.has(path)) {
        violations.push({ path, val })
      }
    }
  }
  return violations
}

const en = JSON.parse(readFileSync(enPath, 'utf8'))
const violations = walk(en)

if (violations.length > 0) {
  console.error(`\n✗ en.json 미번역 한글 ${violations.length}건 (allowlist 외):`)
  for (const { path, val } of violations) {
    console.error(`  ${path} = ${JSON.stringify(val)}`)
  }
  console.error('\n  번역 후 allowlist에 등재하거나 영어로 교체하세요.')
  process.exit(1)
}

console.log('✓ en.json 미번역 한글 없음')
