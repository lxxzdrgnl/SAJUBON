#!/usr/bin/env node
/**
 * 색 토큰 검증 — 컴포넌트(.tsx)의 Tailwind arbitrary 색(`text-[#...]`·`bg-[#...]`·
 * `border-[#...]` 등)이 design.md §2 토큰 또는 명시적으로 정당한 raw 값인지 확인한다.
 *
 * 배경: 병렬 작업으로 목업의 raw hex가 곳곳에 하드코딩됐다. design.md §2가 색 단일
 * 진실원천이므로, 토큰 클래스(bg-orange 등)를 쓰거나 §2에 정의된 hex만 허용한다.
 *
 * 동작:
 *   - 기본: 미허용 hex를 경고로 출력하고 정상 종료(0). 빌드/CI를 깨지 않는다(advisory).
 *   - `--strict`: 미허용 hex가 하나라도 있으면 비정상 종료(1). CI 게이트용.
 *
 * 사용: node apps/web/scripts/check-colors.mjs [--strict]
 *       (CWD = apps/web 또는 repo root)
 *
 * 정당한 raw 사용처(검사 제외):
 *   - lib/ · 스토리(fortune/) · 캔버스/SVG 렌더는 동적 색 계산이 많아 디렉토리 예외
 *   - 오행 5색·기둥 틴트·칩 텍스트색·스토리색·너구리 일간색 등 design.md 명시 hex는 허용목록
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const strict = process.argv.includes('--strict')

/** design.md §2 + globals.css 토큰 + 명시적으로 정당한 raw hex (모두 대문자, # 포함) */
const ALLOWED = new Set(
  [
    // §2.1 기본 팔레트
    '#FFFBF2', '#1A1A1A', '#FFD900', '#FFF3B0', '#FFB200', '#FF6B00', '#FFE1CC',
    '#00C2B8', '#00857D', '#D7F7F4', '#FFFFFF', '#EBE3D2', '#8A8270', '#4DA8E8', '#DCEFFB',
    // §2.2 오행 5색
    '#00A86B', '#FF6B00', '#D9A400', '#7D7A70', '#0090A8',
    // §2.2 기둥 카드 배경 틴트
    '#E9FAF1', '#FFF1E8', '#FBF3D9', '#F4F2EC', '#E8F7FA',
    // §2.3 차트 점수 / §2.4 스토리
    '#FF8A2E', '#04332F',
    // §4.1 칩 텍스트색
    '#00665F', '#B34800',
    // §5.4 현실 조언 박스
    '#FFF4E3',
    // §8 일간 오행색(너구리/히어로) — ganjiNickname·MascotTinted
    '#8FD6A8', '#FF9466', '#D7D9DD', '#B9C4CC',
    // §4.3 비활성 탭/바 회색
    '#A09880',
    // 기존 자산 — design.md 미명시이나 토(土) 머스터드 계열 의미색. 신규 추가는 토큰 사용할 것.
    // (IlJinCalendar 절기 마커 #B07A00 · WuxingBalanceCard 보통-톤 칩 텍스트 #6B5500)
    '#B07A00', '#6B5500',
  ].map((h) => h.toUpperCase()),
)

/** 디렉토리 단위 예외 — 동적 색 계산·캔버스 렌더가 많아 검사 제외 (webRoot 상대 경로 prefix) */
const EXEMPT_DIRS = ['lib/', 'components/fortune/']

/** Tailwind arbitrary 색 유틸 — text/bg/border/from/to/via/ring/fill/stroke + [#hex] */
const HEX_CLASS = /\b(?:text|bg|border|from|to|via|ring|fill|stroke|decoration|divide|outline|accent|caret|shadow)-\[#([0-9A-Fa-f]{3,8})\]/g

function walk(dir) {
  const files = []
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e.startsWith('.next-')) continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) files.push(...walk(p))
    else if (/\.tsx$/.test(e)) files.push(p)
  }
  return files
}

const warnings = []

for (const file of [...walk(join(webRoot, 'app')), ...walk(join(webRoot, 'components'))]) {
  const rel = file.replace(webRoot + '/', '')
  if (EXEMPT_DIRS.some((d) => rel.startsWith(d))) continue
  const src = readFileSync(file, 'utf8')
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(HEX_CLASS)) {
      const hex = `#${m[1].toUpperCase()}`
      if (ALLOWED.has(hex)) continue
      warnings.push(`${rel}:${i + 1}: ${m[0]} — design.md §2 토큰 외 임의 hex`)
    }
  }
}

if (warnings.length) {
  const head = strict ? '✗' : '⚠'
  console.error(`\n${head} 토큰 외 하드코딩 색 ${warnings.length}건 (design.md §2 토큰 또는 클래스 사용 권장):`)
  for (const w of [...new Set(warnings)]) console.error('  -', w)
  if (strict) process.exit(1)
  console.error('  (advisory — --strict로 게이트 가능)')
} else {
  console.log('✓ 색 토큰 검증 통과')
}
