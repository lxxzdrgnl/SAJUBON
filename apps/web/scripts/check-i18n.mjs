#!/usr/bin/env node
/**
 * i18n 키 검증 — 컴포넌트의 t('...') 사용 키가 ko/en 메시지에 모두 존재하는지,
 * ko/en 키 집합이 일치하는지 확인한다. 누락 시 비정상 종료(1).
 * 사용: node apps/web/scripts/check-i18n.mjs  (CWD = apps/web 또는 repo root)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function flatten(obj, prefix = '') {
  const out = new Set()
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') for (const c of flatten(v, key)) out.add(c)
    else out.add(key)
  }
  return out
}

const ko = flatten(JSON.parse(readFileSync(join(webRoot, 'messages/ko.json'), 'utf8')))
const en = flatten(JSON.parse(readFileSync(join(webRoot, 'messages/en.json'), 'utf8')))

const errors = []

// 1) ko/en 키 집합 일치
for (const k of ko) if (!en.has(k)) errors.push(`en에 누락: ${k}`)
for (const k of en) if (!ko.has(k)) errors.push(`ko에 누락: ${k}`)

// 2) 컴포넌트 사용 키 검증 — useTranslations/getTranslations('ns') + t('key') 조합
function walk(dir) {
  const files = []
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e.startsWith('.next-')) continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) files.push(...walk(p))
    else if (/\.(tsx|ts)$/.test(e) && !e.endsWith('.test.ts')) files.push(p)
  }
  return files
}

for (const file of [...walk(join(webRoot, 'app')), ...walk(join(webRoot, 'components'))]) {
  const src = readFileSync(file, 'utf8')
  // 파일 내 모든 네임스페이스 (useTranslations('a.b') / getTranslations('a.b'))
  const namespaces = [...src.matchAll(/(?:useTranslations|getTranslations)\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
  if (namespaces.length === 0) continue
  // t('key') / t('key', {...}) — 정적 문자열만 (동적 키는 검증 불가, 스킵)
  for (const m of src.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) {
    const key = m[1]
    // 어느 한 네임스페이스에서라도 풀리면 OK (한 파일에 ns 여러 개 가능)
    const ok = namespaces.some((ns) => ko.has(`${ns}.${key}`))
    if (!ok) errors.push(`${file.replace(webRoot + '/', '')}: t('${key}') → ${namespaces.map((n) => `${n}.${key}`).join(' | ')} 없음`)
  }
}

if (errors.length) {
  console.error(`\n✗ i18n 검증 실패 (${errors.length}건):`)
  for (const e of [...new Set(errors)]) console.error('  -', e)
  process.exit(1)
}
console.log('✓ i18n 키 검증 통과')
